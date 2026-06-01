/**
 * Fonbnk integration — Sandbox.
 *
 * Bridges USDC from Mantle → Base → Fonbnk Merchant Balance → MTN Mobile Money (Uganda).
 *
 * Flow 1 — Fund merchant balance:
 *   createDepositOrder() → get recipientWalletAddress on Base
 *   → bridge USDC from Mantle to that Base address via CCIP (lane confirmed)
 *   → confirmOrder(txHash) → merchant balance credited
 *
 * Flow 2 — Disburse to farmer:
 *   initiatePayout(phone, amount) → Fonbnk pushes UGX to farmer's MTN
 *   → webhook notifies order-status-change
 */

import crypto from "node:crypto";

// =====================================
//                        Types
// =====================================

export interface FonbnkCredentials {
  clientId: string;
  secret: string;
  baseUrl: string;
}

export interface DepositOrderRequest {
  /** USDC amount (as decimal, e.g. 100.50) */
  amount: number;
}

export interface DepositOrderResponse {
  orderId: string;
  recipientWalletAddress: string;
  quoteId: string;
  quoteExpiresAt: string;
}

export interface PayoutRequest {
  /** USD amount to disburse from merchant balance */
  amount: number;
  /** Uganda MTN number: +2567XXXXXXXX */
  recipientPhone: string;
  /** Farmer's full name */
  recipientName: string;
  /** Unique idempotency key */
  reference: string;
}

export interface PayoutResponse {
  orderId: string;
  status: FonbnkOrderStatus;
}

export interface FonbnkBalance {
  usd: number;
}

export type FonbnkOrderStatus =
  | "pending"
  | "deposit_received"
  | "payout_pending"
  | "payout_successful"
  | "settled"
  | "failed"
  | "expired";

