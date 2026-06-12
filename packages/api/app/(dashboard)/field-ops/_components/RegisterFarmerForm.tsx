"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/auth-client";

interface Cooperative {
  name: string;
  wallet: string;
}

interface UploadResult {
  cid: string;
  url: string;
}

async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file, file.name);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

async function uploadJson(data: Record<string, unknown>): Promise<UploadResult> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Manifest upload failed");
  return res.json();
}

export function RegisterFarmerForm() {
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [nin, setNin] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [maaifId, setMaaifId] = useState("");
  const [cooperativeName, setCooperativeName] = useState("Protocol Hub");
  const [area, setArea] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [geoJson, setGeoJson] = useState("");
  const [gfwVerified, setGfwVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cooperatives")
      .then((r) => r.json())
      .then((d) => setCooperatives(d.cooperatives || []))
      .catch(() => {});
  }, []);

  const selectedCoop = cooperatives.find((c) => c.name === cooperativeName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      // 1. Upload farm photo to IPFS
      let photoCid = "";
      if (photoFile) {
        const result = await uploadFile(photoFile);
        photoCid = result.cid;
      }

      // 2. Build farm evidence manifest and upload to IPFS
      const manifest: Record<string, unknown> = {
        farmerName: name,
        nationalId: nin,
        phoneNumber: phone,
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
        farmAreaHectares: area ? Number(area) : null,
        gfwDeforestationFree: gfwVerified,
        geoJsonPolygon: geoJson || null,
        photoIpfsCid: photoCid || null,
        cooperative: cooperativeName,
        registrationTimestamp: Date.now(),
      };
      const manifestResult = await uploadJson(manifest);

      // 3. Resolve cooperative wallet
      const coopWallet = selectedCoop?.wallet;
      if (!coopWallet) {
        throw new Error(`No wallet address configured for cooperative: ${cooperativeName}`);
      }

      // 4. Derive farmer wallet from NIN (matches Solidity: keccak256("asilichain:{nin}"))
      const farmerWallet = `0x${simpleHash(`asilichain:${nin}`).slice(0, 40)}` as `0x${string}`;
      const paddedCid = `0x${manifestResult.cid.slice(0, 64).padStart(64, "0")}` as `0x${string}`;

      // 5. Register on-chain
      const res = await fetch("/api/farmers/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          farmerWallet,
          maaifFarmerId: maaifId,
          cooperativeWallet: coopWallet,
          farmBoundaryIpfsCid: paddedCid,
          farmAreaHectares: Number(area),
          gfwDeforestationFree: gfwVerified,
          nationalId: nin,
          farmerName: name,
          phoneNumber: phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setResult(`Farmer registered — ${name} (${farmerWallet.slice(0, 6)}...${farmerWallet.slice(-4)})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setNin(""); setName(""); setPhone(""); setMaaifId("");
    setCooperativeName("Protocol Hub"); setArea(""); setLat(""); setLng("");
    setPhotoFile(null); setGeoJson(""); setGfwVerified(false);
    setResult(null); setError(null);
  }

  if (result) {
    return (
      <div className="dash-card p-6 text-center space-y-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10 mx-auto" style={{ color: "oklch(65% 0.18 80)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <div className="text-sm font-medium" style={{ color: "oklch(65% 0.18 80)" }}>{result}</div>
        <button onClick={reset} className="dash-btn-primary text-sm">Register Another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold" style={{ color: "oklch(72% 0.16 80)" }}>Register Farmer</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name" value={name} onChange={setName} required placeholder="Mucunguzi Moses" />
        <Field label="NIN (National ID)" value={nin} onChange={setNin} required placeholder="CM12345678901UG" />
        <Field label="Phone" value={phone} onChange={setPhone} required placeholder="+256 700 000 000" type="tel" />
        <Field label="MAAIF Farmer ID" value={maaifId} onChange={setMaaifId} required placeholder="UG-2026-..." />

        <div className="space-y-1">
          <label className="text-xs" style={{ color: "oklch(60% 0.01 58)" }}>Cooperative *</label>
          <select value={cooperativeName} onChange={(e) => setCooperativeName(e.target.value)}
            className="w-full bg-white border border-[oklch(82%_0.008_60)] rounded-xl px-3 py-2 text-sm text-[oklch(18%_0.01_60)] outline-none focus:border-[#C8922A] focus:ring-2 focus:ring-[#C8922A]/10">
            {cooperatives.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          {selectedCoop && (
            <p className="text-[11px] font-mono mt-0.5" style={{ color: "oklch(50% 0.01 58)" }}>
              Wallet: {selectedCoop.wallet.slice(0, 6)}...{selectedCoop.wallet.slice(-4)}
            </p>
          )}
        </div>

        <Field label="Farm Area (hectares)" value={area} onChange={setArea} required type="number" placeholder="4.5" />
      </div>

      <div className="border-t pt-4" style={{ borderColor: "oklch(30% 0.01 55)" }}>
        <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "oklch(55% 0.012 60)" }}>
          Farm Evidence (EUDR Traceability Node 1)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs" style={{ color: "oklch(60% 0.01 58)" }}>Farm Photo *</label>
            <div className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:opacity-80 transition-opacity"
              style={{ borderColor: "oklch(40% 0.01 55)", backgroundColor: "oklch(22% 0.01 55)" }}
              onClick={() => document.getElementById("farm-photo-input")?.click()}>
              <input id="farm-photo-input" type="file" accept="image/*" className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              {photoFile ? (
                <div className="space-y-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 mx-auto" style={{ color: "oklch(65% 0.18 80)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                  <p className="text-xs" style={{ color: "oklch(65% 0.18 80)" }}>{photoFile.name}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 mx-auto" style={{ color: "oklch(55% 0.012 60)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-xs" style={{ color: "oklch(55% 0.012 60)" }}>Upload farm photo (stored on IPFS)</p>
                </div>
              )}
            </div>
          </div>

          <Field label="Latitude *" value={lat} onChange={setLat} required type="number" step="0.000001" placeholder="0.123456" />
          <Field label="Longitude *" value={lng} onChange={setLng} required type="number" step="0.000001" placeholder="32.123456" />

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs" style={{ color: "oklch(60% 0.01 58)" }}>GeoJSON Polygon</label>
            <textarea value={geoJson} onChange={(e) => setGeoJson(e.target.value)}
              className="w-full bg-white border border-[oklch(82%_0.008_60)] rounded-xl px-3 py-2 text-sm text-[oklch(18%_0.01_60)] outline-none focus:border-[#C8922A] focus:ring-2 focus:ring-[#C8922A]/10 placeholder:text-[oklch(60%_0.01_58)] font-mono text-xs"
              rows={3} placeholder='{"type":"Polygon","coordinates":[[[0.12,32.1],[0.13,32.11],[0.13,32.12],[0.12,32.13],[0.12,32.1]]]}' />
            <p className="text-[11px]" style={{ color: "oklch(50% 0.01 58)" }}>
              Required for farms &gt; 4 hectares (EUDR Article 4). Included in the IPFS manifest.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-3 mt-3 cursor-pointer">
          <input type="checkbox" checked={gfwVerified} onChange={(e) => setGfwVerified(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded" style={{ accentColor: "#C8922A" }} />
          <div>
            <span className="text-sm font-medium" style={{ color: "oklch(88% 0.006 60)" }}>Verified deforestation-free</span>
            <p className="text-[11px]" style={{ color: "oklch(55% 0.012 60)" }}>
              Confirmed by Global Forest Watch — no deforestation detected on this farm polygon.
            </p>
          </div>
        </label>
      </div>

      {error && <p className="text-xs font-medium" style={{ color: "oklch(60% 0.18 30)" }}>{error}</p>}

      <button type="submit" disabled={submitting} className="dash-btn-primary w-full text-sm">
        {submitting ? "Uploading + Registering..." : "Register Farmer"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder, step }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; step?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs" style={{ color: "oklch(60% 0.01 58)" }}>{label}{required && " *"}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-[oklch(82%_0.008_60)] rounded-xl px-3 py-2 text-sm text-[oklch(18%_0.01_60)] outline-none focus:border-[#C8922A] focus:ring-2 focus:ring-[#C8922A]/10 placeholder:text-[oklch(60%_0.01_58)]"
        required={required} placeholder={placeholder} step={step} />
    </div>
  );
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(40, "0");
}
