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
          <h2 className="text-2xl font-bold text-navy-900">Batches</h2>
          <p className="mt-1 text-sm text-navy-400">
            {stats !== null
              ? `${stats.totalBatches} total batches`
              : "Coffee batch lifecycle"}
          </p>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="rounded-xl border border-navy-200 bg-white p-6">
          <p className="text-sm text-navy-400">No batches recorded yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50/50 text-xs font-medium uppercase tracking-wide text-navy-400">
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
                  className="border-b border-navy-50 transition-colors hover:bg-navy-50/50"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    <a
                      href={`/batches/${b.tokenId}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      #{b.tokenId}
                    </a>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-navy-600">
                    {b.batchId.slice(0, 12)}...
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-navy-600">
                    <a
                      href={`/farmers/${b.farmerWallet}`}
                      className="hover:text-brand-600 hover:underline"
                    >
                      {b.farmerWallet.slice(0, 6)}...{b.farmerWallet.slice(-4)}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-navy-900">
                    {b.weightKg.toString()} kg
                  </td>
                  <td className="px-4 py-3 text-navy-900">{b.grade}</td>
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
                      <span className="text-navy-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
