import Link from "next/link";
import { getPublicClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi } from "@/lib/contracts";
import { getRecentBatches, stageLabel, type BatchSummary } from "@/lib/dashboard";
export const dynamic = "force-dynamic";

const STAGE_ORDER = ["DELIVERED","GRADED","MILLED","WAREHOUSED","COMMITTED","EXPORTED","SETTLED"] as const;

const STAGE_ACCENTS: Record<string, string> = {
  DELIVERED:  "oklch(62% 0.17 210)",
  GRADED:     "oklch(62% 0.17 280)",
  MILLED:     "oklch(62% 0.17 240)",
  WAREHOUSED: "oklch(72% 0.16 80)",
  COMMITTED:  "oklch(62% 0.17 35)",
  EXPORTED:   "oklch(55% 0.2 340)",
  SETTLED:    "oklch(62% 0.17 155)",
};

function truncateAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function enrichWithFarmerNames(
  batches: BatchSummary[],
): Promise<Map<string, { name: string; wallet: string }>> {
  const client = getPublicClient();
  const uniqueWallets = [...new Set(batches.map((b) => b.farmerWallet.toLowerCase()))];
  if (uniqueWallets.length === 0) return new Map();

  const farmerPromises = uniqueWallets.map((w) =>
    client.readContract({
      address: addresses.farmerRegistry as `0x${string}`,
      abi: farmerRegistryAbi,
      functionName: "farmers",
      args: [`0x${w.slice(2)}` as `0x${string}`],
    })
      .then((r) => r as readonly unknown[])
      .catch(() => null),
  );

  const results = await Promise.all(farmerPromises);
  const map = new Map<string, { name: string; wallet: string }>();

  for (let i = 0; i < uniqueWallets.length; i++) {
    const f = results[i];
    if (f) {
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

  // Count per stage
  const stageCounts: Record<string, number> = {};
  for (const s of STAGE_ORDER) stageCounts[s] = 0;
  for (const b of batches) {
    const label = stageLabel(b.stage);
    stageCounts[label] = (stageCounts[label] ?? 0) + 1;
  }

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
            {hasBatches ? `${batches.length} total` : "Coffee batch lifecycle"}
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

      {/* Pipeline strip — one cell per stage */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)" }}
      >
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
          }}
        >
          {STAGE_ORDER.map((stageName) => {
            const count = stageCounts[stageName] ?? 0;
            const accent = STAGE_ACCENTS[stageName] ?? "oklch(72% 0.16 80)";
            return (
              <div
                key={stageName}
                className="flex flex-col items-center rounded-lg px-2 py-2.5 text-center"
                style={{
                  backgroundColor: `${accent}1A`,
                  opacity: count === 0 ? 0.5 : 1,
                }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
                  {stageName}
                </span>
                <span className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: "oklch(18% 0.01 60)" }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batches table */}
      {!hasBatches ? (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)" }}
        >
          <p className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>No batches recorded yet</p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl"
          style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="dash-table-header text-xs font-medium uppercase tracking-wide">
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Farmer</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Loan</th>
                </tr>
              </thead>
              <tbody>
                  {batches.map((b) => {
                  const zeroAddr = "0x" + "0".repeat(40);
                  const isZeroAddress = b.farmerWallet.toLowerCase() === zeroAddr;
                  const farmer = farmerMap.get(b.farmerWallet.toLowerCase());
                  const farmerName = isZeroAddress
                    ? "—"
                    : (farmer?.name ?? truncateAddress(b.farmerWallet));
                  const stageName = stageLabel(b.stage);
                  const accent = STAGE_ACCENTS[stageName] ?? "oklch(72% 0.16 80)";
                  return (
                    <tr key={b.tokenId} className="dash-table-row transition-colors">
                      <td className="px-4 py-3">
                        <a
                          href={`/batches/${b.tokenId}`}
                          className="font-mono text-xs font-medium hover:underline"
                          style={{ color: "oklch(72% 0.16 80)" }}
                        >
                          #{b.tokenId}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        {isZeroAddress ? (
                          <span className="text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
                            No farmer assigned
                          </span>
                        ) : (
                          <>
                            <a
                              href={`/farmers/${b.farmerWallet}`}
                              className="hover:underline"
                              style={{ color: "oklch(18% 0.01 60)" }}
                            >
                              <span className="text-sm font-medium">{farmerName}</span>
                            </a>
                            <br />
                            <span className="text-[11px] font-mono" style={{ color: "oklch(68% 0.01 58)" }}>
                              {truncateAddress(b.farmerWallet)}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "oklch(40% 0.01 60)" }}>
                        {Number(b.weightKg).toLocaleString()} kg
                      </td>
                      <td className="px-4 py-3 capitalize" style={{ color: "oklch(55% 0.012 60)" }}>
                        {b.grade || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: `${accent}1A`,
                            color: accent,
                          }}
                        >
                          {stageName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.loanActive ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: "oklch(62% 0.17 155 / 0.12)", color: "oklch(50% 0.16 155)" }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "oklch(50% 0.16 155)" }} />
                            Active
                          </span>
                        ) : (
                          <span style={{ color: "oklch(55% 0.012 60)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
