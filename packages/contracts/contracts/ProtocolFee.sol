// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @notice Minimal ERC20 interface for USDC transfers.
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title ProtocolFee
 * @author AsiliChain
 * @notice Collects and distributes the 4% protocol margin from loan repayments.
 * @dev VAULT_ROLE (LendingVault) calls collect(). MULTISIG_ROLE (3-of-5 wallet)
 *      calls distribute(). History via events, not in-storage array.
 *      UUPS-upgradeable. No dependencies on other AsiliChain contracts.
 */
contract ProtocolFee is Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    // =====================================
    //                              Roles
    // =====================================

    bytes32 public constant VAULT_ROLE    = keccak256("VAULT_ROLE");
    bytes32 public constant MULTISIG_ROLE = keccak256("MULTISIG_ROLE");

    // =====================================
    //                            Storage
    // =====================================

    /// @notice Cumulative USDC received via collect().
    uint256 public totalCollected;

    /// @notice Cumulative USDC sent via distribute().
    uint256 public totalDistributed;

    /// @notice USDC token contract address — set at initialize(), immutable.
    address public usdcToken;

    // =====================================
    //                            Events
    // =====================================

    event FeeCollected(
        uint256 amountUsdc,
        uint256 totalCollectedToDate,
        uint256 timestamp
    );

    event FeeDistributed(
        address indexed recipient,
        uint256         amountUsdc,
        string          purpose,
        uint256         timestamp
    );

    // =====================================
    //                     Initialization & Upgrade
    // =====================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the ProtocolFee contract.
     * @param defaultAdmin      Address to receive DEFAULT_ADMIN_ROLE.
     * @param usdcTokenAddress  Address of the USDC token on deployed chain.
     */
    function initialize(address defaultAdmin, address usdcTokenAddress) public initializer {
        require(defaultAdmin != address(0), "ProtocolFee: zero admin");
        require(usdcTokenAddress != address(0), "ProtocolFee: zero usdc token");

        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);

        usdcToken        = usdcTokenAddress;
        totalCollected   = 0;
        totalDistributed = 0;
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
     * @notice Records a protocol fee collection.
     * @dev LendingVault must transfer USDC to this contract BEFORE
     *      calling collect(). This contract records what has arrived — it
     *      does not pull funds. See LendingVault.sol NatSpec for details.
     * @param amountUsdc The amount of USDC collected.
     */
    function collect(uint256 amountUsdc) external onlyRole(VAULT_ROLE) {
        require(amountUsdc > 0, "ProtocolFee: zero amount");

        totalCollected += amountUsdc;

        emit FeeCollected(amountUsdc, totalCollected, block.timestamp);
    }

    /**
     * @notice Distributes protocol fees to a recipient.
     * @dev Callable only by MULTISIG_ROLE (3-of-5 multisig wallet).
     * @param recipient The address receiving the USDC distribution.
     * @param amount    The amount of USDC to distribute.
     * @param purpose   A description of the distribution purpose (e.g. "Operations Q3 2026").
     */
    function distribute(
        address recipient,
        uint256 amount,
        string calldata purpose
    ) external onlyRole(MULTISIG_ROLE) {
        require(recipient != address(0), "ProtocolFee: zero recipient");
        require(amount > 0, "ProtocolFee: zero amount");
        require(bytes(purpose).length > 0, "ProtocolFee: empty purpose");
        require(amount <= pendingDistribution(), "ProtocolFee: insufficient balance");

        totalDistributed += amount;

        IERC20(usdcToken).transfer(recipient, amount);

        emit FeeDistributed(recipient, amount, purpose, block.timestamp);
    }

    /**
     * @notice Returns the amount of USDC available for distribution.
     * @dev totalCollected - totalDistributed. Public for internal use.
     * @return The pending distribution amount in USDC (6 decimals).
     */
    function pendingDistribution() public view returns (uint256) {
        return totalCollected - totalDistributed;
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