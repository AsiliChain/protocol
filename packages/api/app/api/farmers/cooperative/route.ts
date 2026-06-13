import { getPublicClient } from "@/lib/mantle";
import { addresses, batchTokenAbi, farmerRegistryAbi } from "@/lib/contracts";
import { verifyBearer, errorResponse } from "@/api/_lib/auth";

interface FarmerRow {
  wallet: string;
  name: string;
  nationalId: string;
  phone: string;
  batchCount: number;
  totalWeightKg: number;
  gfwCompliant: boolean;
  active: boolean;
}

export async function GET(request: Request): Promise<Response> {
  try {
    await verifyBearer(request);
  } catch {
    return errorResponse(401, "Unauthorized");
  }

  try {
    const client = getPublicClient();
    if (!client) throw new Error("Public client not initialized");

    // 1. Read total token count
    const nextTokenId = await client.readContract({
      address: addresses.batchToken,
      abi: batchTokenAbi,
      functionName: "nextTokenId",
    });
    const maxTokens = Number(nextTokenId);

    // 2. Scan all batch tokens via multicall
    const contracts: { address: `0x${string}`; abi: typeof batchTokenAbi; functionName: string; args: readonly [bigint] }[] = [];
    for (let i = 1; i < maxTokens; i++) {
      contracts.push({ address: addresses.batchToken, abi: batchTokenAbi, functionName: "batchData", args: [BigInt(i)] });
    }

    const batchResults = await client.multicall({ contracts, allowFailure: true });

    // 3. Collect unique farmer wallets and aggregate per-farmer stats
    const farmerStats = new Map<string, { batchCount: number; totalWeightKg: bigint }>();
    for (const r of batchResults) {
      if (r.status !== "success") continue;
      const batch = r.result as readonly [string, string, string, bigint, string, bigint, string, string, bigint, boolean];
      const farmerWallet = batch[1].toLowerCase();
      if (farmerWallet === "0x0000000000000000000000000000000000000000") continue;
      const weight = batch[3];
      const existing = farmerStats.get(farmerWallet);
      if (existing) {
        existing.batchCount += 1;
        existing.totalWeightKg += weight;
      } else {
        farmerStats.set(farmerWallet, { batchCount: 1, totalWeightKg: weight });
      }
    }

    if (farmerStats.size === 0) {
      return Response.json({ farmers: [] });
    }

    // 4. Fetch farmer details for all unique wallets
    const farmerWallets = [...farmerStats.keys()].map(
      (w) => `0x${w.slice(2)}` as `0x${string}`,
    );
    const detailContracts = farmerWallets.map((w) => ({
      address: addresses.farmerRegistry,
      abi: farmerRegistryAbi,
      functionName: "getFarmer",
      args: [w],
    }));

    const detailResults = await client.multicall({ contracts: detailContracts, allowFailure: true });

    // 5. Build response
    const farmers: FarmerRow[] = [];
    for (let i = 0; i < farmerWallets.length; i++) {
      const r = detailResults[i];
      if (r.status !== "success") {
        farmers.push({
          wallet: farmerWallets[i],
          name: "Unknown",
          nationalId: "—",
          phone: "—",
          batchCount: farmerStats.get(farmerWallets[i].toLowerCase())?.batchCount ?? 0,
          totalWeightKg: Number(farmerStats.get(farmerWallets[i].toLowerCase())?.totalWeightKg ?? 0n),
          gfwCompliant: false,
          active: false,
        });
        continue;
      }
      const f = r.result as readonly unknown[];
      farmers.push({
        wallet: farmerWallets[i],
        name: (f[8] as string) ?? "Unknown",
        nationalId: (f[7] as string) ?? "—",
        phone: (f[9] as string) ?? "—",
        batchCount: farmerStats.get(farmerWallets[i].toLowerCase())?.batchCount ?? 0,
        totalWeightKg: Number(farmerStats.get(farmerWallets[i].toLowerCase())?.totalWeightKg ?? 0n),
        gfwCompliant: Boolean(f[4]),
        active: Boolean(f[5]),
      });
    }

    // Sort by name
    farmers.sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({ farmers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[farmers/cooperative]", message);
    return errorResponse(500, message);
  }
}
