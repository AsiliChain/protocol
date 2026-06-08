import { getPublicClient } from "@/lib/mantle";
import { addresses, batchTokenAbi } from "@/lib/contracts";
import { errorResponse } from "@/api/_lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: tokenId } = await params;
  if (!tokenId || tokenId === "0") {
    return errorResponse(400, "Invalid token ID");
  }

  try {
    const publicClient = getPublicClient();
    if (!publicClient) throw new Error("Public client not initialized");

    const result = await publicClient.readContract({
      address: addresses.batchToken,
      abi: batchTokenAbi,
      functionName: "batchData",
      args: [BigInt(tokenId)],
    });

    const [
      batchId,
      farmerWallet,
      cooperativeWallet,
      weightKg,
      grade,
      moisturePct,
      mintTimestamp,
      loanActive,
    ] = result;

    return Response.json({
      tokenId,
      batchId,
      farmerWallet,
      cooperativeWallet,
      weightKg: weightKg.toString(),
      grade,
      moisturePct: moisturePct.toString(),
      mintTimestamp: Number(mintTimestamp),
      loanActive,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[batch/:id]", message);
    return errorResponse(500, message);
  }
}
