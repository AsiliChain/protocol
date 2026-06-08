import { RegisterCoopForm } from "./_components/RegisterCoopForm";
import { InviteAgentForm } from "./_components/InviteAgentForm";

export default async function CooperativesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: "oklch(93% 0.006 60)" }}
        >
          Cooperatives
        </h1>
        <p className="text-sm mt-1" style={{ color: "oklch(70% 0.01 60)" }}>
          Cooperative onboarding and agent management
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dash-card p-5">
          <RegisterCoopForm />
        </div>
        <div className="dash-card p-5">
          <InviteAgentForm />
        </div>
      </div>

      <div className="dash-card p-5 space-y-3">
        <h2
          className="text-sm font-semibold"
          style={{ color: "oklch(72% 0.16 80)" }}
        >
          Agent Management Notes
        </h2>
        <ul className="space-y-2 text-xs" style={{ color: "oklch(60% 0.01 60)" }}>
          <li>
            • Cooperatives self-manage field agents. The cooperative wallet holder
            grants AGENT_ROLE to agent wallets.
          </li>
          <li>
            • Each agent receives an ERC-8004 identity NFT on-chain upon
            invitation.
          </li>
          <li>
            • Agent cap is enforced on-chain:{" "}
            <code
              className="rounded px-1 py-0.5 font-mono"
              style={{ backgroundColor: "oklch(22% 0.01 55)", color: "oklch(72% 0.16 80)" }}
            >
              max(3, ceil(farmerCount / 50))
            </code>
          </li>
          <li>
            • Requires Bearer JWT with COOP_ROLE for agent invites, and
            MULTISIG_ROLE for cooperative registration.
          </li>
        </ul>
      </div>
    </div>
  );
}
