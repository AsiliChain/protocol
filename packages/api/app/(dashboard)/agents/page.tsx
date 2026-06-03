import { getAgentsIdentity, type AgentIdentity } from "@/lib/dashboard";
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
      ? "bg-brand-100 text-brand-800"
      : "bg-navy-100 text-navy-500";
  return <span className={`${base} ${colors}`}>{children}</span>;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active"
      ? "bg-risk-healthy"
      : status === "paused"
        ? "bg-risk-warning"
        : "bg-navy-300";
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-navy-600">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
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
      className="font-mono text-xs text-navy-500 transition-colors hover:text-brand-600"
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
          className="flex items-start gap-2 text-sm text-navy-600"
        >
          <span className="mt-0.5 text-brand-500">&#x2713;</span>
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
    <div className="rounded-xl border border-navy-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-navy-900">
            {agentMeta?.name ?? identity.name}
          </h3>
          <p className="mt-0.5 text-xs text-navy-400">
            Agent ID {identity.agentId} &middot;{" "}
            {agentMeta?.version ?? "—"}
          </p>
        </div>
        <Badge variant={isRegistered ? "green" : "gray"}>
          {isRegistered ? "ERC-8004 Registered" : "Not Registered"}
        </Badge>
      </div>

      {agentMeta?.description && (
        <p className="mt-3 text-sm leading-relaxed text-navy-600">
          {agentMeta.description}
        </p>
      )}

      <div className="mt-4 rounded-lg border border-navy-100 bg-navy-50 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-400">
          On-Chain Identity
        </h4>
        <dl className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-navy-500">Owner</dt>
            <dd>
              {isRegistered ? (
                <TruncateAddress address={identity.owner as string} />
              ) : (
                <span className="text-xs text-navy-400">—</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-navy-500">Token URI</dt>
            <dd className="max-w-[200px] truncate text-xs font-mono text-navy-500">
              {identity.tokenUri ?? "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-navy-500">Registry</dt>
            <dd>
              <a
                href={registryUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
              >
                View on MantleScan
              </a>
            </dd>
          </div>
        </dl>
      </div>

      {apiData && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-400">
            Capabilities
          </h4>
          <CapabilityList items={apiData.agent.capabilities} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-navy-100 pt-4">
        <div className="flex items-center gap-2">
          {apiData ? (
            <StatusDot status={apiData.agent.status} />
          ) : (
            <StatusDot status="unknown" />
          )}
          <span className="text-xs text-navy-400">
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
    <div className="rounded-xl border border-navy-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
        {data && <StatusDot status={data.agent.status} />}
      </div>

      {data ? (
        <>
          <p className="mt-2 text-sm text-navy-500">
            Version {data.agent.version} &middot;{" "}
            {data.runIntervalSeconds > 0
              ? `Runs every ${data.runIntervalSeconds / 60} min`
              : "Event-triggered"}
          </p>

          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-400">
              Capabilities
            </h4>
            <CapabilityList items={data.agent.capabilities} />
          </div>

          <div className="mt-4 rounded-lg border border-navy-100 bg-navy-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-navy-500">Last Run</span>
              <span className="text-sm font-medium text-navy-700">
                {data.lastRun ? String(data.lastRun) : "No runs yet"}
              </span>
            </div>
          </div>

          <p className="mt-3 text-xs text-navy-400">{data.docs}</p>
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-earth-200 bg-earth-50 p-4">
          <p className="text-sm text-navy-600">
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
    <div className="rounded-xl border border-navy-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-navy-900">
        ERC-8004 Identity Registry
      </h3>
      <p className="mt-1 text-sm text-navy-500">
        On-chain registry for AI agent identity tokens (ERC-8004). Each agent
        is minted as an NFT with metadata describing its capabilities, owner,
        and audit trail configuration.
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-navy-100 bg-navy-50 p-4 text-center">
          <dt className="text-xs font-medium uppercase tracking-wider text-navy-400">
            Contract
          </dt>
          <dd className="mt-1">
            <a
              href={registryUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              {IDENTITY_REGISTRY_ADDRESS.slice(0, 8)}...
              {IDENTITY_REGISTRY_ADDRESS.slice(-6)}
            </a>
          </dd>
        </div>
        <div className="rounded-lg border border-navy-100 bg-navy-50 p-4 text-center">
          <dt className="text-xs font-medium uppercase tracking-wider text-navy-400">
            Registered Agents
          </dt>
          <dd className="mt-1 text-2xl font-bold text-navy-900">
            {agentCount}
          </dd>
        </div>
        <div className="rounded-lg border border-navy-100 bg-navy-50 p-4 text-center">
          <dt className="text-xs font-medium uppercase tracking-wider text-navy-400">
            Standard
          </dt>
          <dd className="mt-1 text-sm font-semibold text-brand-700">
            ERC-8004
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-2">
        <a
          href={registryUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
        >
          View on MantleScan
        </a>
        <span className="text-xs text-navy-400">
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
        <h2 className="text-2xl font-bold text-navy-900">AI Agents</h2>
        <p className="mt-1 text-sm text-navy-500">
          On-chain autonomous agents with ERC-8004 identity and Hedera HCS
          audit trails
        </p>
      </div>

      {/* Section 1: Agent Identity Cards */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-navy-400">
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
            <div className="col-span-full rounded-lg border border-navy-200 bg-navy-50 p-8 text-center">
              <p className="text-sm text-navy-500">
                No agent identities found on-chain. Ensure the
                IdentityRegistry is deployed.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Section 2 & 3: Agent Reports */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-navy-400">
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
