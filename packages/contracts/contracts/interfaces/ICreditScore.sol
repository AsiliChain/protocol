// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @notice Minimal interface for CreditScore used by LendingVault.
 * @dev LendingVault only needs getLtvTier() and recordDefault().
 */
interface ICreditScore {
    /**
     * @notice Returns the LTV tier for a farmer.
     * @param farmerWallet The farmer's wallet address.
     * @return maxLoanUsdc    Maximum loan amount in USDC (6 decimals).
     * @return ltvBasisPoints LTV in basis points (5000 = 50%).
     */
    function getLtvTier(address farmerWallet)
        external view returns (uint256 maxLoanUsdc, uint256 ltvBasisPoints);

    /**
     * @notice Records a loan default against a farmer's credit score.
     * @param farmerWallet The farmer's wallet address.
     */
    function recordDefault(address farmerWallet) external;
}