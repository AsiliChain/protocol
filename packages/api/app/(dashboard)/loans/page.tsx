import Link from "next/link";
import { getDashboardStats, getAllLoans, formatUsdc, formatDate } from "@/lib/dashboard";
export const dynamic = "force-dynamic";
import { getPublicClient } from "@/lib/mantle";
import { addresses, lendingVaultAbi, batchTokenAbi } from "@/lib/contracts";

const RISK_TIERS = [
  { key: "healthy",  label: "Healthy",  maxBps: 8000,  color: "oklch(62% 0.17 155)" },
  { key: "warning",  label: "Warning",  maxBps: 10000, color: "oklch(70% 0.15 75)" },
  { key: "critical", label: "Critical", maxBps: 99999, color: "oklch(55% 0.2 25)" },
] as const;

function truncateAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

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

  // Count per risk tier
  const tierCounts: Record<string, number> = { healthy: 0, warning: 0, critical: 0 };
  for (const l of loansWithLtv) {
    const bps = l.ltvBps ?? 0;
    if (bps >= 10000) tierCounts.critical += 1;
    else if (bps >= 8000) tierCounts.warning += 1;
    else tierCounts.healthy += 1;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "oklch(18% 0.01 60)" }}>
            Loans
          </h2>
          <p className="mt-1 text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
            {loansWithLtv.length > 0
              ? `${loansWithLtv.length} active — ${formatUsdc(
                  loansWithLtv.reduce((s, l) => s + l.principalUsdc, 0n),
                )} USDC outstanding`
              : "Active loan positions with LTV status"}
          </p>
        </div>
        <Link
          href="/batches"
          className="dash-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          View Batches
        </Link>
      </div>

      {/* Pipeline strip — LTV risk tiers */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)" }}
      >
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          }}
        >
          {RISK_TIERS.map((tier) => {
            const count = tierCounts[tier.key];
            return (
              <div
                key={tier.key}
                className="flex flex-col items-center rounded-lg px-2 py-2.5 text-center"
                style={{
                  backgroundColor: `${tier.color}1A`,
                  opacity: count === 0 ? 0.5 : 1,
                }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tier.color }}>
                  {tier.label}
                </span>
                <span className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: "oklch(18% 0.01 60)" }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loans table */}
      {loansWithLtv.length === 0 ? (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)" }}
        >
          <p className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
            No active loans. Loans are created when batches are used as collateral.
          </p>
          <p className="mt-3 text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
            Loans are originated automatically when a batch reaches EXPORTED stage.{" "}
            <Link
              href="/batches"
              className="font-medium transition-colors hover:underline"
              style={{ color: "oklch(72% 0.16 80)" }}
            >
              Advance a batch to EXPORTED
            </Link>{" "}
            from the Batches page.
          </p>
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
                {loansWithLtv.map((l) => {
                  const tier =
                    (l.ltvBps ?? 0) >= 10000
                      ? RISK_TIERS[2]
                      : (l.ltvBps ?? 0) >= 8000
                        ? RISK_TIERS[1]
                        : RISK_TIERS[0];
                  return (
                    <tr key={l.batchTokenId} className="dash-table-row transition-colors">
                      <td className="px-4 py-3">
                        <a
                          href={`/batches/${l.batchTokenId}`}
                          className="font-mono text-xs font-medium hover:underline"
                          style={{ color: "oklch(72% 0.16 80)" }}
                        >
                          #{l.batchTokenId}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/farmers/${l.farmerWallet}`}
                          className="font-mono text-xs hover:underline"
                          style={{ color: "oklch(72% 0.16 80)" }}
                        >
                          {truncateAddress(l.farmerWallet)}
                        </a>
                      </td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "oklch(18% 0.01 60)" }}>
                        {formatUsdc(l.principalUsdc)}
                      </td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "oklch(55% 0.012 60)" }}>
                        {formatUsdc(l.interestUsdc)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "oklch(68% 0.01 58)" }}>
                        {formatDate(l.originatedAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "oklch(68% 0.01 58)" }}>
                        {formatDate(l.expiresAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: `${tier.color}1A`,
                            color: tier.color,
                          }}
                        >
                          {(l.ltvBps ?? 0) >= 10000 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="h-3 w-3"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                          )}
                          {(l.ltvBps ?? 0) / 100}%
                        </span>
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
