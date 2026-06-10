"use client";

import { useState } from "react";
import { keccak256, toBytes } from "viem";

function addressFromNin(nin: string): `0x${string}` {
  const hash = keccak256(toBytes(`asilichain:${nin}`));
  return `0x${hash.slice(26)}` as `0x${string}`;
}

export function RegisterFarmerForm() {
  const [nin, setNin] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [maaifId, setMaaifId] = useState("");
  const [coopWallet, setCoopWallet] = useState("");
  const [area, setArea] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const derivedWallet = nin ? addressFromNin(nin) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    if (!derivedWallet) return;

    const farmBoundaryIpfsCid = keccak256(toBytes(`lat:${lat},lng:${lng}`));

    try {
      const res = await fetch("/api/farmers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerWallet: derivedWallet,
          maaifFarmerId: maaifId,
          cooperativeWallet: coopWallet,
          farmBoundaryIpfsCid,
          farmAreaHectares: Number(area),
          gfwDeforestationFree: true,
          nationalId: nin,
          farmerName: name,
          phoneNumber: phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Registration failed");
      else setResult(`Registered: ${derivedWallet}`);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setNin(""); setName(""); setPhone(""); setMaaifId("");
    setCoopWallet(""); setArea(""); setLat(""); setLng("");
    setResult(null); setError(null);
  }

  if (result) {
    return (
      <div className="dash-card p-6 text-center space-y-3">
        <div className="text-green-400 text-lg font-semibold">{result}</div>
        <button onClick={reset} className="dash-btn-primary text-sm">Register Another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="dash-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[#D4A053]">Register Farmer</h3>
      {derivedWallet && (
        <p className="text-xs text-[oklch(70%_0.01_60)] break-all">Wallet: {derivedWallet}</p>
      )}
      <Grid>
        <Field label="NIN" value={nin} onChange={setNin} required />
        <Field label="Name" value={name} onChange={setName} required />
        <Field label="Phone" value={phone} onChange={setPhone} required />
        <Field label="MAAIF ID" value={maaifId} onChange={setMaaifId} required />
        <Field label="Coop Wallet" value={coopWallet} onChange={setCoopWallet} required />
        <Field label="Area (ha)" type="number" value={area} onChange={setArea} required />
        <Field label="Latitude" value={lat} onChange={setLat} />
        <Field label="Longitude" value={lng} onChange={setLng} />
      </Grid>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button type="submit" disabled={submitting} className="dash-btn-primary w-full text-sm">
        {submitting ? "Registering..." : "Register Farmer"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required }: any) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-[oklch(70%_0.01_60)]">{label}{required && " *"}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-[oklch(82%_0.008_60)] rounded-xl px-3 py-2 text-sm text-[oklch(18%_0.01_60)] outline-none focus:border-[#C8922A] focus:ring-2 focus:ring-[#C8922A]/10 placeholder:text-[oklch(60%_0.01_58)]"
        required={required} />
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
