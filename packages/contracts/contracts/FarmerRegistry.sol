// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title FarmerRegistry
 * @notice On-chain identity primitive for AsiliChain. Stores farmer records keyed
 *         by wallet address with a MAAIF government ID reverse lookup.
 * @dev    UUPS upgradeable. AccessControl with AGENT_ROLE, COOP_ROLE, DEFAULT_ADMIN_ROLE.
 *
 *         Independent farmers (those without a cooperative) are supported via the
 *         INDEPENDENT_AGGREGATOR address — a protocol-managed multisig set post-deploy.
 *         Their cooperativeWallet is set to INDEPENDENT_AGGREGATOR at registration.
 *         They access the full protocol identically to cooperative-member farmers.
 *
 *         Seven invariants reference (CLAUDE.md):
 *         #6 _authorizeUpgrade requires DEFAULT_ADMIN_ROLE — enforced here.
 *         Others (1-5,7) do not apply to this contract directly (no loans, stages,
 *         vault, or fees) but are enforced in the contracts that do.
 */
contract FarmerRegistry is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    // ─── Roles ──────────────────────
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant COOP_ROLE = keccak256("COOP_ROLE");

    // ─── Structs ────────────────────
    struct Farmer {
        // ─── Original fields ───
        string  maaifFarmerId;          // MAAIF government ID
        address cooperativeWallet;      // cooperative that receives settlement share
        bytes32 farmBoundaryIpfsCid;    // IPFS CID of GeoJSON polygon (EUDR DDS)
        uint256 farmAreaHectares;       // land area × 100 (e.g., 250 = 2.50 ha)
        bool    gfwDeforestationFree;   // Global Forest Watch verification result (GFW)
        bool    active;                 // false = deactivated
        uint256 registrationTimestamp;  // block.timestamp at registration
        // ─── Sprint 1 fields (append only — storage safe) ───
        string  nationalId;             // Uganda NIN — primary on-chain identity
        string  farmerName;             // Human-readable name (Fonbnk recipientName)
        string  phoneNumber;            // MTN phone (+2567XXXXXXXX) — Fonbnk recipientPhone
    }

    // ─── Storage ────────────────────
    /// @notice wallet address → Farmer record
    mapping(address => Farmer) public farmers;

    /// @notice MAAIF government ID → wallet address (reverse lookup)
    mapping(string => address) public maaifToWallet;

    /// @notice Uganda NIN → wallet address (uniqueness guard)
    /// @dev Separate from maaifToWallet because NIN and MAAIF ID may collide as strings.
    mapping(string => address) public ninToWallet;

    /// @notice Approximate count of farmers registered under each cooperative wallet.
    /// @dev Used by the API layer for agent cap enforcement: max(3, ceil(count/50)).
    ///      Incremented on registration, NOT decremented on deactivation (Sprint 1).
    mapping(address => uint256) public cooperativeFarmerCount;

    /// @notice Protocol-managed multisig for independent farmers.
    ///         Set post-deploy via setIndependentAggregator().
    address public INDEPENDENT_AGGREGATOR;

    /// @notice Sprint 3: Global farmer count for agent cap computation.
    uint256 public totalFarmers;

    /// @notice Sprint 3: Current number of AGENT_ROLE holders.
    uint256 public agentCount;

    // ─── Events ─────────────────────
    event FarmerRegistered(
        address indexed farmerWallet,
        string maaifId,
        address indexed cooperativeWallet,
        string indexed nationalId
    );
    event FarmerVerified(address indexed farmerWallet, bool gfwDeforestationFree);
    event FarmerDeactivated(address indexed farmerWallet);
    event IndependentAggregatorSet(address indexed aggregator);
    event FarmerMigrated(
        address indexed farmerWallet,
        address indexed fromCooperative,
        address indexed toCooperative
    );

    // ─── Constructor / Initializer ──────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the FarmerRegistry contract.
     * @param defaultAdmin Address that receives DEFAULT_ADMIN_ROLE (3-of-5 multisig).
     *
     * INDEPENDENT_AGGREGATOR starts as address(0) and must be set post-deploy
     * via setIndependentAggregator() before any independent farmer can be registered.
     */
    function initialize(address defaultAdmin) external initializer {
        require(defaultAdmin != address(0), "FarmerRegistry: zero admin");
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);

        // Sprint 1: Cooperatives self-manage their agents. No protocol admin bottleneck.
        _setRoleAdmin(AGENT_ROLE, COOP_ROLE);
    }

    // ─── Registration ───────────────────────

    /**
     * @notice Register a new farmer. Only AGENT_ROLE.
     * @param farmerWallet    The farmer's wallet address (primary key).
     * @param maaifFarmerId   MAAIF government ID. Must be unique.
     * @param cooperativeWallet Cooperative wallet. Pass INDEPENDENT_AGGREGATOR
     *                          for independent farmers. Must be non-zero.
     * @param farmBoundaryIpfsCid IPFS CID of the farm's GeoJSON boundary (bytes32).
     * @param farmAreaHectares    Farm area × 100 (e.g., 250 = 2.50 hectares).
     * @param gfwDeforestationFree GlobalFarmingWatch verification result.
     * @param nationalId          Uganda NIN (National ID). Must be unique.
     * @param farmerName          Human-readable farmer name (for Fonbnk payouts).
     * @param phoneNumber         MTN phone number (+2567XXXXXXXX).
     */
    function registerFarmer(
        address farmerWallet,
        string calldata maaifFarmerId,
        address cooperativeWallet,
        bytes32 farmBoundaryIpfsCid,
        uint256 farmAreaHectares,
        bool gfwDeforestationFree,
        string calldata nationalId,
        string calldata farmerName,
        string calldata phoneNumber
    )
        external
        onlyRole(AGENT_ROLE)
    {
        require(farmerWallet != address(0), "FarmerRegistry: zero farmer wallet");
        require(bytes(maaifFarmerId).length > 0, "FarmerRegistry: empty MAAIF ID");
        require(cooperativeWallet != address(0), "FarmerRegistry: invalid coop wallet");
        require(farmBoundaryIpfsCid != bytes32(0), "FarmerRegistry: empty IPFS CID");
        require(farmAreaHectares > 0, "FarmerRegistry: zero farm area");
        require(bytes(nationalId).length > 0, "FarmerRegistry: empty NIN");
        require(bytes(farmerName).length > 0, "FarmerRegistry: empty farmer name");
        require(farmers[farmerWallet].registrationTimestamp == 0, "FarmerRegistry: already registered");
        require(
            maaifToWallet[maaifFarmerId] == address(0),
            "FarmerRegistry: MAAIF ID already registered"
        );
        require(
            ninToWallet[nationalId] == address(0),
            "FarmerRegistry: NIN already registered"
        );

        // Individual field assignment avoids "stack too deep" from 10-field struct literal
        Farmer storage f = farmers[farmerWallet];
        f.maaifFarmerId          = maaifFarmerId;
        f.cooperativeWallet      = cooperativeWallet;
        f.farmBoundaryIpfsCid    = farmBoundaryIpfsCid;
        f.farmAreaHectares       = farmAreaHectares;
        f.gfwDeforestationFree   = gfwDeforestationFree;
        f.active                 = true;
        f.registrationTimestamp  = block.timestamp;
        f.nationalId             = nationalId;
        f.farmerName             = farmerName;
        f.phoneNumber            = phoneNumber;

        maaifToWallet[maaifFarmerId] = farmerWallet;
        ninToWallet[nationalId] = farmerWallet;
        cooperativeFarmerCount[cooperativeWallet]++;
        totalFarmers++;

        emit FarmerRegistered(farmerWallet, maaifFarmerId, cooperativeWallet, nationalId);
    }

    // ─── Queries ────────────────────

    /**
     * @notice Check if a farmer wallet is actively registered.
     */
    function isRegistered(address farmerWallet) external view returns (bool) {
        return farmers[farmerWallet].active;
    }

    /**
     * @notice Returns true if farmer was ever registered (active or deactivated).
     * @dev Used by dependent contracts (e.g. BatchToken) that need to allow
     * operations on deactivated farmers. Does not revert.
     */
    function farmerExists(address farmerWallet) external view returns (bool) {
        return farmers[farmerWallet].registrationTimestamp != 0;
    }

    /**
     * @notice Get the full Farmer record for a wallet.
     * @dev Reverts if the farmer was never registered. Deactivated farmers
     *      remain readable for BatchToken, TraceLog, and LendingVault queries.
     */
    function getFarmer(address farmerWallet) external view returns (Farmer memory) {
        require(
            farmers[farmerWallet].registrationTimestamp != 0,
            "FarmerRegistry: not registered"
        );
        return farmers[farmerWallet];
    }

    /**
     * @notice Returns the number of farmers registered under a cooperative wallet.
     * @dev Used by the API to enforce the agent cap: max(3, ceil(count / 50)).
     *      Returns 0 for unknown wallets. Not decremented on deactivation.
     */
    function getFarmerCount(address cooperativeWallet) external view returns (uint256) {
        return cooperativeFarmerCount[cooperativeWallet];
    }

    /**
     * @notice Returns true if the farmer is registered via INDEPENDENT_AGGREGATOR.
     *         Returns false if INDEPENDENT_AGGREGATOR has not been set yet.
     */
    function isIndependent(address farmerWallet) public view returns (bool) {
        return INDEPENDENT_AGGREGATOR != address(0)
            && farmers[farmerWallet].cooperativeWallet == INDEPENDENT_AGGREGATOR;
    }

    // ─── Updates ────────────────────

    /**
     * @notice Update the GFW deforestation-free status for a farmer.
     *         Only AGENT_ROLE. Used when GFW data is re-verified.
     */
    function verifyFarmer(address farmerWallet, bool gfwDeforestationFree)
        external
        onlyRole(AGENT_ROLE)
    {
        require(farmers[farmerWallet].active, "FarmerRegistry: not registered");
        farmers[farmerWallet].gfwDeforestationFree = gfwDeforestationFree;
        emit FarmerVerified(farmerWallet, gfwDeforestationFree);
    }

    /**
     * @notice Deactivate a farmer. AGENT_ROLE or COOP_ROLE.
     *         Soft-delete — MAAIF ID reservation is preserved.
     * @dev Phase 1: any COOP_ROLE holder can deactivate any farmer.
     *      Cooperative-scoped deactivation (own members only) requires a
     *      cooperative membership mapping and is deferred to a future upgrade.
     */
    function deactivateFarmer(address farmerWallet)
        external
    {
        require(farmers[farmerWallet].active, "FarmerRegistry: not registered");
        require(
            hasRole(AGENT_ROLE, _msgSender()) || hasRole(COOP_ROLE, _msgSender()),
            "FarmerRegistry: access denied"
        );
        farmers[farmerWallet].active = false;
        emit FarmerDeactivated(farmerWallet);
    }

    // ─── INDEPENDENT_AGGREGATOR management ──────────────────

    /**
     * @notice Set or update the INDEPENDENT_AGGREGATOR address.
     *         Only DEFAULT_ADMIN_ROLE. Aggregator must be non-zero.
     * @param aggregator The multisig address for independent farmer routing.
     */
    function setIndependentAggregator(address aggregator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(aggregator != address(0), "FarmerRegistry: zero aggregator");
        INDEPENDENT_AGGREGATOR = aggregator;
        emit IndependentAggregatorSet(aggregator);
    }

    /**
     * @notice Migrate an independent farmer to a named cooperative.
     *         Only DEFAULT_ADMIN_ROLE. Farmer must currently be independent.
     * @param farmerWallet          The registered farmer wallet.
     * @param newCooperativeWallet  The cooperative to assign. Non-zero, not INDEPENDENT_AGGREGATOR.
     */
    function migrateFarmer(
        address farmerWallet,
        address newCooperativeWallet
    )
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(farmers[farmerWallet].active, "FarmerRegistry: not registered");
        require(isIndependent(farmerWallet), "FarmerRegistry: not independent");
        require(newCooperativeWallet != address(0), "FarmerRegistry: zero coop");
        require(
            newCooperativeWallet != INDEPENDENT_AGGREGATOR,
            "FarmerRegistry: already independent"
        );

        address oldCooperative = farmers[farmerWallet].cooperativeWallet;
        farmers[farmerWallet].cooperativeWallet = newCooperativeWallet;

        emit FarmerMigrated(farmerWallet, oldCooperative, newCooperativeWallet);
    }

    // ─── Agent Cap Enforcement (Sprint 3) ───

    /**
     * @notice Computes the maximum number of agents allowed based on total farmer count.
     * @dev Formula: max(3, ceil(totalFarmers / 50)). Allows small cooperatives
     *      a minimum of 3 agents while scaling with growth.
     */
    function _computeMaxAgents() internal view returns (uint256) {
        uint256 minAgents = 3;
        // ceil division: (a + b - 1) / b
        uint256 computed = (totalFarmers + 49) / 50;
        return computed > minAgents ? computed : minAgents;
    }

    /**
     * @notice Override to enforce agent cap on role grant.
     * @dev Automatically tracks agent count. Reverts if cap would be exceeded.
     */
    function _grantRole(bytes32 role, address account) internal override returns (bool) {
        if (role == AGENT_ROLE) {
            require(agentCount < _computeMaxAgents(), "FarmerRegistry: agent cap reached");
            agentCount++;
        }
        return super._grantRole(role, account);
    }

    /**
     * @notice Override to decrement agent count on role revocation.
     */
    function _revokeRole(bytes32 role, address account) internal override returns (bool) {
        if (role == AGENT_ROLE) {
            agentCount--;
        }
        return super._revokeRole(role, account);
    }

    // ─── UUPS Upgrade ───────────────────────
    /// @dev Only DEFAULT_ADMIN_ROLE can upgrade — enforces invariant #6.
    function _authorizeUpgrade(address)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    { }
}
