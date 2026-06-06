// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IBatchToken} from "./interfaces/IBatchToken.sol";
import {IFarmerRegistry} from "./interfaces/IFarmerRegistry.sol";

/**
 * @title TraceLog
 * @author AsiliChain
 * @notice UUPS-upgradeable on-chain stage machine for coffee batch custody.
 * @dev Records eight-stage journey from DELIVERED to SETTLED. Stages increase
 * strictly by +1. No skip. No reverse. Stage updates are role-gated per stage.
 * Emits StageUpdated events which the API layer watches to trigger downstream
 * actions (e.g. auto-repayment on EXPORTED).
 */
contract TraceLog is Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    // =====================================
    //                              Enums
    // =====================================

    enum Stage {
        DELIVERED,    // 0 — BatchToken minted, coffee weighed at collection
        GRADED,       // 1 — Quality assessment passed
        MILLED,       // 2 — Processing complete
        WAREHOUSED,   // 3 — Physical storage confirmed
        COMMITTED,    // 4 — PurchaseOrder confirmed by buyer
        EXPORTED,     // 5 — Export licence confirmed — API triggers auto-repayment
        SETTLED       // 6 — Buyer USDC paid, loan repaid, net disbursed
    }

    // =====================================
    //                              Roles
    // =====================================

    bytes32 public constant AGENT_ROLE             = keccak256("AGENT_ROLE");
    bytes32 public constant COOP_ROLE              = keccak256("COOP_ROLE");
    bytes32 public constant PURCHASE_ORDER_ROLE    = keccak256("PURCHASE_ORDER_ROLE");
    bytes32 public constant VAULT_ROLE             = keccak256("VAULT_ROLE");

    // =====================================
    //                            Storage
    // =====================================

    /// @notice Maps a BatchToken ID to its current custody stage.
    mapping(uint256 => Stage) public stages;

    /// @notice The BatchToken contract (set at init, immutable after).
    /// @dev BatchToken is only read to verify token existence before stage updates.
    address public batchToken;

    /// @notice The FarmerRegistry contract (set at V2 upgrade).
    /// @dev Read to check isIndependent() for role gating of independent farmers.
    IFarmerRegistry public farmerRegistry;

    // =====================================
    //                            Events
    // =====================================

    event StageUpdated(
        uint256 indexed tokenId,
        Stage    oldStage,
        Stage    newStage,
        address  indexed caller,
        uint256  timestamp
    );

    // =====================================
    //                     Initialization & Upgrade
    // =====================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the TraceLog contract.
     * @param defaultAdmin       Address to receive DEFAULT_ADMIN_ROLE.
     * @param batchTokenAddress  Address of the deployed BatchToken contract.
     */
    function initialize(address defaultAdmin, address batchTokenAddress) public initializer {
        require(batchTokenAddress != address(0), "TraceLog: zero batchToken address");
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        batchToken = batchTokenAddress;
    }

    /**
     * @notice V2 reinitializer: sets the FarmerRegistry address for independent farmer role gating.
     * @param farmerRegistryAddress Address of the deployed FarmerRegistry contract.
     */
    function initializeV2(address farmerRegistryAddress) external reinitializer(2) {
        require(farmerRegistryAddress != address(0), "TraceLog: zero farmerRegistry address");
        farmerRegistry = IFarmerRegistry(farmerRegistryAddress);
    }

    /**
     * @dev Authorizes an upgrade. Restricted to DEFAULT_ADMIN_ROLE per Invariant #6.
     * @param newImplementation Address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // =====================================
    //                      Public Functions
    // =====================================

    /**
     * @notice Advances a batch token to the next custody stage.
     * @dev Enforces Invariant #2: stages increase strictly by +1.
     *      The first call for a token MUST be DELIVERED (auto-initialises).
     *      Validates token existence via BatchToken.
     * @param tokenId  The BatchToken ID to advance.
     * @param newStage The target stage (must be exactly current + 1).
     */
    function updateStage(uint256 tokenId, Stage newStage) external {
        // Verify token exists (same pattern as farmerExists)
        _batchToken().checkExists(tokenId);

        Stage current = stages[tokenId];

        // --- Auto-initialisation path ---
        // Uninitialised (Stage(0) which is DELIVERED in the enum) is treated as
        // "pre-DELIVERED" — a sentinel distinct from the enum value DELIVERED=0.
        // We use a separate bool to track whether the token was ever initialised.
        if (current == Stage(0) && !_isInitialized(tokenId)) {
            require(newStage == Stage.DELIVERED, "TraceLog: first stage must be DELIVERED");
            _checkStageRole(tokenId, newStage);
            _initialized[tokenId] = true;
            stages[tokenId] = Stage.DELIVERED;
            emit StageUpdated(tokenId, Stage(0), Stage.DELIVERED, msg.sender, block.timestamp);
            return;
        }

        // --- Normal path ---
        require(
            uint8(newStage) == uint8(current) + 1,
            "TraceLog: stages must increase by exactly 1"
        );
        _checkStageRole(tokenId, newStage);

        stages[tokenId] = newStage;
        emit StageUpdated(tokenId, current, newStage, msg.sender, block.timestamp);
    }

    /**
     * @notice Returns the current custody stage of a batch token.
     * @param tokenId The BatchToken ID.
     * @return Stage The current stage (0 = uninitialised/pre-DELIVERED).
     */
    function getCurrentStage(uint256 tokenId) external view returns (Stage) {
        return stages[tokenId];
    }

    // =====================================
    //                       Role Helpers
    // =====================================

    /// @notice Tracks whether a token's stage has been initialised.
    /// @dev Required because Stage(0) === DELIVERED creates a zero-value ambiguity.
    mapping(uint256 => bool) private _initialized;

    /**
     * @dev Checks whether a token's stage has been initialised.
     */
    function _isInitialized(uint256 tokenId) private view returns (bool) {
        return _initialized[tokenId];
    }

    /**
     * @dev Maps the target stage to the required role.
     *      For GRADED / MILLED / WAREHOUSED / EXPORTED:
     *        - Cooperative farmers: requires COOP_ROLE (cooperative manager).
     *        - Independent farmers: allows AGENT_ROLE (field agent can self-manage).
     * @param tokenId The BatchToken ID (used to check if farmer is independent).
     * @param stage   The target stage to check access for.
     */
    function _checkStageRole(uint256 tokenId, Stage stage) private view {
        bytes32 role;
        if (stage == Stage.DELIVERED) {
            role = AGENT_ROLE;
        } else if (stage == Stage.GRADED || stage == Stage.MILLED || stage == Stage.WAREHOUSED || stage == Stage.EXPORTED) {
            // Check if the batch belongs to an independent farmer
            address farmerWallet = _batchToken().getFarmerWallet(tokenId);
            if (address(farmerRegistry) != address(0) && farmerRegistry.isIndependent(farmerWallet)) {
                // Independent farmers: AGENT_ROLE can advance stages
                role = AGENT_ROLE;
            } else {
                // Cooperative farmers: requires COOP_ROLE
                role = COOP_ROLE;
            }
        } else if (stage == Stage.COMMITTED) {
            role = PURCHASE_ORDER_ROLE;
        } else if (stage == Stage.SETTLED) {
            role = VAULT_ROLE;
        } else {
            revert("TraceLog: invalid stage");
        }
        _checkRole(role, msg.sender);
    }

    /**
     * @dev Thin wrapper to cast the stored BatchToken address to the interface
     *      for token existence validation.
     */
    function _batchToken() private view returns (IBatchToken) {
        return IBatchToken(batchToken);
    }

    // =====================================
    //                       Boilerplate
    // =====================================

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

// =====================================
