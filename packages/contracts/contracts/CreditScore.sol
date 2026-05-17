// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IFarmerRegistry} from "./interfaces/IFarmerRegistry.sol";

/**
 * @title CreditScore
 * @author AsiliChain
 * @notice UUPS-upgradeable contract for on-chain credit scoring.
 * @dev Tracks farmer repayment history and other metrics to generate a portable,
 * public credit score. The primary key is the farmer's wallet address.
 * Scores are lazily initialized on the first state-changing action for a farmer.
 */
contract CreditScore is Initializable, UUPSUpgradeable, AccessControlUpgradeable {

    // =============================================================
    //                           Roles
    // =============================================================

    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    // =============================================================
    //                         Constants
    // =============================================================

    uint256 internal constant STARTING_SCORE  = 500;
    uint256 internal constant SCORE_CEILING   = 850;
    uint256 internal constant SCORE_FLOOR     = 0;
    uint256 internal constant REPAYMENT_BONUS = 40;  // loan repaid - financial obligation met
    uint256 internal constant DELIVERY_BONUS  = 15;  // coffee delivered - no loan required
    uint256 internal constant DEFAULT_PENALTY = 100; // asymmetric by design

    // =============================================================
    //                           State
    // =============================================================

    /// @notice Maps a farmer's wallet address to their current credit score.
    mapping(address => uint256) public scores;

    /// @notice Maps a farmer's wallet address to the timestamp of their last score update.
    mapping(address => uint256) public lastUpdated;

    /// @notice The address of the FarmerRegistry contract.
    IFarmerRegistry public farmerRegistry;

    // =============================================================
    //                           Events
    // =============================================================

    event ScoreInitialised(address indexed farmerWallet, uint256 startingScore);
    event ScoreUpdated(address indexed farmerWallet, uint256 oldScore, uint256 newScore, string reason);

    // =============================================================
    //                      Modifiers
    // =============================================================

    /**
     * @dev Ensures that the target farmer is registered in the FarmerRegistry.
     * Checks for a non-zero registrationTimestamp, which works for both
     * active and deactivated farmers.
     */
    modifier farmerExists(address farmerWallet) {
        require(farmerRegistry.farmerExists(farmerWallet), "CreditScore: farmer not registered");
        _;
    }

    // =============================================================
    //                  Initialization & Upgrade
    // =============================================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract, setting the default admin and FarmerRegistry address.
     * @param defaultAdmin The address to grant DEFAULT_ADMIN_ROLE to.
     * @param farmerRegistryAddress The address of the deployed FarmerRegistry contract.
     */
    function initialize(address defaultAdmin, address farmerRegistryAddress) public initializer {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        farmerRegistry = IFarmerRegistry(farmerRegistryAddress);
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
     * @notice Gets the current score for a farmer.
     * @dev If the farmer has no score yet, returns the default starting score without writing to storage.
     * @param farmerWallet The farmer's wallet address.
     * @return The farmer's current score or the starting score if uninitialized.
     */
    function getScore(address farmerWallet) public view returns (uint256) {
        return initialized[farmerWallet] ? scores[farmerWallet] : STARTING_SCORE;
    }

    /**
     * @notice Records a successful loan repayment for a farmer, increasing their score.
     * @dev Requires VAULT_ROLE.
     * @param farmerWallet The farmer's wallet address.
     */
    function recordRepayment(address farmerWallet) external onlyRole(VAULT_ROLE) farmerExists(farmerWallet) {
        _applyScoreChange(farmerWallet, int256(REPAYMENT_BONUS), "On-time repayment");
    }

    /**
     * @notice Records a successful coffee delivery, increasing the farmer's score.
     * @dev Requires AGENT_ROLE.
     * @param farmerWallet The farmer's wallet address.
     */
    function recordDelivery(address farmerWallet) external onlyRole(AGENT_ROLE) farmerExists(farmerWallet) {
        _applyScoreChange(farmerWallet, int256(DELIVERY_BONUS), "On-time delivery");
    }

    /**
     * @notice Records a loan default for a farmer, decreasing their score.
     * @dev Requires VAULT_ROLE.
     * @param farmerWallet The farmer's wallet address.
     */
    function recordDefault(address farmerWallet) external onlyRole(VAULT_ROLE) farmerExists(farmerWallet) {
        _applyScoreChange(farmerWallet, -int256(DEFAULT_PENALTY), "Loan default");
    }

    /**
     * @notice Applies an administrative penalty to a farmer's score.
     * @dev Requires DEFAULT_ADMIN_ROLE. Used for events like cooperative-level penalties.
     * @param farmerWallet The farmer's wallet address.
     * @param penalty The amount to decrease the score by. Must be positive.
     */
    function recordPenalty(address farmerWallet, uint256 penalty) external onlyRole(DEFAULT_ADMIN_ROLE) farmerExists(farmerWallet) {
        if (penalty == 0) {
            revert("CreditScore: Penalty must be greater than zero");
        }
        _applyScoreChange(farmerWallet, -int256(penalty), "Administrative penalty");
    }

    /**
     * @notice Gets the loan-to-value (LTV) tier for a farmer based on their score.
     * @param farmerWallet The farmer's wallet address.
     * @return maxLoanUsdc The maximum loan amount in USDC (with 6 decimals).
     * @return ltvBasisPoints The loan-to-value ratio in basis points (e.g., 5000 = 50%).
     */
    function getLtvTier(address farmerWallet) external view returns (uint256 maxLoanUsdc, uint256 ltvBasisPoints) {
        uint256 score = getScore(farmerWallet);

        if (score >= 750) {
            // Institutional Tier
            return (5000 * 1e6, 7500); // $5,000, 75% LTV
        } else if (score >= 650) {
            // Premium Tier
            return (1500 * 1e6, 6500); // $1,500, 65% LTV
        } else if (score >= 550) {
            // Enhanced Tier
            return (500 * 1e6, 5500); // $500, 55% LTV
        } else {
            // Standard Tier (500-549)
            return (200 * 1e6, 5000); // $200, 50% LTV
        }
    }


    // =============================================================
    //                       Internal Functions
    // =============================================================

    /// @notice Whether the farmer's score has been initialized.
    mapping(address => bool) public initialized;

    /**
     * @notice Internal function to apply a score change.
     * @dev Handles lazy initialization and score clamping. Emits events.
     * @param farmerWallet The farmer's wallet address.
     * @param delta The signed integer representing the score change (can be negative).
     * @param reason A string describing the reason for the score change.
     */
    function _applyScoreChange(address farmerWallet, int256 delta, string memory reason) internal {
        uint256 oldScore = scores[farmerWallet];
        uint256 currentScore = oldScore;

        if (!initialized[farmerWallet]) {
            initialized[farmerWallet] = true;
            currentScore = STARTING_SCORE;
            emit ScoreInitialised(farmerWallet, currentScore);
        }

        int256 newScoreInt = int256(currentScore) + delta;

        // Clamp the score to the defined floor and ceiling
        if (newScoreInt < int256(SCORE_FLOOR)) {
            newScoreInt = int256(SCORE_FLOOR);
        } else if (newScoreInt > int256(SCORE_CEILING)) {
            newScoreInt = int256(SCORE_CEILING);
        }

        uint256 newScore = uint256(newScoreInt);

        if (oldScore != newScore) {
            scores[farmerWallet] = newScore;
            lastUpdated[farmerWallet] = block.timestamp;
            emit ScoreUpdated(farmerWallet, oldScore == 0 ? STARTING_SCORE : oldScore, newScore, reason);
        }
    }
}
