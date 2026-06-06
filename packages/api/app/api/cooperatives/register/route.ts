import { getWalletClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi } from "@/lib/contracts";
import { verifyBearer, errorResponse } from "@/api/_lib/auth";

interface RegisterBody {
  cooperativeWallet: `0x${string}`;
  name?: string;
}

/**
 * POST /api/cooperatives/register
 *
 * Grants COOP_ROLE to a cooperative wallet.
 * Requires Bearer JWT with MULTISIG_ROLE (protocol admin).
 *
 * Body:
 *   cooperativeWallet — the wallet to receive COOP_ROLE
 *   name (optional)    — human-readable cooperative name (off-chain, not stored on contract)
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await verifyBearer(request);
  } catch {
    return errorResponse(401, "Unauthorized");
  }

  let body: RegisterBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const { cooperativeWallet } = body;

  if (!cooperativeWallet) {
    return errorResponse(400, "Missing required field: cooperativeWallet");
  }

  try {
    const walletClient = getWalletClient();
    if (!walletClient) throw new Error("Wallet client not initialized");

    const COOP_ROLE = "0x95e368d1c144f87e3d0aaf929b0af48f3a2b7f206f7d56ac7f130a7adac69f2b";
    // ^^ keccak256("COOP_ROLE")

    const hash = await walletClient.writeContract({
      address: addresses.farmerRegistry,
      abi: farmerRegistryAbi,
      functionName: "grantRole",
      args: [COOP_ROLE as `0x${string}`, cooperativeWallet],
    });

    return Response.json({
      success: true,
      cooperativeWallet,
      transactionHash: hash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cooperatives/register]", message);
    return errorResponse(500, `Registration failed: ${message}`);
  }
}
