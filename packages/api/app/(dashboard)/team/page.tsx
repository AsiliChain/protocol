"use client";

import { useState, useEffect } from "react";
import { getAuthToken, getAuthRole } from "@/lib/auth-client";

interface Operator {
  wallet: string;
  name: string;
  added: string;
  role: string;
}

export default function TeamPage() {
  const [wallet, setWallet] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(getAuthRole());
    // Load operators from localStorage for now — will be chain-based post-deploy
    const stored = localStorage.getItem("field_operators");
    if (stored) {
      try {
        setOperators(JSON.parse(stored));
      } catch { void 0; }
    }
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/agents/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ agentWallet: wallet, agentName: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invite failed");
      } else {
        const newOp: Operator = {
          wallet,
          name,
          added: new Date().toISOString().split("T")[0],
          role: "FIELD_OPS",
        };
        const updated = [...operators, newOp];
        setOperators(updated);
        localStorage.setItem("field_operators", JSON.stringify(updated));
        setResult(`Invited ${name} (${wallet.slice(0, 6)}...${wallet.slice(-4)})`);
        setWallet("");
        setName("");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (role !== "COOP_ROLE") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
            Team
          </h1>
          <p className="text-sm text-[oklch(70%_0.01_60)] mt-1">
            Cooperative operator management
          </p>
        </div>
        <div
          className="dash-card p-8 text-center"
          style={{ backgroundColor: "oklch(17% 0.008 55)" }}
        >
          <p className="text-sm" style={{ color: "oklch(60% 0.012 60)" }}>
            Only cooperative operators can manage the team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
          Team
        </h1>
        <p className="text-sm text-[oklch(70%_0.01_60)] mt-1">
          Invite and manage field operators
        </p>
      </div>

      <div className="dash-card p-5">
        <h3 className="text-sm font-semibold" style={{ color: "oklch(72% 0.16 80)" }}>
          Invite New Operator
        </h3>
        <form onSubmit={handleInvite} className="mt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "oklch(60% 0.01 58)" }}>
                Wallet Address *
              </label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="w-full bg-white border border-[oklch(82%_0.008_60)] rounded-xl px-3 py-2 text-sm text-[oklch(18%_0.01_60)] outline-none focus:border-[#C8922A] focus:ring-2 focus:ring-[#C8922A]/10 placeholder:text-[oklch(60%_0.01_58)]"
                placeholder="0x..."
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: "oklch(60%_0.01_58)" }}>
                Operator Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-[oklch(82%_0.008_60)] rounded-xl px-3 py-2 text-sm text-[oklch(18%_0.01_60)] outline-none focus:border-[#C8922A] focus:ring-2 focus:ring-[#C8922A]/10 placeholder:text-[oklch(60%_0.01_58)]"
                placeholder="Sarah Nambi"
                required
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="dash-btn-primary text-sm"
          >
            {submitting ? "Inviting..." : "Invite"}
          </button>
        </form>
      </div>

      {result && (
        <div className="dash-card p-4 text-center">
          <p className="text-sm font-medium" style={{ color: "oklch(65% 0.18 80)" }}>
            {result}
          </p>
        </div>
      )}

      <div className="dash-card p-5">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "oklch(72% 0.16 80)" }}>
          Current Operators
        </h3>
        {operators.length === 0 ? (
          <p className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
            No field operators invited yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="dash-table-header text-xs">
                  <th className="text-left py-2 pr-4">Wallet</th>
                  <th className="text-left py-2 pr-4">Name</th>
                  <th className="text-left py-2 pr-4">Added</th>
                  <th className="text-left py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((op, i) => (
                  <tr key={i} className="dash-table-row">
                    <td className="py-2 pr-4 font-mono text-xs" style={{ color: "oklch(60% 0.01 58)" }}>
                      {op.wallet.slice(0, 6)}...{op.wallet.slice(-4)}
                    </td>
                    <td className="py-2 pr-4">{op.name}</td>
                    <td className="py-2 pr-4">{op.added}</td>
                    <td className="py-2">
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: op.role === "COOP_ROLE" ? "oklch(72% 0.16 80 / 0.15)" : "oklch(55% 0.15 200 / 0.15)",
                          color: op.role === "COOP_ROLE" ? "oklch(65% 0.18 80)" : "oklch(50% 0.16 200)",
                        }}
                      >
                        {op.role === "COOP_ROLE" ? "Coop" : "Field Ops"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
