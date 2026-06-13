"use client";

import { useEffect, useState } from "react";
import { getAuthWallet, getAuthRole } from "@/lib/auth-client";

function truncateAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function CooperativeOverview() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [coopName, setCoopName] = useState<string | null>(null);
  const [farmerCount, setFarmerCount] = useState<number | null>(null);
  const [batchTotal, setBatchTotal] = useState<number | null>(null);

  useEffect(() => {
    const w = getAuthWallet();
    const r = getAuthRole();
    setWallet(w);
    setRole(r);

    // Fetch cooperative name from the cooperatives lookup
    if (w) {
      fetch(`/api/farmers/cooperative`)
        .then((res) => res.json())
        .then((data) => {
          if (data.farmers) {
            setFarmerCount(data.farmers.length);
            setBatchTotal(data.farmers.reduce((sum: number, f: { batchCount: number }) => sum + f.batchCount, 0));
          }
        })
        .catch(() => {});

      // Fetch cooperative name
      fetch(`/api/cooperatives`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const match = data.find(
              (c: { wallet: string }) => c.wallet.toLowerCase() === w.toLowerCase(),
            );
            if (match) setCoopName(match.name);
          }
        })
        .catch(() => {});
    }
  }, []);

  const roleColor = role === "COOP_ROLE" ? "oklch(72% 0.16 80)" : "oklch(62% 0.17 185)";
  const roleLabel = role === "COOP_ROLE" ? "Cooperative" : "Field Ops";

  return (
    <div
      className="dash-card"
      style={{
        borderLeft: `3px solid ${roleColor}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "oklch(55% 0.012 60)" }}>
            {coopName ? `${coopName}` : "Cooperative"}
          </p>
          <p className="text-xl font-bold" style={{ color: "oklch(18% 0.01 60)" }}>
            {coopName ?? "Your Cooperative"}
          </p>
          {wallet && (
            <p className="font-mono text-xs" style={{ color: "oklch(55% 0.012 60)" }}>
              {truncateAddress(wallet)}
            </p>
          )}
        </div>
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: `${roleColor}1A`,
            color: roleColor,
          }}
        >
          {roleLabel}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 border-t pt-4" style={{ borderColor: "oklch(88% 0.006 60)" }}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "oklch(55% 0.012 60)" }}>
            Farmers
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums" style={{ color: "oklch(18% 0.01 60)" }}>
            {farmerCount !== null ? farmerCount : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "oklch(55% 0.012 60)" }}>
            Batches
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums" style={{ color: "oklch(18% 0.01 60)" }}>
            {batchTotal !== null ? batchTotal : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "oklch(55% 0.012 60)" }}>
            Role
          </p>
          <p className="mt-0.5 text-sm font-semibold" style={{ color: roleColor }}>
            {roleLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
