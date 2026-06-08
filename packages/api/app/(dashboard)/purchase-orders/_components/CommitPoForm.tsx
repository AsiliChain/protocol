"use client";

import { useState } from "react";

export function CommitPoForm() {
  const [batchTokenId, setBatchTokenId] = useState("");
  const [buyerWallet, setBuyerWallet] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [priceUsdc, setPriceUsdc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/purchase-orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchTokenId: Number(batchTokenId),
          buyerWallet,
          buyerOrganisation: organisation,
          agreedPriceUsdc: priceUsdc,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to create PO");
      else setResult(`PO #${data.orderId} created — tx: ${data.transactionHash.slice(0, 10)}...`);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setBatchTokenId("");
    setBuyerWallet("");
    setOrganisation("");
    setPriceUsdc("");
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <div className="dash-card p-6 text-center space-y-3">
        <div className="text-[oklch(62%_0.17_155)] text-lg font-semibold">{result}</div>
        <button onClick={reset} className="dash-btn-primary text-sm">Create Another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "oklch(72% 0.16 80)" }}>
        Commit Purchase Order
      </h3>
      <div className="space-y-1">
        <label className="text-xs text-[oklch(70%_0.01_60)]">Batch Token ID *</label>
        <input type="number" value={batchTokenId} onChange={(e) => setBatchTokenId(e.target.value)}
          placeholder="e.g. 1" required min="1"
          className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2 text-sm text-[oklch(90%_0.006_60)] outline-none focus:border-[oklch(72%_0.16_80)] placeholder:text-[oklch(40%_0.01_55)]" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[oklch(70%_0.01_60)]">Buyer Wallet *</label>
        <input type="text" value={buyerWallet} onChange={(e) => setBuyerWallet(e.target.value)}
          placeholder="0x..." required
          className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2 text-sm text-[oklch(90%_0.006_60)] outline-none focus:border-[oklch(72%_0.16_80)] placeholder:text-[oklch(40%_0.01_55)]" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[oklch(70%_0.01_60)]">Organisation *</label>
        <input type="text" value={organisation} onChange={(e) => setOrganisation(e.target.value)}
          placeholder="e.g. Sucafina SA" required
          className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2 text-sm text-[oklch(90%_0.006_60)] outline-none focus:border-[oklch(72%_0.16_80)] placeholder:text-[oklch(40%_0.01_55)]" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[oklch(70%_0.01_60)]">Agreed Price (USDC) *</label>
        <input type="text" value={priceUsdc} onChange={(e) => setPriceUsdc(e.target.value)}
          placeholder="e.g. 5000000000 (5000 USDC)" required
          className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2 text-sm text-[oklch(90%_0.006_60)] outline-none focus:border-[oklch(72%_0.16_80)] placeholder:text-[oklch(40%_0.01_55)]" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={submitting}
        className="dash-btn-primary text-sm disabled:opacity-50">
        {submitting ? "Creating..." : "Create Purchase Order"}
      </button>
    </form>
  );
}
