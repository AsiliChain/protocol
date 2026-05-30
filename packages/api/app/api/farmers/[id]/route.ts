import { getPublicClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi } from "@/lib/contracts";
import { errorResponse } from "@/api/_lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const farmerWallet = params.id as `0x${string}`;

  if (!farmerWallet || farmerWallet === "0x0") {
    return errorResponse(400, "Invalid farmer wallet address");
  }

  try {
    const publicClient = getPublicClient();
    if (!publicClient) throw new Error("Public client not initialized");

    const result = await publicClient.readContract({
      address: addresses.farmerRegistry,
      abi: farmerRegistryAbi,
      functionName: "getFarmer",
      args: [farmerWallet],
    });

    const [
      maaifFarmerId,
      cooperativeWallet,
      farmBoundaryIpfsCid,
      farmAreaHectares,
      gfwDeforestationFree,
      active,
      registrationTimestamp,
    ] = result;

    return Response.json({
      farmerWallet,
      maaifFarmerId,
      cooperativeWallet,
      farmBoundaryIpfsCid,
      farmAreaHectares: farmAreaHectares.toString(),
      gfwDeforestationFree,
      active,
      registrationTimestamp: Number(registrationTimestamp),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("not registered")) {
      return errorResponse(404, "Farmer not found");
    }
    console.error("[farmers/:id]", message);
    return errorResponse(500, message);
  }
}
