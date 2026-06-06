import { getDashboardStats, getRecentBatches, stageLabel, stageColor } from "@/lib/dashboard";

export default async function BatchesPage() {
  const [stats, batches] = await Promise.all([
    getDashboardStats().catch(() => null),
    getRecentBatches(50).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "oklch(93% 0.006 60)" }}>Batches</h2>
          <p className="mt-1 text-sm" style={{ color: "oklch(42% 0.012 55)" }}>
            {stats !== null
              ? `${stats.totalBatches} total batches`
              : "Coffee batch lifecycle"}
          </p>
        </div>
      </div>

      {batches.length === 0 ? (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "oklch(17% 0.008 55)", border: "1px solid oklch(24% 0.008 55)" }}
        >
          <p className="text-sm" style={{ color: "oklch(42% 0.012 55)" }}>No batches recorded yet</p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl shadow-sm"
          style={{ backgroundColor: "oklch(17% 0.008 55)", border: "1px solid oklch(24% 0.008 55)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="dash-table-header text-xs font-medium uppercase tracking-wide">
                  <th className="px-4 py-3">Token ID</th>
                  <th className="px-4 py-3">Batch ID</th>
                  <th className="px-4 py-3">Farmer</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Loan</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr
                    key={b.tokenId}
                    className="dash-table-row transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      <a
                        href={`/batches/${b.tokenId}`}
                        className="font-medium hover:underline"
                        style={{ color: "oklch(72% 0.16 80)" }}
                      >
                        #{b.tokenId}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "oklch(68% 0.01 58)" }}>
                      {b.batchId.slice(0, 12)}...
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <a
                        href={`/farmers/${b.farmerWallet}`}
                        className="hover:underline"
                        style={{ color: "oklch(72% 0.16 80)" }}
                      >
                        {b.farmerWallet.slice(0, 6)}...{b.farmerWallet.slice(-4)}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "oklch(80% 0.005 60)" }}>
                      {b.weightKg.toString()} kg
                    </td>
                    <td className="px-4 py-3 capitalize" style={{ color: "oklch(68% 0.01 58)" }}>{b.grade}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColor(b.stage)}`}
                      >
                        {stageLabel(b.stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {b.loanActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-risk-healthy/10 px-2.5 py-0.5 text-xs font-medium text-risk-healthy">
                          Active
                        </span>
                      ) : (
                        <span style={{ color: "oklch(35% 0.008 55)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
