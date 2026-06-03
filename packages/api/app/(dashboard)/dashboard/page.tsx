import {
  getDashboardStats,
  getRecentBatches,
  getAgentsIdentity,
  formatUsdc,
  stageLabel,
  stageColor,
} from "@/lib/dashboard";
import type { RiskMonitorReport } from "@/lib/agents/risk-monitor";

// ─── Helpers ──────────────────────────────────────────────

function truncateAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── Data Fetching ────────────────────────────────────────

async function fetchData() {
  const [stats, batches, agentsIdentity] = await Promise.all([
    getDashboardStats().catch(() => ({
      totalBatches: 0,
      activeLoans: 0,
      totalPrincipalUsdc: 0n,
    })),
    getRecentBatches(5).catch(
      () => [] as Awaited<ReturnType<typeof getRecentBatches>>,
    ),
    getAgentsIdentity().catch(
      () => [] as Awaited<ReturnType<typeof getAgentsIdentity>>,
    ),
  ]);

  let riskReport: RiskMonitorReport | null = null;
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const res = await fetch(`${base}/api/agents/risk-monitor`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      if (json.report) {
        riskReport = json.report as RiskMonitorReport;
      }
    }
  } catch {
    // risk monitor API unreachable — handled in UI
  }

  return { stats, batches, agentsIdentity, riskReport };
}

// ─── Page Component ───────────────────────────────────────

export default async function DashboardPage() {
  const { stats, batches, agentsIdentity, riskReport } = await fetchData();

  const portfolio = riskReport?.portfolio;
  const totalAssessed = portfolio
    ? portfolio.healthyCount + portfolio.warningCount + portfolio.criticalCount
    : 0;

  const healthyPct =
    totalAssessed > 0 ? (portfolio!.healthyCount / totalAssessed) * 100 : 0;
  const warningPct =
    totalAssessed > 0 ? (portfolio!.warningCount / totalAssessed) * 100 : 0;
  const criticalPct =
    totalAssessed > 0 ? (portfolio!.criticalCount / totalAssessed) * 100 : 0;

  const MANTLESCAN_TOKENHOLDER =
    "https://sepolia.mantlescan.org/address/0x62a6b58f8c3625F0c5f46D6C86A65595AA769C89?tab=tokenholder";

  return (
    <div className="space-y-6">
      {/* ── Stats Bar ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="📦" value={stats.totalBatches} label="Total Batches" />
        <StatCard icon="💰" value={stats.activeLoans} label="Active Loans" />
        <StatCard
          icon="💵"
          value={`$${formatUsdc(stats.totalPrincipalUsdc)}`}
          label="Total Lent"
        />
        <StatCard
          icon="🤖"
          value={agentsIdentity.length}
          label="AI Agents"
        />
      </div>

      {/* ── Portfolio Health + Agent Status ────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Portfolio Health */}
        <div className="rounded-lg border border-navy-200 bg-white p-6">
          <h2 className="text-base font-semibold text-navy-900">
            Portfolio Health
          </h2>

          {totalAssessed > 0 ? (
            <div className="mt-4 flex flex-col items-center gap-4">
              {/* Donut chart via conic-gradient */}
              <div className="relative h-40 w-40">
                <div
                  className="h-full w-full rounded-full"
                  style={{
                    background: `conic-gradient(
                      #22c55e 0% ${healthyPct}%,
                      #f59e0b ${healthyPct}% ${healthyPct + warningPct}%,
                      #ef4444 ${healthyPct + warningPct}% 100%
                    )`,
                  }}
                />
                <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-navy-900">
                      {totalAssessed}
                    </p>
                    <p className="text-xs text-navy-500">loans</p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-6">
                <LegendItem
                  color="bg-risk-healthy"
                  label="Healthy"
                  count={portfolio!.healthyCount}
                />
                <LegendItem
                  color="bg-risk-warning"
                  label="Warning"
                  count={portfolio!.warningCount}
                />
                <LegendItem
                  color="bg-risk-critical"
                  label="Critical"
                  count={portfolio!.criticalCount}
                />
              </div>

              {portfolio.weightedAvgLtvBps > 0 && (
                <p className="text-sm text-navy-500">
                  Weighted avg LTV:{" "}
                  <span className="font-medium text-navy-700">
                    {(portfolio.weightedAvgLtvBps / 100).toFixed(1)}%
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-navy-400">
              Run risk monitor to see portfolio health
            </p>
          )}
        </div>

        {/* Agent Status */}
        <div className="rounded-lg border border-navy-200 bg-white p-6">
          <h2 className="text-base font-semibold text-navy-900">
            Agent Status
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {agentsIdentity.map((agent) => (
              <div
                key={agent.agentId}
                className="rounded-lg border border-navy-100 bg-navy-50 p-4"
              >
                <p className="text-sm font-semibold text-navy-900">
                  {agent.name}
                </p>
                <p className="mt-1 text-xs text-navy-500">
                  Agent ID: {agent.agentId}
                </p>
                {agent.owner ? (
                  <a
                    href={MANTLESCAN_TOKENHOLDER}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-xs font-mono text-brand-600 hover:underline"
                  >
                    {truncateAddress(agent.owner)}
                  </a>
                ) : (
                  <p className="mt-1 text-xs italic text-navy-400">
                    Not registered on-chain
                  </p>
                )}
              </div>
            ))}

            {agentsIdentity.length === 0 && (
              <p className="col-span-full text-sm text-navy-400">
                No agents registered
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Batches ─────────────────────────────────── */}
      <div className="rounded-lg border border-navy-200 bg-white p-6">
        <h2 className="text-base font-semibold text-navy-900">
          Recent Batches
        </h2>

        {batches.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-xs font-medium uppercase tracking-wide text-navy-500">
                  <th className="pb-3 pr-4">Token ID</th>
                  <th className="pb-3 pr-4">Batch ID</th>
                  <th className="pb-3 pr-4">Farmer</th>
                  <th className="pb-3 pr-4">Weight (kg)</th>
                  <th className="pb-3 pr-4">Grade</th>
                  <th className="pb-3 pr-4">Stage</th>
                  <th className="pb-3">Loan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {batches.map((b) => (
                  <tr key={b.tokenId} className="text-navy-700">
                    <td className="py-3 pr-4 font-mono text-xs">
                      #{b.tokenId}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {b.batchId}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {truncateAddress(b.farmerWallet)}
                    </td>
                    <td className="py-3 pr-4">
                      {Number(b.weightKg).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 capitalize">{b.grade}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColor(b.stage)}`}
                      >
                        {stageLabel(b.stage)}
                      </span>
                    </td>
                    <td className="py-3">
                      {b.loanActive ? (
                        <span className="text-xs font-medium text-brand-600">
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs text-navy-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-navy-400">
            No batches recorded yet
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-navy-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-navy-900">{value}</p>
          <p className="text-sm text-navy-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
      />
      <span className="text-xs text-navy-600">
        {label} ({count})
      </span>
    </div>
  );
}
