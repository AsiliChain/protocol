"use client";

import { useState } from "react";

interface Props {
  slug: string;
  label: string;
}

type Status = "idle" | "running" | "success" | "error";

const STAGE_LABELS = ["DELIVERED","GRADED","MILLED","WAREHOUSED","COMMITTED","EXPORTED","SETTLED"];

export function RunAgentButton({ slug, label }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);

  async function handleRun() {
    setStatus("running");
    setMessage("");
    setSummary(null);
    try {
      const res = await fetch(`/api/agents/${slug}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        const report = data.report ?? {};

        if (slug === "risk-monitor") {
          const p = report.portfolio ?? {};
          const h = p.healthyCount ?? 0;
          const w = p.warningCount ?? 0;
          const c = p.criticalCount ?? 0;
          const active = report.activeLoans ?? 0;
          setMessage(`Report generated — ${active} active loans`);
          setSummary({
            healthy: h,
            warning: w,
            critical: c,
            avgLtv: p.weightedAvgLtvBps,
            totalPrincipal: p.totalPrincipalUsdc,
          });
        } else if (slug === "anomaly-detector") {
          const anomalies = report.anomalies ?? [];
          const scanned = report.totalScanned ?? 0;
          const dist = report.stageDistribution ?? {};
          setMessage(`Report generated — ${anomalies.length} anomalies in ${scanned} batches`);
          setSummary({
            anomalies,
            scanned,
            stageDistribution: dist,
          });
        } else {
          const count = report.activeLoans ?? report.totalLoans ?? report.anomalies?.length ?? 0;
          setMessage(`Report generated — ${count} entries`);
        }
      } else {
        setStatus("error");
        setMessage(data.error ?? "Unknown error");
      }
    } catch {
      setStatus("error");
      setMessage("Request failed");
    }
  }

  const btnBg = status === "running" ? "oklch(65% 0.01 60)" : "oklch(72% 0.16 80)";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleRun}
          disabled={status === "running"}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-85 disabled:cursor-not-allowed"
          style={{ backgroundColor: btnBg }}
        >
          {status === "running" ? "Running..." : "Run Now"}
        </button>
        {message && (
          <span className={`text-xs ${status === "success" ? "text-risk-healthy" : "text-risk-critical"}`}>
            {message}
          </span>
        )}
      </div>

      {summary && slug === "risk-monitor" && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs" style={{ color: "oklch(55% 0.012 60)" }}>
          <span style={{ color: "oklch(65% 0.18 150)" }}>● {summary.healthy} healthy</span>
          {Number(summary.warning) > 0 && <span style={{ color: "oklch(75% 0.15 80)" }}>● {summary.warning} warning</span>}
          {Number(summary.critical) > 0 && <span style={{ color: "oklch(55% 0.2 30)" }}>● {summary.critical} critical</span>}
          <span>Avg LTV: {Number(summary.avgLtv) / 100}%</span>
          <span>Principal: ${Number(summary.totalPrincipal).toLocaleString()}</span>
        </div>
      )}

      {summary && slug === "anomaly-detector" && (
        <div className="mt-2 text-xs" style={{ color: "oklch(55% 0.012 60)" }}>
          <span>{summary.scanned} batches · {summary.anomalies.length} anomalies</span>
          {summary.anomalies.length > 0 && (
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {(summary.anomalies as Array<{ type: string; severity: string; message: string; tokenId: number }>).slice(0, 3).map((a, i) => (
                <li key={i} className={`text-xs ${a.severity === "critical" ? "text-risk-critical" : a.severity === "warning" ? "text-risk-warning" : ""}`}>
                  Batch #{a.tokenId}: {a.message}
                </li>
              ))}
            </ul>
          )}
          {Object.keys(summary.stageDistribution as Record<string, number>).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {Object.entries(summary.stageDistribution as Record<string, number>).map(([stage, count]) => (
                <span key={stage} className="rounded px-1.5 py-0.5" style={{ backgroundColor: "oklch(92% 0.008 60)" }}>
                  {STAGE_LABELS[Number(stage)] ?? stage}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
