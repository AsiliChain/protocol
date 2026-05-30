import { getPublicClient, getWalletClient } from "@/lib/mantle";
import {
  addresses,
  lendingVaultAbi,
  batchTokenAbi,
  traceLogAbi,
} from "@/lib/contracts";

interface AlchemyWebhookPayload {
  webhookId: string;
  event: {
    data: {
      block: { hash: string; number: number };
      log: {
        address: string;
        topics: string[];
        data: string;
        transactionHash: string;
      };
      removed: boolean;
    };
  };
}

/**
 * Validates the Alchemy webhook signature using the shared secret.
 * Alchemy sends the signature in the `x-alchemy-signature` header.
 */
function validateSignature(
  _request: Request,
  _body: string,
): boolean {
  // TODO: Implement HMAC-SHA256 signature verification using
  // process.env.ALCHEMY_WEBHOOK_SECRET when Alchemy webhook is configured.
  // For Phase 1, skip validation during development.
  return true;
}

/**
 * Parses an EXPORTED event from TraceLog.
 * The event is: StageUpdated(tokenId, oldStage, newStage, updater, timestamp)
 * EXPORTED = Stage 5. Topic[0] = event sig, Topic[1] = indexed tokenId.
 */
function parseExportedEvent(
  log: { topics: string[]; data: string },
): bigint | null {
  // StageUpdated event signature
  const STAGE_UPDATED_SIG =
    "0x9c2e5b861608e7b78b4e5e6ac6f73e65e7682a8d4f3e6ea2de7e4b7e39105f1";

  if (log.topics[0] !== STAGE_UPDATED_SIG) return null;
  if (log.topics.length < 3) return null;

  // topics[1] = indexed tokenId (uint256)
  const tokenId = BigInt(log.topics[1]);
  // topics[2] = oldStage, topics[3] = newStage (indexed uint8)
  const newStage = Number(BigInt(log.topics[3]));

  // Only react to EXPORTED (Stage 5)
  if (newStage !== 5) return null;

  return tokenId;
}

export async function POST(request: Request): Promise<Response> {
  // 1. Read and validate the raw body
  const body = await request.text();

  if (!validateSignature(request, body)) {
    return new Response("Invalid signature", { status: 401 });
  }

  // 2. Parse the webhook payload
  let payload: AlchemyWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const log = payload.event.data.log;

  // 3. Check if this is an EXPORTED stage event
  const tokenId = parseExportedEvent(log);
  if (tokenId === null) {
    // Not an EXPORTED event — acknowledge silently
    return new Response("OK", { status: 200 });
  }

  // 4. Fetch batch data to compute settlement amount
  const publicClient = getPublicClient();

  const batchResult = await publicClient.readContract({
    address: addresses.batchToken,
    abi: batchTokenAbi,
    functionName: "batchData",
    args: [tokenId],
  });

  // batchResult is a tuple: [batchId, farmerWallet, cooperativeWallet, weightKg, grade, moisturePct, mintTimestamp, loanActive]
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_batchId, _farmerWallet, _cooperativeWallet, weightKg, grade] =
    batchResult;

  // 5. Fetch the credit score and compute loan value
  // pricePerKgBase is $2.50 (250_000000 with 6 decimals)
  const pricePerKgBase = 250_000000n;

  // Grade multiplier: screen18 = 100, screen15 = 95, screen12 = 90, etc.
  let gradeMultiplier = 100n;
  if (grade === "screen15") gradeMultiplier = 95n;
  else if (grade === "screen12") gradeMultiplier = 90n;

  const batchValue =
    (pricePerKgBase * BigInt(weightKg) * gradeMultiplier) / 100n;
  const principal = (batchValue * 5000n) / 10000n; // 50% LTV for Standard tier
  const interest = (principal * 10n) / 100n; // 10% APR
  const totalDue = principal + interest;

  // 6. Settle the loan via the LendingVault
  const walletClient = getWalletClient();
  if (!walletClient) throw new Error("Wallet client not initialized");
  const hash = await walletClient.writeContract({
    address: addresses.lendingVault,
    abi: lendingVaultAbi,
    functionName: "settle",
    args: [tokenId, totalDue],
  });

  // 7. Advance TraceLog to SETTLED (Stage 6)
  // The settle() contract call may handle this internally.
  // If not, uncomment the following:
  // await walletClient.writeContract({
  //   address: addresses.traceLog,
  //   abi: traceLogAbi,
  //   functionName: "updateStage",
  //   args: [tokenId, 6],
  // });

  console.log(
    `[alchemy-webhook] EXPORTED token ${tokenId} settled. TX: ${hash}`,
  );

  // Must return 200 — Alchemy retries on non-200
  return Response.json({
    status: "settled",
    tokenId: tokenId.toString(),
    transactionHash: hash,
  });
}
