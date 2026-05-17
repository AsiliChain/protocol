// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {IFarmerRegistry} from "./interfaces/IFarmerRegistry.sol";

/**
 * @title BatchToken
 * @author AsiliChain
 * @notice ERC-1155 token representing a weighed, graded coffee batch.
 * @dev The primary collateral unit for LendingVault. Enforces transfer restrictions
 * when a token is locked as collateral.
 */
contract BatchToken is Initializable, ERC1155Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {

    // =============================================================
    //                           Roles
    // =============================================================

    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    // =============================================================
    //                           Structs
    // =============================================================

    struct BatchData {
        string  batchId;             // e.g. "BATCH-2026-004821"
        address farmerWallet;        // Primary key mapped to FarmerRegistry
        address cooperativeWallet;   // Aggregating cooperative (or INDEPENDENT_AGGREGATOR)
        uint256 weightKg;            // Scaled ×10 (e.g. 675 = 67.5 kg)
        string  grade;               // "screen18", "screen15", "FAQ"
        uint256 moisturePct;         // Scaled ×10 (e.g. 112 = 11.2%)
        bytes32 collectionPointHash; // GPS hash of collection point
        bytes32 weightSlipIpfsCid;   // IPFS CID of weight slip photo
        uint256 mintTimestamp;
        bool    loanActive;          // Prevents double-collateralisation
    }

    // =============================================================
    //                           State
    // =============================================================

    /// @notice Maps a token ID to its physical batch data.
    mapping(uint256 => BatchData) public batchData;

    /// @notice Auto-incrementing token ID counter.
    uint256 public nextTokenId;

    /// @notice The address of the FarmerRegistry contract.
    IFarmerRegistry public farmerRegistry;

    // =============================================================
    //                           Events
    // =============================================================

    event BatchMinted(
        uint256 indexed tokenId,
        string batchId,
        address indexed farmerWallet,
        address indexed cooperativeWallet,
        uint256 weightKg,
        string grade,
        uint256 timestamp
    );

    event CollateralLocked(uint256 indexed tokenId, address indexed vault);
    event CollateralUnlocked(uint256 indexed tokenId);
    event BatchSettled(uint256 indexed tokenId, uint256 timestamp);

    // =============================================================
    //                  Initialization & Upgrade
    // =============================================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract.
     * @param defaultAdmin The address to grant DEFAULT_ADMIN_ROLE to.
     * @param farmerRegistryAddress The address of the deployed FarmerRegistry contract.
     * @param uri_ The metadata URI for ERC1155.
     */
    function initialize(address defaultAdmin, address farmerRegistryAddress, string memory uri_) public initializer {
        __ERC1155_init(uri_);
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        
        farmerRegistry = IFarmerRegistry(farmerRegistryAddress);
        nextTokenId = 1; // Start IDs at 1
    }

    /**
     * @dev Authorizes an upgrade to a new implementation contract.
     * @param newImplementation The address of the new implementation contract.
     * @custom:oz-upgrades-unsafe-allow-reachable
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // =============================================================
    //                      External Functions
    // =============================================================

    /**
     * @notice Mints a new BatchToken for a registered farmer.
     * @dev Requires AGENT_ROLE. Mints exactly 1 unit of the new tokenId to the cooperativeWallet.
     */
    function mintBatch(
        string calldata batchId,
        address cooperativeWallet,
        address farmerWallet,
        uint256 weightKg,
        string calldata grade,
        uint256 moisturePct,
        bytes32 collectionPointHash,
        bytes32 weightSlipIpfsCid
    ) external onlyRole(AGENT_ROLE) returns (uint256 tokenId) {
        require(
            farmerRegistry.farmerExists(farmerWallet),
            "BatchToken: farmer not registered"
        );
        require(weightKg > 0, "BatchToken: Weight must be > 0");

        tokenId = nextTokenId++;

        batchData[tokenId] = BatchData({
            batchId: batchId,
            farmerWallet: farmerWallet,
            cooperativeWallet: cooperativeWallet,
            weightKg: weightKg,
            grade: grade,
            moisturePct: moisturePct,
            collectionPointHash: collectionPointHash,
            weightSlipIpfsCid: weightSlipIpfsCid,
            mintTimestamp: block.timestamp,
            loanActive: false
        });

        // Mint token to the cooperative wallet (aggregator custody)
        _mint(cooperativeWallet, tokenId, 1, "");

        emit BatchMinted(
            tokenId,
            batchId,
            farmerWallet,
            cooperativeWallet,
            weightKg,
            grade,
            block.timestamp
        );
    }

    /**
     * @notice Gets the physical metadata for a specific batch.
     * @param tokenId The ID of the batch token.
     * @return The BatchData struct.
     */
    function getBatchData(uint256 tokenId) external view returns (BatchData memory) {
        require(batchData[tokenId].mintTimestamp != 0, "BatchToken: Token does not exist");
        return batchData[tokenId];
    }

    /**
     * @notice Checks if the batch token is currently locked as collateral.
     * @param tokenId The ID of the batch token.
     * @return True if locked, false otherwise.
     */
    function hasActiveLoan(uint256 tokenId) external view returns (bool) {
        return batchData[tokenId].loanActive;
    }

    /**
     * @notice Locks the batch token as collateral, preventing transfers.
     * @dev Requires VAULT_ROLE. Called by LendingVault on loan origination.
     * @param tokenId The ID of the batch token.
     */
    function lockAsCollateral(uint256 tokenId) external onlyRole(VAULT_ROLE) {
        require(batchData[tokenId].mintTimestamp != 0, "BatchToken: Token does not exist");
        require(!batchData[tokenId].loanActive, "BatchToken: Already locked");
        
        batchData[tokenId].loanActive = true;
        emit CollateralLocked(tokenId, msg.sender);
    }

    /**
     * @notice Unlocks the batch token collateral.
     * @dev Requires VAULT_ROLE. Called by LendingVault on repayment or liquidation.
     * @param tokenId The ID of the batch token.
     */
    function unlockCollateral(uint256 tokenId) external onlyRole(VAULT_ROLE) {
        require(batchData[tokenId].mintTimestamp != 0, "BatchToken: Token does not exist");
        require(batchData[tokenId].loanActive, "BatchToken: Not locked");
        
        batchData[tokenId].loanActive = false;
        emit CollateralUnlocked(tokenId);
    }

    /**
     * @notice Burns the token and deletes its data upon successful export and settlement.
     * @dev Requires VAULT_ROLE. Can be burned even if locked (bypasses transfer restrictions).
     * @param tokenId The ID of the batch token.
     */
    function burnSettled(uint256 tokenId) external onlyRole(VAULT_ROLE) {
        require(batchData[tokenId].mintTimestamp != 0, "BatchToken: Token does not exist");

        // We assume the token is still held by the original cooperative for this protocol version.
        address currentHolder = batchData[tokenId].cooperativeWallet;

        // Burn the token. _update override allows to == address(0) even if locked.
        _burn(currentHolder, tokenId, 1);

        // Clean up storage
        delete batchData[tokenId];

        emit BatchSettled(tokenId, block.timestamp);
    }

    // =============================================================
    //                       Internal Overrides
    // =============================================================

    /**
     * @notice Enforces Invariant #7: Prevents transfers of tokens locked as collateral.
     * @dev Overrides OZ ERC1155 _update. Allows minting (from == 0) and burning (to == 0).
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        for (uint256 i = 0; i < ids.length; i++) {
            // Only check constraints for wallet-to-wallet transfers
            if (from != address(0) && to != address(0)) {
                require(!batchData[ids[i]].loanActive, "BatchToken: token locked as collateral");
            }
        }
        super._update(from, to, ids, values);
    }

    // Boilerplate for interface resolution
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
