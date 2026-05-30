import { getWalletClient, getPublicClient } from "@/lib/mantle";
import { addresses, batchTokenAbi, traceLogAbi, creditScoreAbi, farmerRegistryAbi } from "@/lib/contracts";
import { verifyBearer, errorResponse } from "@/api/_lib/auth";

interface SubmitBatchBody {
  batchId: string;
  cooperativeWallet: `0x${string}`;
  farmerWallet: `0x${string}`;
  weightKg: number;
  grade: string;
  moisturePct: number;
  collectionPointHash: string;
  weightSlipIpfsCid: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    await verifyBearer(request);
  } catch {
    return errorResponse(401, "Unauthorized");
  }

  let body: SubmitBatchBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const {
    batchId,
    cooperativeWallet,
    farmerWallet,
    weightKg,
    grade,
    moisturePct,
    collectionPointHash,
    weightSlipIpfsCid,
  } = body;

  if (!batchId || !cooperativeWallet || !farmerWallet || !weightKg || !grade) {
    return errorResponse(400, "Missing required fields: batchId, cooperativeWallet, farmerWallet, weightKg, grade");
  }

  try {
    const walletClient = getWalletClient();
    if (!walletClient) throw new Error("Wallet client not initialized");
    const publicClient = getPublicClient();

    if (!publicClient) throw new Error("Public client not initialized");

    // 1. Verify farmer is registered
    const isRegistered = await publicClient.readContract({
      address: addresses.farmerRegistry,
      abi: farmerRegistryAbi,
      functionName: "isRegistered",
      args: [farmerWallet],
    });
    if (!isRegistered) {
      return errorResponse(400, "Farmer not registered");
    }

    // 2. Mint the batch token — returns the tokenId
    const hash = await walletClient.writeContract({
      address: addresses.batchToken,
      abi: batchTokenAbi,
      functionName: "mintBatch",
      args: [
        batchId,
        cooperativeWallet,
        farmerWallet,
        BigInt(weightKg),
        grade,
        BigInt(moisturePct),
        collectionPointHash as `0x${string}`,
        weightSlipIpfsCid as `0x${string}`,
      ],
    });

    // 3. The tokenId is emitted in the BatchMinted event.
    //    For now we can't easily parse the tx receipt via viem public client
    //    from a writeContract call, so we pass it through.
    //    TODO: Parse BatchMinted(tokenId, batchId, ...) from tx receipt logs.

    // 4. Advance TraceLog to DELIVERED (Stage 0 — auto-initializes)
    //    This requires knowing the tokenId. In Phase 1, the next step
    //    can be done client-side or in a follow-up call.
    //    The agent or cooperative calling this route should make a
    //    subsequent PATCH /api/batch/[id]/stage call.

    console.log("[batch/submit] minted batch", batchId, "farmer", farmerWallet, "tx:", hash);

    return Response.json({
      success: true,
      batchId,
      transactionHash: hash,
      // TODO: Parse tokenId from receipt and include it here
      nextStep: "PATCH /api/batch/[tokenId]/stage with newStage=0 to advance to DELIVERED",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[batch/submit]", message);
    return errorResponse(500, `Batch submission failed: ${message}`);
  }
}
