// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @notice Minimal interface for ProtocolFee used by LendingVault.
 * @dev LendingVault only needs collect() to remit the 4% protocol fee.
 */
interface IProtocolFee {
    /**
     * @notice Records a protocol fee collection.
     * @dev Caller (LendingVault) must transfer USDC BEFORE calling collect().
     * @param amountUsdc The amount of USDC collected.
     */
    function collect(uint256 amountUsdc) external;
}