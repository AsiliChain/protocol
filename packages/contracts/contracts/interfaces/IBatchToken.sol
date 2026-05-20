// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @notice Minimal interface for BatchToken used by TraceLog.
 * @dev TraceLog only needs to verify token existence before stage updates.
 */
interface IBatchToken {
    /**
     * @notice Verifies that a BatchToken exists.
     * @dev Reverts if the token was never minted or has been burned.
     * @param tokenId The BatchToken ID to check.
     */
    function checkExists(uint256 tokenId) external view;

    /**
     * @notice Returns true if the batch is currently locked as collateral.
     * @param tokenId The BatchToken ID to check.
     */
    function hasActiveLoan(uint256 tokenId) external view returns (bool);
}