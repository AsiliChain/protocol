import { getPublicClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi } from "@/lib/contracts";

export default async function CooperativesPage() {
  const publicClient = getPublicClient();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Archivo Black', sans-serif" }}>Cooperatives</h1>
        <p className="text-sm text-[oklch(70%_0.01_60)] mt-1">Cooperative onboarding and management</p>
      </div>

      <div className="dash-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[oklch(90%_0.006_60)]">Register Cooperative</h2>
        <p className="text-xs text-[oklch(60%_0.01_60)]">
          Grant COOP_ROLE to a wallet. Requires MULTISIG_ROLE authority.
        </p>
        <p className="text-xs text-[oklch(60%_0.01_60)]">
          POST /api/cooperatives/register with {"{ cooperativeWallet, name? }"} and Bearer JWT.
        </p>
        <div className="bg-[oklch(22%_0.01_55)] rounded-xl p-3 text-xs font-mono">
          <pre>{`curl -X POST /api/cooperatives/register \\
  -H "Authorization: Bearer <jwt>" \\
  -d '{"cooperativeWallet":"0x..."}'`}</pre>
        </div>
      </div>

      <div className="dash-card p-6">
        <h2 className="text-lg font-semibold text-[oklch(90%_0.006_60)] mb-4">Agent Management</h2>
        <p className="text-xs text-[oklch(60%_0.01_60)]">
          Cooperatives self-manage field agents. The cooperative wallet holder grants AGENT_ROLE
          to agent wallets via POST /api/agents/invite.
        </p>
        <p className="text-xs text-[oklch(60%_0.01_60)] mt-2">
          Agent cap: max(3, ceil(farmerCount / 50))
        </p>
      </div>
    </div>
  );
}
