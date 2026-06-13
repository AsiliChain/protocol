import { keccak256, toBytes } from "viem";
import { getWalletClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi } from "@/lib/contracts";
import { verifyBearer, errorResponse } from "@/api/_lib/auth";

function addressFromNin(nin: string): `0x${string}` {
  const hash = keccak256(toBytes(`asilichain:${nin}`));
  return `0x${hash.slice(26)}` as `0x${string}`;
}

interface RegisterBody {
  maaifFarmerId: string;
  cooperativeWallet: `0x${string}`;
  farmBoundaryIpfsCid: string; // hex bytes32
  farmAreaHectares: number;
  gfwDeforestationFree: boolean;
  nationalId: string;
  farmerName: string;
  phoneNumber: string;
}

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

  const { maaifFarmerId, cooperativeWallet, farmBoundaryIpfsCid, farmAreaHectares, gfwDeforestationFree, nationalId, farmerName, phoneNumber } = body;

  if (!maaifFarmerId || !cooperativeWallet || !farmBoundaryIpfsCid || !nationalId || !farmerName || !phoneNumber) {
    return errorResponse(400, "Missing required fields: maaifFarmerId, cooperativeWallet, farmBoundaryIpfsCid, nationalId, farmerName, phoneNumber");
  }

  // Derive wallet from NIN — matches Solidity: keccak256(toBytes("asilichain:{nin}"))
  const farmerWallet = addressFromNin(nationalId);

  try {
    const walletClient = getWalletClient();
    if (!walletClient) throw new Error("Wallet client not initialized");

    const hash = await walletClient.writeContract({
      address: addresses.farmerRegistry,
      abi: farmerRegistryAbi,
      functionName: "registerFarmer",
      args: [
        farmerWallet,
        maaifFarmerId,
        cooperativeWallet,
        farmBoundaryIpfsCid as `0x${string}`,
        BigInt(farmAreaHectares),
        gfwDeforestationFree,
        nationalId,
        farmerName,
        phoneNumber,
      ],
    });

    // Fire-and-forget: trigger anomaly detector to scan EUDR compliance
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    fetch(`${baseUrl}/api/agents/anomaly-detector`, { method: "POST" }).catch(() => {});

    return Response.json({
      success: true,
      farmerWallet,
      transactionHash: hash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[farmers/register]", message);
    return errorResponse(500, `Registration failed: ${message}`);
  }
}
