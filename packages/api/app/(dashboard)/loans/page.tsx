import { getDashboardStats, getAllLoans, formatUsdc, formatDate, ltvColor } from "@/lib/dashboard";
import { getPublicClient } from "@/lib/mantle";
import { addresses, lendingVaultAbi, batchTokenAbi } from "@/lib/contracts";

export default async function LoansPage() {
  const [stats, loans] = await Promise.all([
    getDashboardStats().catch(() => null),
    getAllLoans().catch(() => []),
  ]);

  // Compute LTV for each loan
  const publicClient = getPublicClient();
  let pricePerKg = 0n;
  try {
    pricePerKg = await publicClient.readContract({
      address: addresses.lendingVault,
      abi: lendingVaultAbi,
      functionName: "pricePerKgBase",
    });
  } catch {
    // use default
  }

  const loansWithLtv = await Promise.all(
    loans.map(async (l) => {
      try {
        const batch = await publicClient.readContract({
          address: addresses.batchToken,
          abi: batchTokenAbi,
          functionName: "batchData",
          args: [BigInt(l.batchTokenId)],
        });
        const weightKg = batch[3];
        const collateralValue = weightKg * pricePerKg;
        const ltvBps =
          collateralValue > 0n
            ? Number((l.principalUsdc * 10000n) / collateralValue)
            : 0;
        return { ...l, ltvBps };
      } catch {
        return { ...l, ltvBps: 0 };
      }
    }),
  );

  // Sort by LTV descending (most at-risk first)
  loansWithLtv.sort((a, b) => (b.ltvBps ?? 0) - (a.ltvBps ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Loans</h2>
        <p className="mt-1 text-sm text-navy-400">
          Active loan positions with LTV status
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-navy-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
            Active Loans
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-600">
            {stats?.activeLoans ?? loans.length}
          </p>
        </div>
        <div className="rounded-xl border border-navy-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
            Total Outstanding
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-600">
            {stats ? formatUsdc(stats.totalPrincipalUsdc) : "—"}
          </p>
        </div>
      </div>

      {/* Loans Table */}
      {loansWithLtv.length === 0 ? (
        <div className="rounded-xl border border-navy-200 bg-white p-6">
          <p className="text-sm text-navy-400">
            No active loans. Loans are created when batches are used as
            collateral.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 bg-navy-50/50 text-xs font-medium uppercase tracking-wide text-navy-400">
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Farmer</th>
                  <th className="px-4 py-3">Principal</th>
                  <th className="px-4 py-3">Interest</th>
                  <th className="px-4 py-3">Originated</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3 text-right">LTV</th>
                </tr>
              </thead>
              <tbody>
                {loansWithLtv.map((l) => (
                  <tr
                    key={l.batchTokenId}
                    className="border-b border-navy-50 transition-colors hover:bg-navy-50/50"
                  >
                    <td className="px-4 py-3">
                      <a
                        href={`/batches/${l.batchTokenId}`}
                        className="font-mono text-xs font-medium text-brand-600 hover:underline"
                      >
                        #{l.batchTokenId}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-navy-600">
                      <a
                        href={`/farmers/${l.farmerWallet}`}
                        className="hover:text-brand-600 hover:underline"
                      >
                        {l.farmerWallet.slice(0, 6)}...
                        {l.farmerWallet.slice(-4)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-navy-900">
                      {formatUsdc(l.principalUsdc)}
                    </td>
                    <td className="px-4 py-3 text-navy-900">
                      {formatUsdc(l.interestUsdc)}
                    </td>
                    <td className="px-4 py-3 text-navy-600">
                      {formatDate(l.originatedAt)}
                    </td>
                    <td className="px-4 py-3 text-navy-600">
                      {formatDate(l.expiresAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {l.ltvBps !== undefined && (
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${ltvColor(l.ltvBps)}`}
                        >
                          {l.ltvBps >= 10000 && "⚠ "}
                          {(l.ltvBps / 100).toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-navy-400">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-risk-healthy" />
          &lt; 80% LTV — Healthy
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-risk-warning" />
          80–100% LTV — Warning
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-risk-critical" />
          &gt; 100% LTV — Critical
        </div>
      </div>
    </div>
  );
}
