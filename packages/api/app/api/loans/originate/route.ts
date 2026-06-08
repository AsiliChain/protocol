import { getWalletClient, getPublicClient } from "@/lib/mantle";
import { addresses, lendingVaultAbi, batchTokenAbi } from "@/lib/contracts";
import { verifyBearer, errorResponse } from "@/api/_lib/auth";

interface OriginateBody {
  batchTokenId: number;
  farmerWallet: `0x${string}`;
}

/**
 * POST /api/loans/originate
 *
 * Originates a loan against a batch token via LendingVault.originate().
 * Requires Bearer JWT with VAULT_ROLE or MULTISIG_ROLE.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await verifyBearer(request);
  } catch {
    return errorResponse(401, "Unauthorized");
  }

  let body: OriginateBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const { batchTokenId, farmerWallet } = body;

  if (!batchTokenId || !farmerWallet) {
    return errorResponse(400, "Missing required fields: batchTokenId, farmerWallet");
  }

  try {
    const publicClient = getPublicClient();
    if (!publicClient) throw new Error("Public client not initialized");

    // Verify the batch exists
    const batch = await publicClient.readContract({
      address: addresses.batchToken,
      abi: batchTokenAbi,
      functionName: "batchData",
      args: [BigInt(batchTokenId)],
    });
    if (!batch) {
      return errorResponse(404, "Batch token not found");
    }

    const walletClient = getWalletClient();
    if (!walletClient) throw new Error("Wallet client not initialized");

    const hash = await walletClient.writeContract({
      address: addresses.lendingVault,
      abi: lendingVaultAbi,
      functionName: "originate",
      args: [BigInt(batchTokenId), farmerWallet],
    });

    // Return basic loan info
    const loan = await publicClient.readContract({
      address: addresses.lendingVault,
      abi: lendingVaultAbi,
      functionName: "getLoan",
      args: [BigInt(batchTokenId)],
    });

    return Response.json({
      success: true,
      batchTokenId,
      farmerWallet,
      principalUsdc: loan[2].toString(),
      interestUsdc: loan[3].toString(),
      transactionHash: hash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[loans/originate]", message);
    return errorResponse(500, `Loan origination failed: ${message}`);
  }
}
