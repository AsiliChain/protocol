/**
 * Fonbnk integration.
 * Bridges USDC from Mantle → Celo → Fonbnk Merchant Balance → MTN Mobile Money (Uganda).
 *
 * Phase 1: Stub — logs intent without actual API call.
 *
 * Architecture:
 *   Mantle (protocol contracts) ──CCIP bridge──→ Fonbnk Celo USDC address
 *                                                  ↓
 *                                          Fonbnk Merchant Balance (USD)
 *                                                  ↓
 *                                          API call: disbursement → farmer MTN MoMo
 *
 * No Celo contracts or wallets needed on our side.
 * Fonbnk holds USDC in custody, credits merchant balance 1:1.
 */

export interface FonbnkPayoutRequest {
  amount: number; // USDC amount to disburse
  recipientPhone: string; // Uganda MTN: +2567XXXXXXXX
  recipientName: string; // Farmer's full name
  reference: string; // unique idempotency key
}

export interface FonbnkPayoutResponse {
  status: "pending" | "completed" | "failed";
  fonbnkOrderId: string;
  providerRef?: string;
}

export async function initiatePayout(
  _request: FonbnkPayoutRequest,
): Promise<FonbnkPayoutResponse> {
  if (!process.env.FONBNK_CLIENT_ID || !process.env.FONBNK_API_SECRET) {
    throw new Error("FONBNK_CLIENT_ID and FONBNK_API_SECRET must be set");
  }

  // TODO: POST to Fonbnk API
  // Flow:
  //   1. Sign request with HMAC (Client ID + API Secret)
  //   2. POST /api/v2/order with:
  //      - deposit:    { paymentChannel: "merchant_balance", currencyType: "merchant_balance", currencyCode: "USD" }
  //      - payout:     { paymentChannel: "mobile_money", currencyType: "fiat", currencyCode: "UGX", countryIsoCode: "UG" }
  //      - recipient:  { phone, name }
  //   3. Fonbnk debits merchant balance → pushes UGX to farmer's MTN
  //   4. Receive webhook: order.status = settled | failed

  console.log("[fonbnk:stub] payout", _request.amount, "USDC to", _request.recipientPhone);

  return {
    status: "pending",
    fonbnkOrderId: `fonbnk-stub-${Date.now()}`,
  };
}
