// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @notice Minimal interface for TraceLog used by PurchaseOrder.
 * @dev PurchaseOrder only needs to advance stages on confirmation.
 */
interface ITraceLog {
    /**
     * @notice Advances a batch token to the next custody stage.
     * @dev PurchaseOrder calls this with COMMITTED (4) on PO confirmation.
     * @param tokenId  The BatchToken ID to advance.
     * @param newStage The target stage as uint8 — 4 = Stage.COMMITTED.
     */
    function updateStage(uint256 tokenId, uint8 newStage) external;
}