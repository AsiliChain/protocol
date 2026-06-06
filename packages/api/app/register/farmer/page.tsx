"use client";

import { useState } from "react";
import { keccak256, toBytes } from "viem";

function addressFromNin(nin: string): `0x${string}` {
  const hash = keccak256(toBytes(`asilichain:${nin}`));
  return `0x${hash.slice(26)}` as `0x${string}`;
}

interface FormData {
  nationalId: string;
  farmerName: string;
  phoneNumber: string;
  maaifFarmerId: string;
  cooperativeWallet: string;
  farmAreaHectares: number;
  farmBoundaryLat: number;
  farmBoundaryLng: number;
  gfwDeforestationFree: boolean;
}

export default function FarmerRegisterPage() {
  const [form, setForm] = useState<FormData>({
    nationalId: "",
    farmerName: "",
    phoneNumber: "",
    maaifFarmerId: "",
    cooperativeWallet: "",
    farmAreaHectares: 0,
    farmBoundaryLat: 0,
    farmBoundaryLng: 0,
    gfwDeforestationFree: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ farmerWallet: string; txHash?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const derivedWallet = form.nationalId ? addressFromNin(form.nationalId) : null;

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    if (!derivedWallet) {
      setError("Invalid NIN — could not derive wallet address");
      setSubmitting(false);
      return;
    }

    const farmBoundaryIpfsCid = keccak256(
      toBytes(`lat:${form.farmBoundaryLat},lng:${form.farmBoundaryLng}`),
    );

    try {
      const res = await fetch("/api/farmers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerWallet: derivedWallet,
          maaifFarmerId: form.maaifFarmerId,
          cooperativeWallet: form.cooperativeWallet,
          farmBoundaryIpfsCid,
          farmAreaHectares: form.farmAreaHectares,
          gfwDeforestationFree: form.gfwDeforestationFree,
          nationalId: form.nationalId,
          farmerName: form.farmerName,
          phoneNumber: form.phoneNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
      } else {
        setResult({ farmerWallet: derivedWallet, txHash: data.transactionHash });
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="dash-card p-8 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-xl font-bold text-[oklch(93%_0.006_60)]">Farmer Registered</h2>
        <p className="text-sm text-[oklch(70%_0.01_60)] break-all">
          Wallet: <span className="font-mono text-[#D4A053]">{result.farmerWallet}</span>
        </p>
        {result.txHash && (
          <p className="text-xs text-[oklch(60%_0.01_60)] break-all">
            Tx: {result.txHash}
          </p>
        )}
        <button
          onClick={() => { setResult(null); setForm({
            nationalId: "", farmerName: "", phoneNumber: "", maaifFarmerId: "",
            cooperativeWallet: "", farmAreaHectares: 0, farmBoundaryLat: 0,
            farmBoundaryLng: 0, gfwDeforestationFree: true,
          }); }}
          className="dash-btn-primary mt-4"
        >
          Register Another Farmer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
          Register Farmer
        </h1>
        <p className="text-sm text-[oklch(70%_0.01_60)]">
          Wallet derived deterministically from NIN — farmer signs nothing
        </p>
      </div>

      <form onSubmit={handleSubmit} className="dash-card p-6 space-y-5">
        {derivedWallet && (
          <div className="bg-[oklch(22%_0.01_55)] rounded-xl p-3 text-xs space-y-1">
            <p className="text-[oklch(70%_0.01_60)]">Derived Wallet Address</p>
            <p className="font-mono text-[#D4A053] break-all">{derivedWallet}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="NIN (National ID)" value={form.nationalId} onChange={(v) => update("nationalId", v)} placeholder="CMN8608004NAK" required />
          <Input label="Farmer Name" value={form.farmerName} onChange={(v) => update("farmerName", v)} placeholder="John Doe" required />
          <Input label="Phone Number" value={form.phoneNumber} onChange={(v) => update("phoneNumber", v)} placeholder="+256700123456" required />
          <Input label="MAAIF ID" value={form.maaifFarmerId} onChange={(v) => update("maaifFarmerId", v)} placeholder="UG-2026-..." required />
          <Input label="Cooperative Wallet (address)" value={form.cooperativeWallet} onChange={(v) => update("cooperativeWallet", v)} placeholder="0x..." required />
          <Input label="Farm Area (hectares)" type="number" value={String(form.farmAreaHectares)} onChange={(v) => update("farmAreaHectares", Number(v))} required />
          <Input label="Farm Latitude" type="number" value={String(form.farmBoundaryLat)} onChange={(v) => update("farmBoundaryLat", Number(v))} placeholder="1.3733" />
          <Input label="Farm Longitude" type="number" value={String(form.farmBoundaryLng)} onChange={(v) => update("farmBoundaryLng", Number(v))} placeholder="34.295" />
        </div>

        <label className="flex items-center gap-3 text-sm text-[oklch(80%_0.01_60)] cursor-pointer">
          <input
            type="checkbox"
            checked={form.gfwDeforestationFree}
            onChange={(e) => update("gfwDeforestationFree", e.target.checked)}
            className="accent-[#D4A053]"
          />
          GFW Deforestation-Free verified
        </label>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="dash-btn-primary w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Registering...
            </>
          ) : (
            "Register Farmer"
          )}
        </button>
      </form>
    </div>
  );
}

function Input({
  label, value, onChange, placeholder, type = "text", required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-[oklch(70%_0.01_60)]">{label}{required && " *"}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[oklch(22%_0.01_55)] border border-[oklch(30%_0.01_55)] rounded-xl px-3 py-2.5 text-sm text-[oklch(90%_0.006_60)] placeholder:text-[oklch(50%_0.01_60)] outline-none focus:border-[#D4A053] transition-colors"
      />
    </div>
  );
}
