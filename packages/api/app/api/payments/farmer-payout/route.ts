import { getWalletClient, getPublicClient } from "@/lib/mantle";
import { addresses, lendingVaultAbi, batchTokenAbi } from "@/lib/contracts";
import { verifyBearer, errorResponse } from "@/api/_lib/auth";

interface FarmerPayoutBody {
  batchTokenId: number;
  usdcAmount: number; // total USDC received from buyer (6 decimals)
}

export async function POST(request: Request): Promise<Response> {
  try {
    await verifyBearer(request);
  } catch {
    return errorResponse(401, "Unauthorized");
  }

  let body: FarmerPayoutBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const { batchTokenId, usdcAmount } = body;
  if (!batchTokenId || !usdcAmount) {
    return errorResponse(400, "Missing required fields: batchTokenId, usdcAmount");
  }

  try {
    const walletClient = getWalletClient();
    if (!walletClient) throw new Error("Wallet client not initialized");
    const publicClient = getPublicClient();
    if (!publicClient) throw new Error("Public client not initialized");

    // Verify the batch token exists and is loan-active
    const batchData = await publicClient.readContract({
      address: addresses.batchToken,
      abi: batchTokenAbi,
      functionName: "batchData",
      args: [BigInt(batchTokenId)],
    });

    const loanActive = batchData[7];
    if (!loanActive) {
      return errorResponse(400, "Batch token does not have an active loan");
    }

    // Call settle() — this handles protocol fee collection,
    // collateral unlock, and net transfer to farmer internally.
    const hash = await walletClient.writeContract({
      address: addresses.lendingVault,
      abi: lendingVaultAbi,
      functionName: "settle",
      args: [BigInt(batchTokenId), BigInt(usdcAmount)],
    });

    return Response.json({
      success: true,
      batchTokenId,
      usdcAmount: usdcAmount.toString(),
      transactionHash: hash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[farmer-payout]", message);
    return errorResponse(500, `Payout failed: ${message}`);
  }
}
