import { getWalletClient } from "@/lib/mantle";
import { addresses, traceLogAbi } from "@/lib/contracts";
import { verifyBearer, errorResponse } from "@/api/_lib/auth";
import { publishToHcs } from "@/lib/hedera";

const STAGE_NAMES = [
  "DELIVERED", "GRADED", "MILLED", "WAREHOUSED",
  "COMMITTED", "EXPORTED", "SETTLED",
] as const;

interface StageUpdateBody {
  newStage: number;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    await verifyBearer(request);
  } catch {
    return errorResponse(401, "Unauthorized");
  }

  const tokenId = params.id;
  if (!tokenId || tokenId === "0") {
    return errorResponse(400, "Invalid token ID");
  }

  let body: StageUpdateBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const { newStage } = body;
  if (newStage === undefined || newStage < 0 || newStage > 6) {
    return errorResponse(400, "newStage must be between 0 (DELIVERED) and 6 (SETTLED)");
  }

  try {
    const walletClient = getWalletClient();
    if (!walletClient) throw new Error("Wallet client not initialized");

    const stageName = STAGE_NAMES[newStage] ?? `STAGE_${newStage}`;

    const hash = await walletClient.writeContract({
      address: addresses.traceLog,
      abi: traceLogAbi,
      functionName: "updateStage",
      args: [BigInt(tokenId), newStage],
    });

    // Non-blocking HCS audit trail — failures do not affect the stage update
    let hcsTimestamp: string | null = null;
    try {
      const hcsResult = await publishToHcs({
        topicId: process.env.HEDERA_TOPIC_ID ?? "",
        batchTokenId: tokenId,
        eventType: stageName,
        payload: {
          tokenId: Number(tokenId),
          newStage,
          stageName,
          transactionHash: hash,
          triggeredBy: "stage-update-api",
        },
      });
      hcsTimestamp = hcsResult.consensusTimestamp;
    } catch {
      // HCS is auxiliary — stage update already succeeded
    }

    return Response.json({
      success: true,
      tokenId,
      newStage,
      stageName,
      transactionHash: hash,
      hcsConsensusTimestamp: hcsTimestamp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[batch/:id/stage]", message);
    return errorResponse(500, `Stage update failed: ${message}`);
  }
}
