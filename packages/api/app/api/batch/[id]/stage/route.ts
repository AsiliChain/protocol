import { getWalletClient } from "@/lib/mantle";
import { addresses, traceLogAbi } from "@/lib/contracts";
import { verifyBearer, errorResponse } from "@/api/_lib/auth";

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

    const hash = await walletClient.writeContract({
      address: addresses.traceLog,
      abi: traceLogAbi,
      functionName: "updateStage",
      args: [BigInt(tokenId), newStage],
    });

    return Response.json({
      success: true,
      tokenId,
      newStage,
      transactionHash: hash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[batch/:id/stage]", message);
    return errorResponse(500, `Stage update failed: ${message}`);
  }
}
