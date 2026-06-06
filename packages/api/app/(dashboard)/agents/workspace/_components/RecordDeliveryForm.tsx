"use client";

import { useState } from "react";

export function RecordDeliveryForm() {
  const [farmerWallet, setFarmerWallet] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [grade, setGrade] = useState("screen18");
  const [moisturePct, setMoisturePct] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/batch/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerWallet,
          weightKg: Number(weightKg),
          grade,
          moisturePct: Number(moisturePct),
          cooperativeWallet: farmerWallet,
          collectionPointHash: `0x${"0".repeat(64)}`,
          weightSlipIpfsCid: `0x${"0".repeat(64)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Submission failed");
      else setResult(`Delivery recorded — Token ID: ${data.tokenId}`);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setFarmerWallet(""); setWeightKg(""); setGrade("screen18"); setMoisturePct("");
    setResult(null); setError(null);
  }

  if (result) {
    return (
      <div className="dash-card p-6 text-center space-y-3">
        <div className="text-green-400 text-lg font-semibold">{result}</div>
        <button onClick={reset} className="dash-btn-primary text-sm">Record Another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="dash-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[#D4A053]">Record Coffee Delivery</h3>
      <div className="space-y-3">
        <Field label="Farmer Wallet" value={farmerWallet} onChange={setFarmerWallet} required />
        <Field label="Weight (kg)" type="number" value={weightKg} onChange={setWeightKg} required />
        <div className="space-y-1">
          <label className="text-xs text-[oklch(70%_0.01_60)]">Grade *</label>
          <select value={grade} onChange={(e) => setGrade(e.target.value)}
            className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2 text-sm text-[oklch(90%_0.006_60)] outline-none focus:border-[#D4A053]">
            <option value="screen18">Screen 18</option>
            <option value="screen15">Screen 15</option>
            <option value="FAQ">FAQ</option>
          </select>
        </div>
        <Field label="Moisture %" type="number" value={moisturePct} onChange={setMoisturePct} required />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button type="submit" disabled={submitting} className="dash-btn-primary w-full text-sm">
        {submitting ? "Recording..." : "Record Delivery"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required }: any) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-[oklch(70%_0.01_60)]">{label}{required && " *"}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2 text-sm text-[oklch(90%_0.006_60)] outline-none focus:border-[#D4A053]"
        required={required} />
    </div>
  );
}
