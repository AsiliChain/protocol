/**
 * Transfi integration.
 * Cross-border USDC transfers (e.g., buyer → protocol).
 *
 * Phase 1: Stub — logs intent without actual API call.
 */

export interface TransfiTransferRequest {
  amount: number;
  sourceChain: "mantle" | "mantle-sepolia";
  destinationAddress: `0x${string}`;
  reference: string;
}

export interface TransfiTransferResponse {
  status: "pending" | "completed" | "failed";
  transfiTxId: string;
  txHash?: string;
}

export async function initiateTransfer(
  _request: TransfiTransferRequest,
): Promise<TransfiTransferResponse> {
  if (!process.env.TRANSFI_API_KEY) {
    throw new Error("TRANSFI_API_KEY not set");
  }

  // TODO: POST to Transfi API
  console.log("[transfi:stub] transfer", _request.amount, "USDC to", _request.destinationAddress);

  return {
    status: "pending",
    transfiTxId: `transfi-stub-${Date.now()}`,
  };
}
