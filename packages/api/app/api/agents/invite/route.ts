import { keccak256, toBytes } from "viem";
import { getWalletClient, getPublicClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi, identityRegistryAbi } from "@/lib/contracts";
import { verifyBearer, errorResponse } from "@/api/_lib/auth";

interface InviteBody {
  cooperativeWallet: `0x${string}`;
  agentWallet: `0x${string}`;
}

const AGENT_ROLE_HASH = keccak256(toBytes("AGENT_ROLE"));

/**
 * POST /api/agents/invite
 *
 * Grants AGENT_ROLE to a field operator wallet under a cooperative.
 * Requires Bearer JWT with COOP_ROLE matching the cooperative wallet.
 * Enforces agent cap: max(3, ceil(farmerCount / 50)).
 *
 * Body:
 *   cooperativeWallet — the cooperative that holds COOP_ROLE
 *   agentWallet       — the field operator to receive AGENT_ROLE
 */
export async function POST(request: Request): Promise<Response> {
  let auth: { role: string; wallet: `0x${string}` };
  try {
    auth = await verifyBearer(request);
  } catch {
    return errorResponse(401, "Unauthorized");
  }

  let body: InviteBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const { cooperativeWallet, agentWallet } = body;

  if (!cooperativeWallet || !agentWallet) {
    return errorResponse(400, "Missing required fields: cooperativeWallet, agentWallet");
  }

  if (auth.wallet.toLowerCase() !== cooperativeWallet.toLowerCase()) {
    return errorResponse(403, "JWT wallet does not match cooperativeWallet");
  }

  if (auth.role !== "COOP_ROLE") {
    return errorResponse(403, "Caller does not have COOP_ROLE");
  }

  try {
    const publicClient = getPublicClient();
    if (!publicClient) throw new Error("Public client not initialized");

    const farmerCount = await publicClient.readContract({
      address: addresses.farmerRegistry,
      abi: farmerRegistryAbi,
      functionName: "getFarmerCount",
      args: [cooperativeWallet],
    });

    const maxAgents = Math.max(3, Math.ceil(Number(farmerCount) / 50));

    const walletClient = getWalletClient();
    if (!walletClient) throw new Error("Wallet client not initialized");

    const hash = await walletClient.writeContract({
      address: addresses.farmerRegistry,
      abi: farmerRegistryAbi,
      functionName: "grantRole",
      args: [AGENT_ROLE_HASH, agentWallet],
    });

    // Mint ERC-8004 identity NFT to the agent wallet
    const agentId = await walletClient.writeContract({
      address: addresses.identityRegistry,
      abi: identityRegistryAbi,
      functionName: "registerFor",
      args: [agentWallet],
    });

    return Response.json({
      success: true,
      cooperativeWallet,
      agentWallet,
      transactionHash: hash,
      erc8004AgentId: agentId.toString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[agents/invite]", message);
    return errorResponse(500, `Invitation failed: ${message}`);
  }
}
