// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IBatchToken} from "./interfaces/IBatchToken.sol";
import {IFarmerRegistry} from "./interfaces/IFarmerRegistry.sol";
import {ICreditScore} from "./interfaces/ICreditScore.sol";
import {IProtocolFee} from "./interfaces/IProtocolFee.sol";

/**
 * @notice Extended BatchToken interface for reading batch valuation data.
 * @dev batchData mapping is public — callable as a getter via this interface.
 */
interface IBatchTokenExtended {
    function batchData(uint256 tokenId) external view returns (
        string  memory batchId,
        address farmerWallet,
        address cooperativeWallet,
        uint256 weightKg,
        string  memory grade,
        uint256 moisturePct,
        bytes32 collectionPointHash,
        bytes32 weightSlipIpfsCid,
        uint256 mintTimestamp,
        bool    loanActive
    );
}

/**
 * @title LendingVault
 * @author AsiliChain
 * @notice ERC-4626 lending vault for Ugandan coffee farmers.
 * @dev Phase 1: manual coffee pricing, Pyth USDC/USD feed for peg verification.
 *      Loans are collateralized by BatchTokens. Auto-repayment triggered
 *      by API on TraceLog EXPORTED events. UUPS-upgradeable.
 */
contract LendingVault is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // =====================================
    //                              Roles
    // =====================================

    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    // =====================================
    //                              Types
    // =====================================

    enum LoanStatus {
        NONE,       // 0 — no loan exists for this batch
        ACTIVE,     // 1 — loan originated, repayment pending
        DEFAULTED,  // 2 — loan in forbearance period
        SETTLED     // 3 — loan repaid, batch burned
    }

    struct Loan {
        uint256   batchTokenId;
        address   farmerWallet;
        uint256   principalUsdc;
        uint256   interestUsdc;
        uint256   originatedAt;
        uint256   expiresAt;
        uint256   forbearanceExpiry;
        LoanStatus status;
    }

    // =====================================
    //                            Storage
    // =====================================

    // === Contract references ===
    /// @notice BatchToken — collateral registry
    IBatchToken    public batchToken;
    /// @notice FarmerRegistry — farmer existence checks
    IFarmerRegistry public farmerRegistry;
    /// @notice CreditScore — LTV tier lookup
    ICreditScore   public creditScore;
    /// @notice ProtocolFee — 4% fee collection on settlement
    IProtocolFee   public protocolFee;
    /// @notice USDC token (6 decimals on Mantle)
    IERC20         public usdc;

    // === Pyth Network ===
    /// @notice Pyth oracle contract address — set at initialize()
    address public pythOracle;
    /// @notice USDC/USD price feed ID — set at initialize()
    bytes32 public usdcUsdPriceId;

    // === Pricing parameters (admin-settable) ===
    /// @notice Base coffee price per kg in USDC (6 decimals). Default: $2.50/kg.
    uint256 public pricePerKgBase;
    /// @notice Maximum LTV in basis points (80% = 8000). Overrides if CreditScore tier is lower.
    uint256 public maxLtvBps;
    /// @notice Annualized interest rate in basis points (10% = 1000).
    uint256 public interestRateBps;
    /// @notice Loan term in seconds (90 days default).
    uint256 public loanTermSecs;
    /// @notice Forbearance period in seconds after default (30 days default).
    uint256 public forbearancePeriodSecs;

    // === Operational state ===
    /// @notice Protocol pause flag — no new loans when true.
    bool public paused;

    // === Loan mappings ===
    /// @notice Maps batchTokenId → Loan
    mapping(uint256 => Loan) public loans;
    /// @notice Maps farmerWallet → array of loan batchTokenIds
    mapping(address => uint256[]) public farmerLoans;

    // === ERC-4626 accounting ===
    uint256 public totalDeposits;
    mapping(address => uint256) public mfiDeposits;
    uint256 public activeLoanBook;

    // =====================================
    //                            Events
    // =====================================

    event LoanOriginated(
        uint256 indexed batchTokenId,
        address indexed farmerWallet,
        uint256 principalUsdc,
        uint256 interestUsdc,
        uint256 ltvBasisPoints,
        uint256 expiresAt
    );

    event LoanDefaulted(
        uint256 indexed batchTokenId,
        uint256 forbearanceExpiry
    );

    event LoanSettled(
        uint256 indexed batchTokenId,
        address indexed farmerWallet,
        uint256 totalRepaid,
        uint256 protocolFeeCollected
    );

    event CoffeePriceUpdated(
        uint256 oldPrice,
        uint256 newPrice,
        address indexed updatedBy
    );

    event ParametersUpdated(
        uint256 maxLtvBps,
        uint256 interestRateBps,
        uint256 loanTermSecs,
        uint256 forbearancePeriodSecs,
        address indexed updatedBy
    );

    event Paused(address indexed pausedBy);
    event Unpaused(address indexed unpausedBy);

    event Deposit(
        address indexed mfi,
        uint256 amount,
        uint256 totalDeposits
    );

    event Withdrawal(
        address indexed mfi,
        uint256 amount,
        uint256 totalDeposits
    );

    // =====================================
    //                     Initialization & Upgrade
    // =====================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the LendingVault contract.
     * @param defaultAdmin         Address to receive DEFAULT_ADMIN_ROLE.
     * @param batchTokenAddress    Deployed BatchToken proxy address.
     * @param farmerRegistryAddress Deployed FarmerRegistry proxy address.
     * @param creditScoreAddress   Deployed CreditScore proxy address.
     * @param protocolFeeAddress   Deployed ProtocolFee proxy address.
     * @param usdcAddress          USDC token address on deployed chain.
     * @param pythOracleAddress    Pyth oracle address (Mantle mainnet or Sepolia).
     * @param usdcUsdPriceId_      Pyth price feed ID for USDC/USD.
     */
    function initialize(
        address defaultAdmin,
        address batchTokenAddress,
        address farmerRegistryAddress,
        address creditScoreAddress,
        address protocolFeeAddress,
        address usdcAddress,
        address pythOracleAddress,
        bytes32 usdcUsdPriceId_
    ) public initializer {
        require(defaultAdmin != address(0), "LendingVault: zero admin");
        require(batchTokenAddress != address(0), "LendingVault: zero batchToken");
        require(farmerRegistryAddress != address(0), "LendingVault: zero farmerRegistry");
        require(creditScoreAddress != address(0), "LendingVault: zero creditScore");
        require(protocolFeeAddress != address(0), "LendingVault: zero protocolFee");
        require(usdcAddress != address(0), "LendingVault: zero usdc");
        require(pythOracleAddress != address(0), "LendingVault: zero pyth oracle");
        require(usdcUsdPriceId_ != bytes32(0), "LendingVault: zero price feed ID");

        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);

        batchToken       = IBatchToken(batchTokenAddress);
        farmerRegistry   = IFarmerRegistry(farmerRegistryAddress);
        creditScore      = ICreditScore(creditScoreAddress);
        protocolFee      = IProtocolFee(protocolFeeAddress);
        usdc             = IERC20(usdcAddress);
        pythOracle       = pythOracleAddress;
        usdcUsdPriceId   = usdcUsdPriceId_;

        // Default parameters (admin-updatable)
        pricePerKgBase        = 5_000000;  // $5.00/kg, 6 decimals
        maxLtvBps             = 8000;        // 80%
        interestRateBps       = 1000;        // 10% annualized
        loanTermSecs          = 90 days;
        forbearancePeriodSecs = 30 days;
        paused                = false;
    }

    /**
     * @dev Authorizes an upgrade. Restricted to DEFAULT_ADMIN_ROLE per Invariant #6.
     * @param newImplementation Address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override(UUPSUpgradeable)
        onlyRole(DEFAULT_ADMIN_ROLE) {}

    // =====================================
    //                      Admin Functions
    // =====================================

    /**
     * @notice Updates the coffee price per kg. DEFAULT_ADMIN_ROLE.
     * @param newPrice New price in USDC (6 decimals).
     */
    function setCoffeePrice(uint256 newPrice) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newPrice > 0, "LendingVault: zero price");
        uint256 oldPrice = pricePerKgBase;
        pricePerKgBase = newPrice;
        emit CoffeePriceUpdated(oldPrice, newPrice, msg.sender);
    }

    /**
     * @notice Updates loan parameters. DEFAULT_ADMIN_ROLE.
     * @param newMaxLtvBps             Max LTV in basis points.
     * @param newInterestRateBps       Interest rate in basis points.
     * @param newLoanTermSecs          Loan term in seconds.
     * @param newForbearancePeriodSecs Forbearance period in seconds.
     */
    function setParameters(
        uint256 newMaxLtvBps,
        uint256 newInterestRateBps,
        uint256 newLoanTermSecs,
        uint256 newForbearancePeriodSecs
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newMaxLtvBps <= 10000, "LendingVault: LTV exceeds 100%");
        require(newInterestRateBps <= 5000, "LendingVault: interest rate exceeds 50%");
        require(newLoanTermSecs >= 7 days, "LendingVault: loan term too short");
        require(newForbearancePeriodSecs >= 7 days, "LendingVault: forbearance too short");

        maxLtvBps             = newMaxLtvBps;
        interestRateBps       = newInterestRateBps;
        loanTermSecs          = newLoanTermSecs;
        forbearancePeriodSecs = newForbearancePeriodSecs;

        emit ParametersUpdated(
            newMaxLtvBps, newInterestRateBps,
            newLoanTermSecs, newForbearancePeriodSecs,
            msg.sender
        );
    }

    /**
     * @notice Pauses new loan origination. DEFAULT_ADMIN_ROLE.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @notice Unpauses new loan origination. DEFAULT_ADMIN_ROLE.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // =====================================
    //                      MFI Functions
    // =====================================

    /**
     * @notice Deposits USDC into the vault. Callable by MFI partners.
     * @param amount Amount of USDC to deposit (6 decimals).
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "LendingVault: zero deposit");
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "LendingVault: transfer failed"
        );
        mfiDeposits[msg.sender] += amount;
        totalDeposits += amount;
        emit Deposit(msg.sender, amount, totalDeposits);
    }

    /**
     * @notice Withdraws USDC from the vault. Callable by MFI partners.
     * @dev Cannot withdraw funds currently loaned out.
     * @param amount Amount of USDC to withdraw (6 decimals).
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "LendingVault: zero withdrawal");
        require(mfiDeposits[msg.sender] >= amount, "LendingVault: insufficient deposit");
        require(
            totalDeposits - amount >= activeLoanBook,
            "LendingVault: insufficient liquidity"
        );

        mfiDeposits[msg.sender] -= amount;
        totalDeposits -= amount;
        require(usdc.transfer(msg.sender, amount), "LendingVault: transfer failed");
        emit Withdrawal(msg.sender, amount, totalDeposits);
    }

    // =====================================
    //                      Loan Functions
    // =====================================

    /**
     * @notice Originates a loan against a BatchToken.
     * @dev BatchToken must be free (no active loan), farmer must exist,
     *      protocol must not be paused. LTV determined by CreditScore tier.
     * @param batchTokenId The BatchToken to use as collateral.
     * @param farmerWallet The farmer's wallet address.
     */
    function originate(uint256 batchTokenId, address farmerWallet) external {
        require(!paused, "LendingVault: paused");
        require(
            farmerRegistry.farmerExists(farmerWallet),
            "LendingVault: farmer not registered"
        );
        require(
            loans[batchTokenId].status == LoanStatus.NONE,
            "LendingVault: batch has existing loan"
        );
        require(
            !batchToken.hasActiveLoan(batchTokenId),
            "LendingVault: batch already locked"
        );
        batchToken.checkExists(batchTokenId);
        // Get batch valuation
        uint256 batchValue = getBatchValue(batchTokenId);

        // Get LTV from CreditScore
        (uint256 maxLoanUsdc, uint256 ltvBasisPoints) = creditScore.getLtvTier(farmerWallet);
        if (ltvBasisPoints > maxLtvBps) {
            ltvBasisPoints = maxLtvBps;
        }

        // Calculate loan amounts
        uint256 principalUsdc = (batchValue * ltvBasisPoints) / 10000;
        uint256 interestUsdc = (principalUsdc * interestRateBps * loanTermSecs)
            / (365 days * 10000);

        uint256 totalLoan = principalUsdc + interestUsdc;
        require(
            totalDeposits - activeLoanBook >= principalUsdc,
            "LendingVault: insufficient liquidity"
        );

        // Lock batch as collateral
        batchToken.lockAsCollateral(batchTokenId);

        // Store loan
        loans[batchTokenId] = Loan({
            batchTokenId:     batchTokenId,
            farmerWallet:     farmerWallet,
            principalUsdc:    principalUsdc,
            interestUsdc:     interestUsdc,
            originatedAt:     block.timestamp,
            expiresAt:        block.timestamp + loanTermSecs,
            forbearanceExpiry: 0,
            status:           LoanStatus.ACTIVE
        });

        farmerLoans[farmerWallet].push(batchTokenId);
        activeLoanBook += principalUsdc;

        // Transfer principal to farmer
        require(
            usdc.transfer(farmerWallet, principalUsdc),
            "LendingVault: transfer failed"
        );

        emit LoanOriginated(
            batchTokenId, farmerWallet, principalUsdc,
            interestUsdc, ltvBasisPoints, block.timestamp + loanTermSecs
        );
    }

    /**
     * @notice Settles a loan after repayment. Called by API on TraceLog EXPORTED events.
     * @dev Unlocks collateral, collects 4% protocol fee, returns net to farmer.
     * @param batchTokenId The BatchToken ID whose loan is being settled.
     * @param usdcAmount   Total USDC received from buyer (gross repayment).
     */
    function settle(uint256 batchTokenId, uint256 usdcAmount) external {
        Loan storage loan = loans[batchTokenId];
        require(loan.status == LoanStatus.ACTIVE, "LendingVault: loan not active");
        require(usdcAmount >= loan.principalUsdc, "LendingVault: insufficient repayment");

        uint256 totalDue = loan.principalUsdc + loan.interestUsdc;
        uint256 protocolFeeAmount = (totalDue * 4) / 100;

        // Pay protocol fee
        protocolFee.collect(protocolFeeAmount);

        // Unlock and burn
        batchToken.unlockCollateral(batchTokenId);
        batchToken.burnSettled(batchTokenId);

        // Return net to farmer
        uint256 netToFarmer = usdcAmount - totalDue - protocolFeeAmount;
        if (netToFarmer > 0) {
            require(usdc.transfer(loan.farmerWallet, netToFarmer), "LendingVault: transfer failed");
        }

        // Update accounting
        loan.status = LoanStatus.SETTLED;
        activeLoanBook -= loan.principalUsdc;

        emit LoanSettled(batchTokenId, loan.farmerWallet, totalDue, protocolFeeAmount);
    }

    /**
     * @notice Marks a loan as defaulted. Called by API when loan expires unpaid.
     * @param batchTokenId The defaulted loan.
     */
    function markDefaulted(uint256 batchTokenId) external {
        Loan storage loan = loans[batchTokenId];
        require(loan.status == LoanStatus.ACTIVE, "LendingVault: loan not active");
        require(block.timestamp >= loan.expiresAt, "LendingVault: loan not yet expired");

        loan.status = LoanStatus.DEFAULTED;
        loan.forbearanceExpiry = block.timestamp + forbearancePeriodSecs;

        // Report default to CreditScore
        creditScore.recordDefault(loan.farmerWallet);

        emit LoanDefaulted(batchTokenId, loan.forbearanceExpiry);
    }

    // =====================================
    //                      View Functions
    // =====================================

    /**
     * @notice Returns the USDC valuation of a batch token.
     * @dev pricePerKgBase × batch weight × grade multiplier.
     * @param batchTokenId The BatchToken to value.
     * @return valueUsdc The batch value in USDC (6 decimals).
     */
    function getBatchValue(uint256 batchTokenId) public view returns (uint256 valueUsdc) {
        (,,,uint256 weightKg, string memory grade,,,,,) = IBatchTokenExtended(address(batchToken)).batchData(batchTokenId);
        uint256 gradeMultiplier = getGradeMultiplier(grade);
        valueUsdc = (pricePerKgBase * weightKg * gradeMultiplier) / 100;
    }

    /**
     * @notice Returns the grade multiplier for a given coffee grade.
     * @dev screen18 = 100 (base), screen15 = 85, FAQ = 60.
     * @param grade The grade string (e.g. "screen18").
     * @return multiplier in basis points (100 = 1.00x).
     */
    function getGradeMultiplier(string memory grade) public pure returns (uint256) {
        bytes32 gradeHash = keccak256(bytes(grade));
        if (gradeHash == keccak256("screen18")) return 100;
        if (gradeHash == keccak256("screen15")) return 85;
        if (gradeHash == keccak256("FAQ"))       return 60;
        return 50; // unknown grade — conservative
    }

    /**
     * @notice Returns all loans for a given farmer.
     * @param farmerWallet The farmer's wallet address.
     * @return batchTokenIds Array of batch token IDs with loans.
     */
    function getFarmerLoans(address farmerWallet) external view returns (uint256[] memory) {
        return farmerLoans[farmerWallet];
    }

    /**
     * @notice Returns the loan for a given batch token.
     * @param batchTokenId The batch token ID.
     * @return The Loan struct.
     */
    function getLoan(uint256 batchTokenId) external view returns (Loan memory) {
        return loans[batchTokenId];
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