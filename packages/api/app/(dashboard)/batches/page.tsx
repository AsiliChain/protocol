import Link from "next/link";
import { getPublicClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi } from "@/lib/contracts";
import { getRecentBatches, stageLabel, stageColor, formatUsdc } from "@/lib/dashboard";
import type { BatchSummary } from "@/lib/dashboard";
export const dynamic = "force-dynamic";

const STAGE_ORDER = ["DELIVERED","GRADED","MILLED","WAREHOUSED","COMMITTED","EXPORTED","SETTLED"] as const;

function truncateAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function daysSinceMint(mintTs: number | null): string {
  if (!mintTs) return "—";
  const elapsed = Math.floor((Date.now() / 1000) - mintTs) / 86400;
  if (elapsed < 1) return "Today";
  if (elapsed < 2) return "1 day";
  return `${Math.floor(elapsed)} days`;
}

async function enrichWithFarmerNames(
  batches: BatchSummary[],
): Promise<Map<string, { name: string; wallet: string }>> {
  const client = getPublicClient();
  const uniqueWallets = [...new Set(batches.map((b) => b.farmerWallet.toLowerCase()))];
  if (uniqueWallets.length === 0) return new Map();

  const contracts = uniqueWallets.map((w) => ({
    address: addresses.farmerRegistry as `0x${string}`,
    abi: farmerRegistryAbi,
    functionName: "getFarmer",
    args: [`0x${w.slice(2)}` as `0x${string}`],
  }));

  const results = await client.multicall({ contracts, allowFailure: true });
  const map = new Map<string, { name: string; wallet: string }>();

  for (let i = 0; i < uniqueWallets.length; i++) {
    const r = results[i];
    if (r.status === "success") {
      const f = r.result as readonly unknown[];
      map.set(uniqueWallets[i], {
        name: (f[8] as string) ?? "Unknown",
        wallet: uniqueWallets[i],
      });
    } else {
      map.set(uniqueWallets[i], { name: "Unknown", wallet: uniqueWallets[i] });
    }
  }
  return map;
}

export default async function BatchesPage() {
  const batches = await getRecentBatches(50).catch(() => [] as BatchSummary[]);
  const farmerMap = await enrichWithFarmerNames(batches);

  // Group by stage
  const grouped = new Map<string, BatchSummary[]>();
  for (const s of STAGE_ORDER) grouped.set(s, []);
  for (const b of batches) {
    const label = stageLabel(b.stage);
    const group = grouped.get(label);
    if (group) group.push(b);
  }

  // Stage accent colors
  const stageAccents: Record<string, string> = {
    DELIVERED: "oklch(62% 0.17 210)",     // blue
    GRADED:    "oklch(62% 0.17 280)",     // purple
    MILLED:    "oklch(62% 0.17 240)",     // indigo
    WAREHOUSED: "oklch(72% 0.16 80)",     // gold
    COMMITTED: "oklch(62% 0.17 35)",      // orange
    EXPORTED:  "oklch(55% 0.2 340)",      // pink
    SETTLED:   "oklch(62% 0.17 155)",     // green
  };

  const hasBatches = batches.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "oklch(18% 0.01 60)" }}>
            Batches
          </h2>
          <p className="mt-1 text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
            {hasBatches ? `${batches.length} total — grouped by supply chain stage` : "Coffee batch lifecycle"}
          </p>
        </div>
        <Link
          href="/field-ops"
          className="dash-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Record Delivery
        </Link>
      </div>

      {!hasBatches ? (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)" }}
        >
          <p className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>No batches recorded yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {STAGE_ORDER.map((stageName) => {
            const stageBatches = grouped.get(stageName) ?? [];
            const accent = stageAccents[stageName] ?? "oklch(72% 0.16 80)";

            return (
              <div
                key={stageName}
                className="rounded-xl overflow-hidden"
                style={{
                  backgroundColor: "oklch(100% 0 0)",
                  border: "1px solid oklch(88% 0.006 60)",
                  borderLeft: `3px solid ${accent}`,
                }}
              >
                {/* Stage header */}
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{
                    borderBottom: stageBatches.length > 0 ? "1px solid oklch(88% 0.006 60)" : "none",
                    backgroundColor: "oklch(98% 0.004 85)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold" style={{ color: accent }}>
                      {stageName}
                    </span>
                    <span
                      className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{
                        backgroundColor: `${accent}1A`,
                        color: accent,
                        minWidth: "1.25rem",
                      }}
                    >
                      {stageBatches.length}
                    </span>
                  </div>
                  {stageBatches.length > 0 && (
                    <span className="text-xs" style={{ color: "oklch(55% 0.012 60)" }}>
                      {stageBatches.reduce((sum, b) => sum + Number(b.weightKg), 0).toLocaleString()} kg total
                    </span>
                  )}
                </div>

                {/* Stage body */}
                {stageBatches.length === 0 ? (
                  <div className="px-5 py-4">
                    <p className="text-xs italic" style={{ color: "oklch(68% 0.01 58)" }}>
                      No batches at this stage
                    </p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "oklch(94% 0.004 60)" }}>
                    {stageBatches.map((b) => {
                      const farmer = farmerMap.get(b.farmerWallet.toLowerCase());
                      const farmerName = farmer?.name ?? truncateAddress(b.farmerWallet);
                      return (
                        <Link
                          key={b.tokenId}
                          href={`/batches/${b.tokenId}`}
                          className="flex items-center gap-4 px-5 py-3 text-sm transition-colors hover:bg-[oklch(97%_0.006_85)]"
                          style={{ color: "oklch(18% 0.01 60)" }}
                        >
                          {/* Token ID */}
                          <span className="font-mono text-xs font-medium shrink-0 w-12" style={{ color: "oklch(72% 0.16 80)" }}>
                            #{b.tokenId}
                          </span>

                          {/* Batch ID */}
                          <span className="font-mono text-xs truncate shrink min-w-0 w-40" style={{ color: "oklch(55% 0.012 60)" }}>
                            {b.batchId}
                          </span>

                          {/* Farmer */}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">
                              {farmerName}
                            </span>
                            <span className="text-[11px] font-mono" style={{ color: "oklch(68% 0.01 58)" }}>
                              {truncateAddress(b.farmerWallet)}
                            </span>
                          </div>

                          {/* Weight */}
                          <span className="text-sm tabular-nums shrink-0 w-20 text-right" style={{ color: "oklch(40% 0.01 60)" }}>
                            {Number(b.weightKg).toLocaleString()} kg
                          </span>

                          {/* Grade */}
                          <span className="text-sm capitalize shrink-0 w-16 text-center" style={{ color: "oklch(55% 0.012 60)" }}>
                            {b.grade || "—"}
                          </span>

                          {/* Loan */}
                          <span className="shrink-0 w-16 text-center">
                            {b.loanActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: "oklch(62% 0.17 155 / 0.12)", color: "oklch(50% 0.16 155)" }}>
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "oklch(50% 0.16 155)" }} />
                                Loan
                              </span>
                            ) : (
                              <span className="text-[11px]" style={{ color: "oklch(68% 0.01 58)" }}>—</span>
                            )}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
