import { getPublicClient } from "@/lib/mantle";
import { addresses, creditScoreAbi } from "@/lib/contracts";
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

    const score = await publicClient.readContract({
      address: addresses.creditScore,
      abi: creditScoreAbi,
      functionName: "getScore",
      args: [farmerWallet],
    });

    const [maxLoanUsdc, ltvBasisPoints] = await publicClient.readContract({
      address: addresses.creditScore,
      abi: creditScoreAbi,
      functionName: "getLtvTier",
      args: [farmerWallet],
    });

    return Response.json({
      farmerWallet,
      score: score.toString(),
      maxLoanUsdc: maxLoanUsdc.toString(),
      ltvBasisPoints: ltvBasisPoints.toString(),
      ltvPercent: Number(ltvBasisPoints) / 100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[credit-score]", message);
    return errorResponse(500, message);
  }
}
