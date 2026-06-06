import {
  getDashboardStats,
  getRecentBatches,
  getAgentsIdentity,
  getPortfolioHealth,
  formatUsdc,
  stageLabel,
  stageColor,
} from "@/lib/dashboard";
import { PortfolioDonut } from "@/app/(dashboard)/dashboard/_components/PortfolioDonut";
import type { PortfolioHealth } from "@/lib/dashboard";

function truncateAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function fetchData() {
  const [stats, batches, agentsIdentity, portfolioHealth] = await Promise.all([
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
    getPortfolioHealth().catch(() => null),
  ]);

  return { stats, batches, agentsIdentity, portfolioHealth };
}

export default async function DashboardPage() {
  const { stats, batches, agentsIdentity, portfolioHealth } =
    await fetchData();

  const MANTLESCAN_TOKENHOLDER =
    "https://sepolia.mantlescan.org/address/0x27A445d5DfbbfB0B1fcE7D9199859C000B9070F3?tab=tokenholder";

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          }
          value={stats.totalBatches}
          label="Total Batches"
        />
        <StatCard
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
          value={stats.activeLoans}
          label="Active Loans"
          valueGold
        />
        <StatCard
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v9.575c0 .621-.504 1.125-1.125 1.125H2.25" />
            </svg>
          }
          value={`$${formatUsdc(stats.totalPrincipalUsdc)}`}
          label="Total Lent"
          valueGreen
        />
        <StatCard
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
          }
          value={agentsIdentity.length}
          label="AI Agents"
        />
      </div>

      {/* Portfolio Health + Agent Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PortfolioDonut health={portfolioHealth} />

        {/* Agent Status */}
        <div className="dash-card">
          <h2 className="text-base font-semibold" style={{ color: "oklch(93% 0.006 60)" }}>
            Agent Status
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {agentsIdentity.map((agent) => (
              <div
                key={agent.agentId}
                className="dash-card"
                style={{
                  padding: "16px",
                  borderLeft: "2px solid oklch(62% 0.17 155)",
                }}
              >
                <p
                  className="flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: "oklch(93% 0.006 60)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4" style={{ color: "oklch(62% 0.17 155)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  {agent.name}
                </p>
                <p className="mt-1 text-xs" style={{ color: "oklch(42% 0.012 55)" }}>
                  Agent ID: {agent.agentId}
                </p>
                {agent.owner ? (
                  <a
                    href={MANTLESCAN_TOKENHOLDER}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-xs font-mono"
                    style={{ color: "oklch(72% 0.16 80)" }}
                  >
                    {truncateAddress(agent.owner)}
                  </a>
                ) : (
                  <p className="mt-1 text-xs italic" style={{ color: "oklch(42% 0.012 55)" }}>
                    Not registered on-chain
                  </p>
                )}
              </div>
            ))}

            {agentsIdentity.length === 0 && (
              <p className="col-span-full text-sm" style={{ color: "oklch(42% 0.012 55)" }}>
                No agents registered
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Batches */}
      <div className="dash-card">
        <h2 className="text-base font-semibold" style={{ color: "oklch(93% 0.006 60)" }}>
          Recent Batches
        </h2>

        {batches.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="dash-table-header">
                  <th className="pr-6">Token ID</th>
                  <th className="pr-6">Batch ID</th>
                  <th className="pr-6">Farmer</th>
                  <th className="pr-6">Weight (kg)</th>
                  <th className="pr-6">Grade</th>
                  <th className="pr-6">Stage</th>
                  <th>Loan</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.tokenId} className="dash-table-row">
                    <td className="pr-6 font-mono text-xs" style={{ color: "oklch(68% 0.01 58)" }}>
                      #{b.tokenId}
                    </td>
                    <td className="pr-6 font-mono text-xs" style={{ color: "oklch(68% 0.01 58)" }}>
                      {b.batchId}
                    </td>
                    <td className="pr-6 font-mono text-xs" style={{ color: "oklch(68% 0.01 58)" }}>
                      {truncateAddress(b.farmerWallet)}
                    </td>
                    <td className="pr-6" style={{ color: "oklch(93% 0.006 60)" }}>
                      {Number(b.weightKg).toLocaleString()}
                    </td>
                    <td className="pr-6 capitalize" style={{ color: "oklch(68% 0.01 58)" }}>
                      {b.grade}
                    </td>
                    <td className="pr-6">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColor(b.stage)}`}
                      >
                        <span
                          className="dash-status-dot"
                          style={{
                            color: "oklch(62% 0.17 155)",
                            backgroundColor: "oklch(62% 0.17 155)",
                          }}
                        />
                        {stageLabel(b.stage)}
                      </span>
                    </td>
                    <td>
                      {b.loanActive ? (
                        <span className="text-xs font-medium" style={{ color: "oklch(62% 0.17 155)" }}>
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "oklch(42% 0.012 55)" }}>
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm" style={{ color: "oklch(42% 0.012 55)" }}>
            No batches recorded yet
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Stat Card Component ──────────────────────────────────── */

function StatCard({
  icon,
  value,
  label,
  valueGold,
  valueGreen,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  valueGold?: boolean;
  valueGreen?: boolean;
}) {
  const valColor = valueGold
    ? "oklch(72% 0.16 80)"
    : valueGreen
      ? "oklch(62% 0.17 155)"
      : "oklch(93% 0.006 60)";

  return (
    <div className="dash-card dash-card-glow">
      <div className="relative z-10 flex items-center gap-4">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: valueGold
              ? "oklch(72% 0.16 80 / 0.12)"
              : valueGreen
                ? "oklch(62% 0.17 155 / 0.12)"
                : "oklch(72% 0.16 80 / 0.08)",
            color: valColor,
          }}
        >
          {icon}
        </div>
        <div>
          <p
            className="text-xs font-medium uppercase tracking-[0.04em]"
            style={{ color: "oklch(42% 0.012 55)" }}
          >
            {label}
          </p>
          <p
            className="text-2xl font-semibold tracking-[-0.02em] tabular-nums"
            style={{ color: valColor }}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
