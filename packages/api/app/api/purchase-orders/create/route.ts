import { getWalletClient, getPublicClient } from "@/lib/mantle";
import { addresses, purchaseOrderAbi, batchTokenAbi } from "@/lib/contracts";
import { verifyBearer, errorResponse } from "@/api/_lib/auth";

interface CreatePoBody {
  batchTokenId: number;
  buyerWallet: `0x${string}`;
  buyerOrganisation: string;
  agreedPriceUsdc: string;
}

/**
 * POST /api/purchase-orders/create
 *
 * Creates a purchase order commitment on-chain via PurchaseOrder.createPurchaseOrder().
 * Requires Bearer JWT (any valid role).
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await verifyBearer(request);
  } catch {
    return errorResponse(401, "Unauthorized");
  }

  let body: CreatePoBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const { batchTokenId, buyerWallet, buyerOrganisation, agreedPriceUsdc } = body;

  if (!batchTokenId || !buyerWallet || !buyerOrganisation || !agreedPriceUsdc) {
    return errorResponse(400, "Missing required fields");
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

    const agreedPriceWei = BigInt(agreedPriceUsdc);

    const hash = await walletClient.writeContract({
      address: addresses.purchaseOrder,
      abi: purchaseOrderAbi,
      functionName: "createPurchaseOrder",
      args: [BigInt(batchTokenId), buyerWallet, buyerOrganisation, agreedPriceWei],
    });

    // Read the next order ID to return (it was incremented)
    const nextId = await publicClient.readContract({
      address: addresses.purchaseOrder,
      abi: purchaseOrderAbi,
      functionName: "nextOrderId",
    });

    return Response.json({
      success: true,
      orderId: Number(nextId) - 1,
      batchTokenId,
      transactionHash: hash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[purchase-orders/create]", message);
    return errorResponse(500, `Failed to create purchase order: ${message}`);
  }
}
