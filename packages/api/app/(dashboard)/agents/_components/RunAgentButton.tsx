"use client";

import { useState } from "react";

interface Props {
  slug: string;
  label: string;
}

type Status = "idle" | "running" | "success" | "error";

export function RunAgentButton({ slug, label }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleRun() {
    setStatus("running");
    setMessage("");
    try {
      const res = await fetch(`/api/agents/${slug}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        const loanCount = data.report?.activeLoans ?? data.report?.totalLoans ?? data.report?.anomalies?.length ?? 0;
        setMessage(`Report generated — ${loanCount} entries`);
      } else {
        setStatus("error");
        setMessage(data.error ?? "Unknown error");
      }
    } catch {
      setStatus("error");
      setMessage("Request failed");
    }
  }

  const btnClass =
    status === "running"
      ? "bg-navy-300 cursor-not-allowed"
      : "bg-brand-600 hover:bg-brand-700";

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRun}
        disabled={status === "running"}
        className={`rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${btnClass}`}
      >
        {status === "running" ? "Running..." : "Run Now"}
      </button>
      {message && (
        <span
          className={`text-xs ${
            status === "success" ? "text-risk-healthy" : "text-risk-critical"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
