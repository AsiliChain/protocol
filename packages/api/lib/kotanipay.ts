/**
 * Kotani Pay integration.
 * Converts USDC (Mantle) → MTN Mobile Money (Uganda).
 *
 * Phase 1: Stub — logs intent without actual API call.
 */

export interface KotaniPayoutRequest {
  amount: number; // USDC amount
  recipientPhone: string; // Uganda MTN: +2567XXXXXXXX
  reference: string; // unique idempotency key
}

export interface KotaniPayoutResponse {
  status: "pending" | "completed" | "failed";
  kotaniTxId: string;
  providerRef?: string;
}

export async function initiatePayout(
  _request: KotaniPayoutRequest,
): Promise<KotaniPayoutResponse> {
  if (!process.env.KOTANI_API_KEY) {
    throw new Error("KOTANI_API_KEY not set");
  }

  // TODO: POST to Kotani Pay API
  console.log("[kotanipay:stub] payout", _request.amount, "USDC to", _request.recipientPhone);

  return {
    status: "pending",
    kotaniTxId: `kotani-stub-${Date.now()}`,
  };
}
