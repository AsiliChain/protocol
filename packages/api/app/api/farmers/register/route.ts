import { getWalletClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi } from "@/lib/contracts";
import { verifyBearer, errorResponse } from "@/api/_lib/auth";

interface RegisterBody {
  farmerWallet: `0x${string}`;
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

  const { farmerWallet, maaifFarmerId, cooperativeWallet, farmBoundaryIpfsCid, farmAreaHectares, gfwDeforestationFree, nationalId, farmerName, phoneNumber } = body;

  if (!farmerWallet || !maaifFarmerId || !cooperativeWallet || !farmBoundaryIpfsCid || !nationalId || !farmerName || !phoneNumber) {
    return errorResponse(400, "Missing required fields: farmerWallet, maaifFarmerId, cooperativeWallet, farmBoundaryIpfsCid, nationalId, farmerName, phoneNumber");
  }

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
