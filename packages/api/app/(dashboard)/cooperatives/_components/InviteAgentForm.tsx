"use client";

import { useState } from "react";

export function InviteAgentForm() {
  const [coopWallet, setCoopWallet] = useState("");
  const [agentWallet, setAgentWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/agents/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cooperativeWallet: coopWallet,
          agentWallet: agentWallet,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Invitation failed");
      else
        setResult(
          `Agent invited — NFT ID: ${data.erc8004AgentId ?? "minted"}`,
        );
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setCoopWallet("");
    setAgentWallet("");
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <div className="dash-card p-6 text-center space-y-3">
        <div className="text-[oklch(62%_0.17_155)] text-lg font-semibold">
          {result}
        </div>
        <p className="text-xs text-[oklch(60%_0.01_60)]">
          ERC-8004 agent identity NFT minted on-chain
        </p>
        <button onClick={reset} className="dash-btn-primary text-sm">
          Invite Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "oklch(72% 0.16 80)" }}>
        Invite Field Operator
      </h3>

      <div className="space-y-1">
        <label className="text-xs text-[oklch(70%_0.01_60)]">
          Cooperative Wallet *
        </label>
        <input
          type="text"
          value={coopWallet}
          onChange={(e) => setCoopWallet(e.target.value)}
          placeholder="0x..."
          required
          className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2 text-sm text-[oklch(90%_0.006_60)] outline-none focus:border-[oklch(72%_0.16_80)] placeholder:text-[oklch(40%_0.01_55)]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[oklch(70%_0.01_60)]">
          Agent Wallet *
        </label>
        <input
          type="text"
          value={agentWallet}
          onChange={(e) => setAgentWallet(e.target.value)}
          placeholder="0x..."
          required
          className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2 text-sm text-[oklch(90%_0.006_60)] outline-none focus:border-[oklch(72%_0.16_80)] placeholder:text-[oklch(40%_0.01_55)]"
        />
      </div>

      <div
        className="rounded-xl p-3 text-xs"
        style={{ backgroundColor: "oklch(22% 0.01 55)" }}
      >
        <p style={{ color: "oklch(60% 0.01 60)" }}>
          Agent cap: <strong style={{ color: "oklch(72% 0.16 80)" }}>max(3, ceil(farmerCount / 50))</strong>
        </p>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="dash-btn-primary text-sm disabled:opacity-50"
      >
        {submitting ? "Inviting..." : "Invite Agent"}
      </button>
    </form>
  );
}