export interface FonbnkOrder {
  id: string;
  status: FonbnkOrderStatus;
  deposit: {
    paymentChannel: string;
    currencyType: string;
    currencyCode: string;
    cashout: {
      amountBeforeFees: number;
      amountAfterFees: number;
      amountBeforeFeesUsd: number;
      amountAfterFeesUsd: number;
    };
  };
  payout: {
    paymentChannel: string;
    currencyType: string;
    currencyCode: string;
    cashout: {
      amountBeforeFees: number;
      amountAfterFees: number;
      amountBeforeFeesUsd: number;
      amountAfterFeesUsd: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface FonbnkWebhookPayload {
  event: "order-status-change";
  data: {
    order: FonbnkOrder;
    userKyc?: unknown;
  };
}

// =====================================
//                     Helpers
// =====================================

function getCredentials(): FonbnkCredentials {
  const clientId = process.env.FONBNK_CLIENT_ID;
  const secret = process.env.FONBNK_SECRET;
  const baseUrl = process.env.FONBNK_API_URL;

  if (!clientId || !secret || !baseUrl) {
    throw new Error(
      "Fonbnk credentials not configured. Set FONBNK_CLIENT_ID, FONBNK_SECRET, and FONBNK_API_URL.",
    );
  }

  return { clientId, secret, baseUrl };
}

/**
 * HMAC-SHA256 signing per Fonbnk spec:
 *   stringToSign = `${timestamp}:${endpoint}`
 *   signature = Base64(HMAC-SHA256(Base64Decode(secret), UTF8(stringToSign)))
 */
function signRequest(
  clientSecret: string,
  timestamp: string,
  endpoint: string,
): string {
  const decodedKey = Buffer.from(clientSecret, "base64");
  const stringToSign = `${timestamp}:${endpoint}`;
  const hmac = crypto.createHmac("sha256", decodedKey);
  hmac.update(stringToSign, "utf-8");
  return hmac.digest("base64");
}

async function apiRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const { clientId, secret, baseUrl } = getCredentials();

  const timestamp = Date.now().toString();
  const endpoint = path;
  const signature = signRequest(secret, timestamp, endpoint);

  const url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-client-id": clientId,
    "x-timestamp": timestamp,
    "x-signature": signature,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "no body");
    throw new Error(`Fonbnk API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// =====================================
//                    Flow 1 — Fund Merchant Balance
// =====================================

/**
 * Creates a crypto deposit order on Fonbnk.
 * Fonbnk returns a per-order recipientWalletAddress — send Base USDC there.
 *
 * POST /api/v2/order
 *   deposit:  crypto / crypto / BASE_USDC
 *   payout:   merchant_balance / merchant_balance / USD
 */
export async function createDepositOrder(
  req: DepositOrderRequest,
): Promise<DepositOrderResponse> {
  const body = {
    userCountryIsoCode: "UG",
    userEmail: "treasury@asilichain.xyz",
    userIp: "0.0.0.0",
    deposit: {
      paymentChannel: "crypto",
      currencyType: "crypto",
      currencyCode: "BASE_USDC",
      amount: req.amount,
    },
    payout: {
      paymentChannel: "merchant_balance",
      currencyType: "merchant_balance",
      currencyCode: "USD",
    },
    fieldsToCreateOrder: {},
  };

  const result = (await apiRequest<Record<string, unknown>>(
    "POST",
    "/api/v2/order",
    body,
  )) as any;

  // Extract deposit address from transfer instructions
  const transferDetails: Record<string, string>[] =
    result.deposit?.transferInstructions?.transferDetails ?? [];
  const addressField = transferDetails.find(
    (f: Record<string, string>) => f.id === "recipientWalletAddress",
  );

  return {
    orderId: result.id as string,
    recipientWalletAddress: addressField?.value ?? "",
    quoteId: result.quoteId as string,
    quoteExpiresAt: result.quoteExpiresAt as string,
  };
}

/**
 * Confirms a crypto deposit order after sending funds to the deposit address.
 *
 * POST /api/v2/order/confirm
 */
export async function confirmOrder(
  orderId: string,
  transactionHash: string,
): Promise<FonbnkOrder> {
  return apiRequest<FonbnkOrder>("POST", "/api/v2/order/confirm", {
    orderId,
    fieldsToConfirmOrder: {
      transactionHash,
    },
  });
}

// =====================================
//              Flow 2 — Disburse to Farmer
// =====================================

/**
 * Initiates a payout from merchant balance (USD) to farmer's MTN Mobile Money (UGX).
 *
 * POST /api/v2/order
 *   deposit:  merchant_balance / merchant_balance / USD
 *   payout:   mobile_money / fiat / UGX
 */
export async function initiatePayout(
  req: PayoutRequest,
): Promise<PayoutResponse> {
  const body = {
    userCountryIsoCode: "UG",
    userEmail: "payouts@asilichain.xyz",
    userIp: "0.0.0.0",
    merchantOrderParams: req.reference,
    deposit: {
      paymentChannel: "merchant_balance",
      currencyType: "merchant_balance",
      currencyCode: "USD",
    },
    payout: {
      paymentChannel: "mobile_money",
      currencyType: "fiat",
      currencyCode: "UGX",
      countryIsoCode: "UG",
      amount: req.amount,
    },
    fieldsToCreateOrder: {
      phoneNumber: req.recipientPhone,
      recipientName: req.recipientName,
    },
  };

  const result = (await apiRequest<Record<string, unknown>>(
    "POST",
    "/api/v2/order",
    body,
  )) as any;

  return {
    orderId: result.id as string,
    status: mapOrderStatus(result.status as string),
  };
}

// =====================================
//                   View Functions
// =====================================

/**
 * Returns the merchant's current USD balance.
 * GET /api/v2/merchant-balance
 */
export async function getMerchantBalance(): Promise<FonbnkBalance> {
  const result = (await apiRequest<Record<string, unknown>>(
    "GET",
    "/api/v2/merchant-balance",
  )) as any;

  return { usd: (result.USD ?? 0) as number };
}

/**
 * Returns the current state of an order.
 * GET /api/v2/order/{orderId}
 */
export async function getOrderStatus(
  orderId: string,
): Promise<FonbnkOrder | null> {
  try {
    return await apiRequest<FonbnkOrder>("GET", `/api/v2/order/${orderId}`);
  } catch {
    return null;
  }
}

// =====================================
//                      Webhook Helpers
// =====================================

/**
 * Validates and parses an incoming Fonbnk webhook payload.
 */
export function parseFonbnkWebhook(payload: unknown): FonbnkWebhookPayload {
  const data = payload as FonbnkWebhookPayload;

  if (!data || data.event !== "order-status-change") {
    throw new Error("Invalid Fonbnk webhook: unexpected event");
  }

  if (!data.data?.order?.id) {
    throw new Error("Invalid Fonbnk webhook: missing order data");
  }

  return data;
}

// =====================================
//                      Internal
// =====================================

function mapOrderStatus(raw: string): FonbnkOrderStatus {
  const normalized = raw.toLowerCase();
  const valid: FonbnkOrderStatus[] = [
    "pending",
    "deposit_received",
    "payout_pending",
    "payout_successful",
    "settled",
    "failed",
    "expired",
  ];
  if (valid.includes(normalized as FonbnkOrderStatus)) {
    return normalized as FonbnkOrderStatus;
  }
  return "pending";
}
