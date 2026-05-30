import { getWalletClient } from "@/lib/mantle";
import { addresses, lendingVaultAbi } from "@/lib/contracts";
import { verifyBearer, errorResponse } from "@/api/_lib/auth";

interface MfiDepositBody {
  amount: number; // USDC with 6 decimals
}

export async function POST(request: Request): Promise<Response> {
  try {
    await verifyBearer(request);
  } catch {
    return errorResponse(401, "Unauthorized");
  }

  let body: MfiDepositBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const { amount } = body;
  if (!amount || amount <= 0) {
    return errorResponse(400, "amount must be positive (USDC with 6 decimals)");
  }

  try {
    const walletClient = getWalletClient();
    if (!walletClient) throw new Error("Wallet client not initialized");

    const hash = await walletClient.writeContract({
      address: addresses.lendingVault,
      abi: lendingVaultAbi,
      functionName: "deposit",
      args: [BigInt(amount)],
    });

    return Response.json({
      success: true,
      amount: amount.toString(),
      transactionHash: hash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[mfi-deposit]", message);
    return errorResponse(500, `Deposit failed: ${message}`);
  }
}
