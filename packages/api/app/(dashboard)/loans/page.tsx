import { getDashboardStats, getAllLoans, formatUsdc, formatDate } from "@/lib/dashboard";
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
        <h2 className="text-2xl font-bold" style={{ color: "oklch(93% 0.006 60)" }}>
          Loans
        </h2>
        <p className="mt-1 text-sm" style={{ color: "oklch(42% 0.012 55)" }}>
          Active loan positions with LTV status
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "oklch(17% 0.008 55)", border: "1px solid oklch(24% 0.008 55)", transition: "transform 200ms, border-color 200ms, box-shadow 200ms" }}
        >
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "oklch(42% 0.012 55)" }}>
            Active Loans
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "oklch(72% 0.16 80)" }}>
            {stats?.activeLoans ?? loans.length}
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "oklch(17% 0.008 55)", border: "1px solid oklch(24% 0.008 55)", transition: "transform 200ms, border-color 200ms, box-shadow 200ms" }}
        >
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "oklch(42% 0.012 55)" }}>
            Total Outstanding
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "oklch(72% 0.16 80)" }}>
            {stats ? formatUsdc(stats.totalPrincipalUsdc) : "—"}
          </p>
        </div>
      </div>

      {/* Loans Table */}
      {loansWithLtv.length === 0 ? (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "oklch(17% 0.008 55)", border: "1px solid oklch(24% 0.008 55)" }}
        >
          <p className="text-sm" style={{ color: "oklch(42% 0.012 55)" }}>
            No active loans. Loans are created when batches are used as
            collateral.
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl shadow-sm"
          style={{ backgroundColor: "oklch(17% 0.008 55)", border: "1px solid oklch(24% 0.008 55)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="dash-table-header">
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
                  <tr key={l.batchTokenId} className="dash-table-row">
                    <td className="px-4 py-3">
                      <a
                        href={`/batches/${l.batchTokenId}`}
                        className="font-mono text-xs font-medium hover:underline"
                        style={{ color: "oklch(72% 0.16 80)" }}
                      >
                        #{l.batchTokenId}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <a
                        href={`/farmers/${l.farmerWallet}`}
                        className="hover:underline"
                        style={{ color: "oklch(72% 0.16 80)" }}
                      >
                        {l.farmerWallet.slice(0, 6)}...
                        {l.farmerWallet.slice(-4)}
                      </a>
                    </td>
                    <td className="px-4 py-3" style={{ color: "oklch(93% 0.006 60)" }}>
                      {formatUsdc(l.principalUsdc)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "oklch(93% 0.006 60)" }}>
                      {formatUsdc(l.interestUsdc)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "oklch(68% 0.01 58)" }}>
                      {formatDate(l.originatedAt)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "oklch(68% 0.01 58)" }}>
                      {formatDate(l.expiresAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {l.ltvBps !== undefined && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            l.ltvBps >= 10000
                              ? "bg-risk-critical/10 text-risk-critical"
                              : l.ltvBps >= 8000
                                ? "bg-risk-warning/10 text-risk-warning"
                                : "bg-risk-healthy/10 text-risk-healthy"
                          }`}
                        >
                          {l.ltvBps >= 10000 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="h-3 w-3"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                              />
                            </svg>
                          )}
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
      <div
        className="flex flex-wrap items-center gap-4 rounded-xl px-5 py-3 text-xs"
        style={{ backgroundColor: "oklch(17% 0.008 55)", border: "1px solid oklch(24% 0.008 55)", color: "oklch(55% 0.01 55)" }}
      >
        <span className="font-medium" style={{ color: "oklch(80% 0.005 60)" }}>LTV Risk:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-risk-healthy" />
          &lt; 80% — Healthy
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-risk-warning" />
          80–100% — Warning
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-risk-critical" />
          &gt; 100% — Critical
        </div>
      </div>
    </div>
  );
}
