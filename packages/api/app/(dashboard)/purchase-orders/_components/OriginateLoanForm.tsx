"use client";

import { useState } from "react";

export function OriginateLoanForm() {
  const [batchTokenId, setBatchTokenId] = useState("");
  const [farmerWallet, setFarmerWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/loans/originate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchTokenId: Number(batchTokenId),
          farmerWallet,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Loan origination failed");
      else setResult(`Loan originated — tx: ${data.transactionHash.slice(0, 10)}...`);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setBatchTokenId("");
    setFarmerWallet("");
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <div className="dash-card p-6 text-center space-y-3">
        <div className="text-[oklch(62%_0.17_155)] text-lg font-semibold">{result}</div>
        <button onClick={reset} className="dash-btn-primary text-sm">Originate Another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "oklch(72% 0.16 80)" }}>
        Originate Loan
      </h3>
      <div className="space-y-1">
        <label className="text-xs text-[oklch(70%_0.01_60)]">Batch Token ID *</label>
        <input type="number" value={batchTokenId} onChange={(e) => setBatchTokenId(e.target.value)}
          placeholder="e.g. 1" required min="1"
          className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2 text-sm text-[oklch(90%_0.006_60)] outline-none focus:border-[oklch(72%_0.16_80)] placeholder:text-[oklch(40%_0.01_55)]" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[oklch(70%_0.01_60)]">Farmer Wallet *</label>
        <input type="text" value={farmerWallet} onChange={(e) => setFarmerWallet(e.target.value)}
          placeholder="0x..." required
          className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2 text-sm text-[oklch(90%_0.006_60)] outline-none focus:border-[oklch(72%_0.16_80)] placeholder:text-[oklch(40%_0.01_55)]" />
      </div>
      <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: "oklch(22% 0.01 55)" }}>
        <p style={{ color: "oklch(60% 0.01 60)" }}>
          The loan is originated at <strong style={{ color: "oklch(72% 0.16 80)" }}>16% APR</strong> — 10% MFI interest, 4% protocol fee, 2% credit loss reserve.
        </p>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={submitting}
        className="dash-btn-primary text-sm disabled:opacity-50">
        {submitting ? "Originating..." : "Originate Loan"}
      </button>
    </form>
  );
}
