import { getAgentsIdentity, type AgentIdentity } from "@/lib/dashboard";
export const dynamic = "force-dynamic";
import { agents as agentRegistry } from "@/lib/agents/registry";
import { RunAgentButton } from "./_components/RunAgentButton";

// ─── Types ──────────────────────────────────────────────

interface AgentApiResponse {
  agent: {
    id: string;
    name: string;
    version: string;
    status: string;
    capabilities: string[];
  };
  runIntervalSeconds: number;
  lastRun: unknown;
  docs: string;
}

// ─── Constants ──────────────────────────────────────────

const IDENTITY_REGISTRY_ADDRESS =
  "0x62a6b58f8c3625F0c5f46D6C86A65595AA769C89";
const MANTLESCAN_BASE = "https://sepolia.mantlescan.org";

// ─── Data fetching ──────────────────────────────────────

async function fetchAgentData(
  slug: string,
): Promise<AgentApiResponse | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  try {
    const res = await fetch(`${base}/api/agents/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as AgentApiResponse;
  } catch {
    return null;
  }
}

// ─── Sub-components ─────────────────────────────────────

function Badge({
  variant,
  children,
}: {
  variant: "green" | "gray";
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
  const colors =
    variant === "green"
      ? "bg-risk-healthy/10 text-risk-healthy"
      : "";
  const variantStyle =
    variant === "green"
      ? {}
      : { backgroundColor: "oklch(88% 0.006 60)", color: "oklch(55% 0.012 60)" };
  return <span className={`${base} ${colors}`} style={variantStyle}>{children}</span>;
}

function StatusDot({ status }: { status: string }) {
  const dotBg =
    status === "active"
      ? "oklch(65% 0.18 150)"
      : status === "paused"
        ? "oklch(75% 0.15 80)"
        : "oklch(35% 0.008 55)";
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "oklch(68% 0.01 58)" }}>
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: dotBg }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TruncateAddress({ address }: { address: string }) {
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
  return (
    <a
      href={`${MANTLESCAN_BASE}/address/${address}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-xs dash-link-muted"
    >
      {short}
    </a>
  );
}

