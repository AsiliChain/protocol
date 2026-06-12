"use client";

import { useState } from "react";
import { keccak256, toBytes } from "viem";
import { getAuthToken } from "@/lib/auth-client";

function addressFromNin(nin: string): `0x${string}` {
  const hash = keccak256(toBytes(`asilichain:${nin}`));
  return `0x${hash.slice(26)}` as `0x${string}`;
}

interface FarmerLookup {
  registered: boolean;
  wallet: string;
  farmer: {
    farmerName: string;
    phoneNumber: string;
    cooperativeWallet: string;
    farmAreaHectares: number;
    gfwDeforestationFree: boolean;
    active: boolean;
  } | null;
}

const grades = [
  { value: "screen18", label: "Screen 18" },
  { value: "screen15", label: "Screen 15" },
  { value: "faq", label: "FAQ" },
  { value: "aa", label: "AA" },
  { value: "pb", label: "PB (Peaberry)" },
  { value: "organic", label: "Organic Certified" },
];

const processingMethods = [
  { value: "fully-washed", label: "Fully Washed" },
  { value: "natural", label: "Natural / Dry Process" },
  { value: "honey", label: "Honey Process" },
  { value: "semi-washed", label: "Semi-Washed / Pulped Natural" },
];

export function RecordDeliveryForm() {
  const [nin, setNin] = useState("");
  const [farmerData, setFarmerData] = useState<FarmerLookup | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [weightKg, setWeightKg] = useState("");
  const [grade, setGrade] = useState("screen18");
  const [moisturePct, setMoisturePct] = useState("");
  const [bagsCount, setBagsCount] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [processing, setProcessing] = useState("fully-washed");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    if (!nin.trim()) return;
    setLookingUp(true);
    setLookupError(null);
    setFarmerData(null);

    try {
      const res = await fetch(`/api/farmers/lookup?nin=${encodeURIComponent(nin)}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || "Lookup failed");
      } else if (!data.registered) {
        setLookupError("Farmer not registered. Please register them first.");
      } else {
        setFarmerData(data);
      }
    } catch {
      setLookupError("Network error during lookup");
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!farmerData?.registered) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    const payload = {
      farmerWallet: farmerData.wallet,
      cooperativeWallet: farmerData.farmer?.cooperativeWallet || farmerData.wallet,
      weightKg: Number(weightKg),
      grade,
      moisturePct: Number(moisturePct),
      bagsCount: bagsCount ? Number(bagsCount) : 0,
      harvestDate: harvestDate || null,
      processingMethod: processing,
      collectionPointHash: `0x${"0".repeat(64)}`,
      weightSlipIpfsCid: `0x${"0".repeat(64)}`,
    };

    try {
      const res = await fetch("/api/batch/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(payload),
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
    setNin("");
    setFarmerData(null);
    setLookupError(null);
    setWeightKg("");
    setGrade("screen18");
    setMoisturePct("");
    setBagsCount("");
    setHarvestDate("");
    setProcessing("fully-washed");
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <div className="dash-card p-6 text-center space-y-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-10 w-10 mx-auto"
          style={{ color: "oklch(65% 0.18 80)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <div className="text-sm font-medium" style={{ color: "oklch(65% 0.18 80)" }}>
          {result}
        </div>
        <button onClick={reset} className="dash-btn-primary text-sm">
          Record Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold" style={{ color: "oklch(72% 0.16 80)" }}>
        Record Coffee Delivery
      </h3>

      {/* Farmer Lookup by NIN */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs" style={{ color: "oklch(60% 0.01 58)" }}>
              Farmer NIN (National ID) *
            </label>
            <input
              type="text"
              value={nin}
              onChange={(e) => setNin(e.target.value)}
              onBlur={(e) => { if (e.target.value.trim()) handleLookup(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookup(); } }}
              className="w-full bg-white border border-[oklch(82%_0.008_60)] rounded-xl px-3 py-2 text-sm text-[oklch(18%_0.01_60)] outline-none focus:border-[#C8922A] focus:ring-2 focus:ring-[#C8922A]/10 placeholder:text-[oklch(60%_0.01_58)]"
              placeholder="CM12345678901UG"
              required
            />
          </div>
          <button
            type="button"
            onClick={handleLookup}
            disabled={lookingUp || !nin.trim()}
            className="mt-5 px-3 py-2 rounded-xl text-sm font-medium transition-colors self-start"
            style={{
              backgroundColor: lookingUp ? "oklch(40% 0.01 55)" : "oklch(72% 0.16 80 / 0.15)",
              color: lookingUp ? "oklch(60% 0.01 58)" : "oklch(65% 0.18 80)",
            }}
          >
            {lookingUp ? "..." : "Look up"}
          </button>
        </div>

        {lookupError && (
          <p className="text-xs font-medium" style={{ color: "oklch(60% 0.18 30)" }}>
            {lookupError}
          </p>
        )}

        {/* Farmer Info Card */}
        {farmerData?.registered && farmerData.farmer && (
          <div
            className="rounded-xl p-3 space-y-1 text-sm"
            style={{
              backgroundColor: "oklch(65% 0.18 80 / 0.06)",
              border: "1px solid oklch(65% 0.18 80 / 0.15)",
            }}
          >
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-4 w-4"
                style={{ color: "oklch(65% 0.18 80)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              <span className="font-semibold" style={{ color: "oklch(65% 0.18 80)" }}>
                Origin Verified
              </span>
            </div>
            <p style={{ color: "oklch(88% 0.006 60)" }}>
              {farmerData.farmer.farmerName}
            </p>
            <p className="text-xs font-mono" style={{ color: "oklch(55% 0.012 60)" }}>
              Wallet: {farmerData.wallet.slice(0, 6)}...{farmerData.wallet.slice(-4)}
            </p>
            {farmerData.farmer.gfwDeforestationFree && (
              <p className="text-xs" style={{ color: "oklch(55% 0.15 140)" }}>
                Deforestation-free verified
              </p>
            )}
          </div>
        )}
      </div>

      {/* Delivery Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Weight (kg)" value={weightKg} onChange={setWeightKg} required type="number" placeholder="500" />
        <Field label="Moisture %" value={moisturePct} onChange={setMoisturePct} required type="number" placeholder="11.5" step="0.1" />
        <Field label="Bags Count" value={bagsCount} onChange={setBagsCount} type="number" placeholder="20" />
        <Field label="Harvest Date" value={harvestDate} onChange={setHarvestDate} type="date" />

        <div className="space-y-1">
          <label className="text-xs" style={{ color: "oklch(60% 0.01 58)" }}>
            Grade *
          </label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full bg-white border border-[oklch(82%_0.008_60)] rounded-xl px-3 py-2 text-sm text-[oklch(18%_0.01_60)] outline-none focus:border-[#C8922A] focus:ring-2 focus:ring-[#C8922A]/10"
          >
            {grades.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs" style={{ color: "oklch(60% 0.01 58)" }}>
            Processing Method *
          </label>
          <select
            value={processing}
            onChange={(e) => setProcessing(e.target.value)}
            className="w-full bg-white border border-[oklch(82%_0.008_60)] rounded-xl px-3 py-2 text-sm text-[oklch(18%_0.01_60)] outline-none focus:border-[#C8922A] focus:ring-2 focus:ring-[#C8922A]/10"
          >
            {processingMethods.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-xs font-medium" style={{ color: "oklch(60% 0.18 30)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !farmerData?.registered}
        className="dash-btn-primary w-full text-sm"
      >
        {submitting ? "Recording..." : "Record Delivery"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs" style={{ color: "oklch(60% 0.01 58)" }}>
        {label}
        {required && " *"}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-[oklch(82%_0.008_60)] rounded-xl px-3 py-2 text-sm text-[oklch(18%_0.01_60)] outline-none focus:border-[#C8922A] focus:ring-2 focus:ring-[#C8922A]/10 placeholder:text-[oklch(60%_0.01_58)]"
        required={required}
        placeholder={placeholder}
        step={step}
      />
    </div>
  );
}
