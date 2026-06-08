"use client";

import { useState } from "react";

export function RegisterCoopForm() {
  const [wallet, setWallet] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/cooperatives/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cooperativeWallet: wallet, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Registration failed");
      else setResult(`Registered: ${data.cooperativeWallet}`);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setWallet("");
    setName("");
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <div className="dash-card p-6 text-center space-y-3">
        <div className="text-[oklch(62%_0.17_155)] text-lg font-semibold">{result}</div>
        <p className="text-xs text-[oklch(60%_0.01_60)]">Transaction submitted on-chain</p>
        <button onClick={reset} className="dash-btn-primary text-sm">Register Another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "oklch(72% 0.16 80)" }}>
        Register Cooperative
      </h3>
      <div className="space-y-1">
        <label className="text-xs text-[oklch(70%_0.01_60)]">Cooperative Wallet *</label>
        <input
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="0x..."
          required
          className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2 text-sm text-[oklch(90%_0.006_60)] outline-none focus:border-[oklch(72%_0.16_80)] placeholder:text-[oklch(40%_0.01_55)]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[oklch(70%_0.01_60)]">Cooperative Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mt. Elgon Organic Farmers"
          className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2 text-sm text-[oklch(90%_0.006_60)] outline-none focus:border-[oklch(72%_0.16_80)] placeholder:text-[oklch(40%_0.01_55)]"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="dash-btn-primary text-sm disabled:opacity-50"
      >
        {submitting ? "Registering..." : "Register Cooperative"}
      </button>
    </form>
  );
}