function CapabilityList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((cap) => (
        <li
          key={cap}
          className="flex items-start gap-2 text-sm"
          style={{ color: "oklch(68% 0.01 58)" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            style={{ color: "oklch(72% 0.16 80)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
          {cap}
        </li>
      ))}
    </ul>
  );
}

// ─── Section 1: Agent Identity Cards ────────────────────

function AgentIdentityCard({
  identity,
  agentKey,
  apiData,
}: {
  identity: AgentIdentity;
  agentKey: string;
  apiData: AgentApiResponse | null;
}) {
  const agentMeta = agentRegistry[agentKey];
  const isRegistered = identity.owner !== null;
  const registryUrl = `${MANTLESCAN_BASE}/address/${IDENTITY_REGISTRY_ADDRESS}`;

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)", boxShadow: "0 1px 3px oklch(0% 0 0 / 0.1)" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "oklch(23% 0.010 50)", color: "oklch(72% 0.16 80)" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
              />
            </svg>
          </span>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
              {agentMeta?.name ?? identity.name}
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: "oklch(55% 0.012 60)" }}>
              Agent ID {identity.agentId} &middot;{" "}
              {agentMeta?.version ?? "—"}
            </p>
          </div>
        </div>
        <Badge variant={isRegistered ? "green" : "gray"}>
          {isRegistered ? "ERC-8004 Registered" : "Not Registered"}
        </Badge>
      </div>

      {agentMeta?.description && (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "oklch(68% 0.01 58)" }}>
          {agentMeta.description}
        </p>
      )}

      <div
        className="mt-4 rounded-lg p-4"
        style={{ backgroundColor: "oklch(13% 0.005 58)", border: "1px solid oklch(22% 0.008 55)" }}
      >
        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(55% 0.012 60)" }}>
          On-Chain Identity
        </h4>
        <dl className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <dt className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>Owner</dt>
            <dd>
              {isRegistered ? (
                <TruncateAddress address={identity.owner as string} />
              ) : (
                <span className="text-xs" style={{ color: "oklch(55% 0.012 60)" }}>—</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>Token URI</dt>
            <dd
              className="max-w-[200px] truncate text-xs font-mono"
              style={{ color: "oklch(55% 0.012 60)" }}
            >
              {identity.tokenUri ?? "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>Registry</dt>
            <dd>
              <a
                href={registryUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium dash-link-gold"
              >
                View on MantleScan
              </a>
            </dd>
          </div>
        </dl>
      </div>

      {apiData && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(55% 0.012 60)" }}>
            Capabilities
          </h4>
          <CapabilityList items={apiData.agent.capabilities} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between pt-4" style={{ borderTop: "1px solid oklch(22% 0.008 55)" }}>
        <div className="flex items-center gap-2">
          {apiData ? (
            <StatusDot status={apiData.agent.status} />
          ) : (
            <StatusDot status="unknown" />
          )}
          <span className="text-xs" style={{ color: "oklch(55% 0.012 60)" }}>
            {agentMeta?.trigger === "scheduled"
              ? `Every ${agentMeta.runIntervalSeconds / 60} min`
              : agentMeta?.triggerEvent
                ? `On ${agentMeta.triggerEvent}`
                : "On-demand"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Section 2 & 3: Agent Report Cards ──────────────────

function AgentReportCard({
  title,
  slug,
  data,
}: {
  title: string;
  slug: string;
  data: AgentApiResponse | null;
}) {
  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)", boxShadow: "0 1px 3px oklch(0% 0 0 / 0.1)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>{title}</h3>
        {data && <StatusDot status={data.agent.status} />}
      </div>

      {data ? (
        <>
          <p className="mt-2 text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
            Version {data.agent.version} &middot;{" "}
            {data.runIntervalSeconds > 0
              ? `Runs every ${data.runIntervalSeconds / 60} min`
              : "Event-triggered"}
          </p>

          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(55% 0.012 60)" }}>
              Capabilities
            </h4>
            <CapabilityList items={data.agent.capabilities} />
          </div>

          <div
            className="mt-4 rounded-lg p-3"
            style={{ backgroundColor: "oklch(13% 0.005 58)", border: "1px solid oklch(22% 0.008 55)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>Last Run</span>
              <span className="text-sm font-medium" style={{ color: "oklch(80% 0.005 60)" }}>
                {data.lastRun ? String(data.lastRun) : "No runs yet"}
              </span>
            </div>
          </div>

          <p className="mt-3 text-xs" style={{ color: "oklch(55% 0.012 60)" }}>{data.docs}</p>
        </>
      ) : (
        <div
          className="mt-4 rounded-lg p-4"
          style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)" }}
        >
          <p className="text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
            No report available yet.
          </p>
          <div className="mt-3">
            <RunAgentButton slug={slug} label={title} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section 4: Registry Info ───────────────────────────

function RegistryCard({ agentCount }: { agentCount: number }) {
  const registryUrl = `${MANTLESCAN_BASE}/address/${IDENTITY_REGISTRY_ADDRESS}`;

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)", boxShadow: "0 1px 3px oklch(0% 0 0 / 0.1)" }}
    >
      <h3 className="text-lg font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
        ERC-8004 Identity Registry
      </h3>
      <p className="mt-1 text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
        On-chain registry for AI agent identity tokens (ERC-8004). Each agent
        is minted as an NFT with metadata describing its capabilities, owner,
        and audit trail configuration.
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          className="rounded-lg p-4 text-center"
          style={{ backgroundColor: "oklch(13% 0.005 58)", border: "1px solid oklch(22% 0.008 55)" }}
        >
          <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "oklch(55% 0.012 60)" }}>
            Contract
          </dt>
          <dd className="mt-1">
            <a
              href={registryUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm font-medium dash-link-gold"
            >
              {IDENTITY_REGISTRY_ADDRESS.slice(0, 8)}...
              {IDENTITY_REGISTRY_ADDRESS.slice(-6)}
            </a>
          </dd>
        </div>
        <div
          className="rounded-lg p-4 text-center"
          style={{ backgroundColor: "oklch(13% 0.005 58)", border: "1px solid oklch(22% 0.008 55)" }}
        >
          <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "oklch(55% 0.012 60)" }}>
            Registered Agents
          </dt>
          <dd className="mt-1 text-2xl font-bold" style={{ color: "oklch(72% 0.16 80)" }}>
            {agentCount}
          </dd>
        </div>
        <div
          className="rounded-lg p-4 text-center"
          style={{ backgroundColor: "oklch(13% 0.005 58)", border: "1px solid oklch(22% 0.008 55)" }}
        >
          <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: "oklch(55% 0.012 60)" }}>
            Standard
          </dt>
          <dd className="mt-1 text-sm font-semibold" style={{ color: "oklch(72% 0.16 80)" }}>
            ERC-8004
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-2">
        <a
          href={registryUrl}
          target="_blank"
          rel="noreferrer"
          className="dash-btn-ghost no-underline text-xs px-3 py-1.5"
        >
          View on MantleScan
        </a>
        <span className="text-xs" style={{ color: "oklch(55% 0.012 60)" }}>
          Mantle Sepolia &middot; Chain 5003
        </span>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────

export default async function AgentsPage() {
  // Fetch on-chain identity data
  let identities: AgentIdentity[] = [];
  try {
    identities = await getAgentsIdentity();
  } catch {
    // contract read failed — will show fallback
  }

  // Fetch agent API metadata in parallel
  const [riskMonitorData, anomalyDetectorData] = await Promise.all([
    fetchAgentData("risk-monitor"),
    fetchAgentData("anomaly-detector"),
  ]);

  const registeredCount = identities.filter(
    (i) => i.owner !== null,
  ).length;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "oklch(18% 0.01 60)" }}>AI Agents</h2>
        <p className="mt-1 text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
          On-chain autonomous agents with ERC-8004 identity and Hedera HCS
          audit trails
        </p>
      </div>

      {/* Section 1: Agent Identity Cards */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(55% 0.012 60)" }}>
          Agent Identities
        </h3>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {identities.map((identity) => (
            <AgentIdentityCard
              key={identity.agentId}
              identity={identity}
              agentKey={identity.name}
              apiData={
                identity.agentId === 0
                  ? riskMonitorData
                  : anomalyDetectorData
              }
            />
          ))}
          {identities.length === 0 && (
            <div
              className="col-span-full rounded-xl p-8 text-center"
              style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)" }}
            >
              <p className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
                No agent identities found on-chain. Ensure the
                IdentityRegistry is deployed.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Section 2 & 3: Agent Reports */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: "oklch(55% 0.012 60)" }}>
          Agent Reports
        </h3>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AgentReportCard
            title="Risk Monitor"
            slug="risk-monitor"
            data={riskMonitorData}
          />
          <AgentReportCard
            title="Anomaly Detector"
            slug="anomaly-detector"
            data={anomalyDetectorData}
          />
        </div>
      </section>

      {/* Section 4: Registry Info */}
      <section>
        <RegistryCard agentCount={registeredCount} />
      </section>
    </div>
  );
}
