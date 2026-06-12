import { keccak256, toBytes } from "viem";
import { getPublicClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi } from "@/lib/contracts";

function addressFromNin(nin: string): `0x${string}` {
  const hash = keccak256(toBytes(`asilichain:${nin}`));
  return `0x${hash.slice(26)}` as `0x${string}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nin = searchParams.get("nin");
  if (!nin) {
    return Response.json({ error: "Missing nin parameter" }, { status: 400 });
  }

  const wallet = addressFromNin(nin);
  const publicClient = getPublicClient();

  try {
    const [isRegistered, farmer] = await Promise.all([
      publicClient.readContract({
        address: addresses.farmerRegistry,
        abi: farmerRegistryAbi,
        functionName: "isRegistered",
        args: [wallet],
      }),
      publicClient
        .readContract({
          address: addresses.farmerRegistry,
          abi: farmerRegistryAbi,
          functionName: "getFarmer",
          args: [wallet],
        })
        .catch(() => null),
    ]);

    if (!isRegistered || !farmer) {
      return Response.json({
        registered: false,
        wallet,
        farmer: null,
      });
    }

    return Response.json({
      registered: true,
      wallet,
      farmer: {
        farmerName: farmer[8],
        nationalId: farmer[7],
        phoneNumber: farmer[9],
        cooperativeWallet: farmer[1],
        farmAreaHectares: farmer[3],
        gfwDeforestationFree: farmer[4],
        active: farmer[5],
      },
    });
  } catch (error) {
    return Response.json({ error: "Chain read failed" }, { status: 500 });
  }
}
