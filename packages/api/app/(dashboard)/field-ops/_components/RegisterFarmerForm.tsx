"use client";

import { useState } from "react";
import { keccak256, toBytes } from "viem";
import { getAuthToken } from "@/lib/auth-client";

function addressFromNin(nin: string): `0x${string}` {
  const hash = keccak256(toBytes(`asilichain:${nin}`));
  return `0x${hash.slice(26)}` as `0x${string}`;
}

const cooperatives = [
  { name: "Protocol Hub", wallet: "" },
  { name: "Rwenzori Growers", wallet: "" },
  { name: "Mt. Elgon Cooperative", wallet: "" },
  { name: "Kagera Highlands", wallet: "" },
  { name: "Western Nile Farmers", wallet: "" },
];

export function RegisterFarmerForm() {
  const [nin, setNin] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [maaifId, setMaaifId] = useState("");
  const [cooperative, setCooperative] = useState("Protocol Hub");
  const [area, setArea] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [geoJson, setGeoJson] = useState("");
  const [gfwVerified, setGfwVerified] = useState(false);
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
    const photoCid = photoFile
      ? keccak256(toBytes(`photo:${photoFile.name}:${Date.now()}`))
      : keccak256(toBytes("no-photo"));

    try {
      const res = await fetch("/api/farmers/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          farmerWallet: derivedWallet,
          maaifFarmerId: maaifId,
          cooperativeWallet: cooperative === "Protocol Hub" ? "" : cooperative,
          farmBoundaryIpfsCid,
          farmAreaHectares: Number(area),
          gfwDeforestationFree: gfwVerified,
          nationalId: nin,
          farmerName: name,
          phoneNumber: phone,
          farmPhotoIpfsCid: photoCid,
          geoJsonPolygon: geoJson || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Registration failed");
      else
        setResult(
          `Farmer registered successfully — ${name} (${derivedWallet.slice(0, 6)}...${derivedWallet.slice(-4)})`,
        );
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setNin("");
    setName("");
    setPhone("");
    setMaaifId("");
    setCooperative("Protocol Hub");
    setArea("");
    setLat("");
    setLng("");
    setPhotoFile(null);
    setGeoJson("");
    setGfwVerified(false);
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
          Register Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold" style={{ color: "oklch(72% 0.16 80)" }}>
        Register Farmer
      </h3>

      {/* Farmer Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name" value={name} onChange={setName} required placeholder="Mucunguzi Moses" />
        <Field label="NIN (National ID)" value={nin} onChange={setNin} required placeholder="CM12345678901UG" />
        <Field label="Phone" value={phone} onChange={setPhone} required placeholder="+256 700 000 000" type="tel" />
        <Field label="MAAIF Farmer ID" value={maaifId} onChange={setMaaifId} placeholder="UG-2026-..." />
        <div className="space-y-1">
          <label className="text-xs" style={{ color: "oklch(60% 0.01 58)" }}>
            Cooperative *
          </label>
          <select
            value={cooperative}
            onChange={(e) => setCooperative(e.target.value)}
            className="w-full bg-white border border-[oklch(82%_0.008_60)] rounded-xl px-3 py-2 text-sm text-[oklch(18%_0.01_60)] outline-none focus:border-[#C8922A] focus:ring-2 focus:ring-[#C8922A]/10"
          >
            {cooperatives.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Field label="Farm Area (hectares)" value={area} onChange={setArea} required type="number" placeholder="4.5" />
      </div>

      {/* Divider */}
      <div className="border-t pt-4" style={{ borderColor: "oklch(30% 0.01 55)" }}>
        <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "oklch(55% 0.012 60)" }}>
          Farm Evidence — Traceability Node 1 (EUDR)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Farm Photo */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs" style={{ color: "oklch(60% 0.01 58)" }}>
              Farm Photo *
            </label>
            <div
              className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:opacity-80 transition-opacity"
              style={{ borderColor: "oklch(40% 0.01 55)", backgroundColor: "oklch(22% 0.01 55)" }}
              onClick={() => document.getElementById("farm-photo-input")?.click()}
            >
              <input
                id="farm-photo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
              {photoFile ? (
                <div className="space-y-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 mx-auto" style={{ color: "oklch(65% 0.18 80)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                  <p className="text-xs" style={{ color: "oklch(65% 0.18 80)" }}>
                    {photoFile.name}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 mx-auto" style={{ color: "oklch(55% 0.012 60)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-xs" style={{ color: "oklch(55% 0.012 60)" }}>
                    Upload farm photo (required for origin evidence)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* GPS Coordinates */}
          <Field label="Latitude *" value={lat} onChange={setLat} required type="number" step="0.000001" placeholder="0.123456" />
          <Field label="Longitude *" value={lng} onChange={setLng} required type="number" step="0.000001" placeholder="32.123456" />

          {/* GeoJSON Polygon */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs" style={{ color: "oklch(60% 0.01 58)" }}>
              GeoJSON Polygon
            </label>
            <textarea
              value={geoJson}
              onChange={(e) => setGeoJson(e.target.value)}
              className="w-full bg-white border border-[oklch(82%_0.008_60)] rounded-xl px-3 py-2 text-sm text-[oklch(18%_0.01_60)] outline-none focus:border-[#C8922A] focus:ring-2 focus:ring-[#C8922A]/10 placeholder:text-[oklch(60%_0.01_58)] font-mono text-xs"
              rows={3}
              placeholder='{"type":"Polygon","coordinates":[[[0.12,32.1],[0.13,32.11],[0.13,32.12],[0.12,32.12],[0.12,32.1]]]}'
            />
            <p className="text-[11px]" style={{ color: "oklch(50% 0.01 58)" }}>
              Required for farms &gt; 4 hectares (EUDR Article 4). Paste GeoJSON coordinates of the farm boundary.
            </p>
          </div>
        </div>

        {/* GFW Toggle */}
        <label className="flex items-start gap-3 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={gfwVerified}
            onChange={(e) => setGfwVerified(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
            style={{ accentColor: "#C8922A" }}
          />
          <div>
            <span className="text-sm font-medium" style={{ color: "oklch(88% 0.006 60)" }}>
              Verified deforestation-free
            </span>
            <p className="text-[11px]" style={{ color: "oklch(55% 0.012 60)" }}>
              Confirmed by Global Forest Watch — no deforestation detected on this farm polygon.
            </p>
          </div>
        </label>
      </div>

      {/* Auto-derived wallet */}
      {derivedWallet && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-mono"
          style={{ backgroundColor: "oklch(72% 0.16 80 / 0.08)", color: "oklch(60% 0.01 58)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0" style={{ color: "oklch(72% 0.16 80)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
          </svg>
          <span>
            Wallet: <span className="font-medium">{derivedWallet}</span> (auto-derived from NIN)
          </span>
        </div>
      )}

      {error && (
        <p className="text-xs font-medium" style={{ color: "oklch(60% 0.18 30)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !derivedWallet}
        className="dash-btn-primary w-full text-sm"
      >
        {submitting ? "Registering..." : "Register Farmer"}
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
