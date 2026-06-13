"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface FarmerRow {
  wallet: string;
  name: string;
  nationalId: string;
  phone: string;
  batchCount: number;
  totalWeightKg: number;
  gfwCompliant: boolean;
  active: boolean;
}

function truncateAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function FarmerList() {
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/farmers/cooperative")
      .then((res) => res.json())
      .then((data) => {
        if (data.farmers) setFarmers(data.farmers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dash-card p-5">
        <p className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>Loading farmers…</p>
      </div>
    );
  }

  if (farmers.length === 0) {
    return (
      <div className="dash-card p-5">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 shrink-0" style={{ color: "oklch(68% 0.01 58)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
          <p className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
            No farmers registered yet. Use the registration form to add farmers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="dash-card p-0 overflow-hidden"
      style={{ border: "1px solid oklch(88% 0.006 60)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid oklch(88% 0.006 60)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
          Your Farmers
        </h3>
        <span
          className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{ backgroundColor: "oklch(72% 0.16 80 / 0.12)", color: "oklch(60% 0.12 80)" }}
        >
          {farmers.length}
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: "oklch(94% 0.004 60)" }}>
        {farmers.map((f) => (
          <Link
            key={f.wallet}
            href={`/farmers/${f.wallet}`}
            className="flex items-center gap-4 px-5 py-3 text-sm transition-colors hover:bg-[oklch(97%_0.006_85)]"
            style={{ color: "oklch(18% 0.01 60)", textDecoration: "none" }}
          >
            {/* Initials avatar */}
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{ backgroundColor: "oklch(72% 0.16 80 / 0.12)", color: "oklch(60% 0.12 80)" }}
            >
              {f.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </span>

            {/* Farmer info */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">
                {f.name}
                {f.gfwCompliant && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "oklch(62% 0.17 155 / 0.12)", color: "oklch(50% 0.16 155)" }}>
                    EUDR
                  </span>
                )}
              </span>
              <span className="text-[11px] font-mono" style={{ color: "oklch(68% 0.01 58)" }}>
                {truncateAddress(f.wallet)} · {f.nationalId !== "—" ? f.nationalId : "No NIN"}
              </span>
            </div>

            {/* Stats */}
            <div className="shrink-0 text-right">
              <span className="text-xs tabular-nums font-medium" style={{ color: "oklch(40% 0.01 60)" }}>
                {f.batchCount} batch{f.batchCount !== 1 ? "es" : ""}
              </span>
              <br />
              <span className="text-[11px]" style={{ color: "oklch(68% 0.01 58)" }}>
                {f.totalWeightKg.toLocaleString()} kg
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
