"use client";

import { useState, useEffect } from "react";
import { keccak256, toBytes } from "viem";
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

// Auto-generate a GeoJSON polygon from a center GPS point and farm area.
// Produces a simple bounding-box polygon rounded to 6 decimal places (EUDR spec).
function generateGeoJsonPolygon(lat: number, lng: number, areaHectares: number): object {
  const sideMeters = Math.sqrt(Math.max(areaHectares, 0.01) * 10000);
  const halfSide = sideMeters / 2;
  const latDelta = halfSide / 111320;
  const lngDelta = halfSide / (111320 * Math.cos(lat * Math.PI / 180));
  const round = (v: number) => Math.round(v * 1_000_000) / 1_000_000;
  return {
    type: "Polygon",
    coordinates: [[
      [round(lng - lngDelta), round(lat - latDelta)],
      [round(lng + lngDelta), round(lat - latDelta)],
      [round(lng + lngDelta), round(lat + latDelta)],
      [round(lng - lngDelta), round(lat + latDelta)],
      [round(lng - lngDelta), round(lat - latDelta)],
    ]],
  };
}

type GfwStatus = "pending" | "verified" | "flagged";

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
  const [gfwStatus, setGfwStatus] = useState<GfwStatus>("pending");
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

      // 2. Auto-generate GeoJSON polygon from GPS + area
      const polygon = generateGeoJsonPolygon(Number(lat), Number(lng), Number(area));

      // 3. Build farm evidence manifest and upload to IPFS
      const manifest: Record<string, unknown> = {
        farmerName: name,
        nationalId: nin,
        phoneNumber: phone,
        latitude: Number(lat),
        longitude: Number(lng),
        farmAreaHectares: Number(area),
        gfwDeforestationFree: gfwStatus === "verified",
        gfwStatus,
        geoJsonPolygon: polygon,
        photoIpfsCid: photoCid || null,
        cooperative: cooperativeName,
        registrationTimestamp: Date.now(),
      };
      const manifestResult = await uploadJson(manifest);

      // 4. Resolve cooperative wallet
      const coopWallet = selectedCoop?.wallet;
      if (!coopWallet) {
        throw new Error(`No wallet address configured for cooperative: ${cooperativeName}`);
      }

      // Hash the IPFS CID into bytes32 for on-chain commitment
      const cidBytes32 = keccak256(toBytes(manifestResult.cid));

      // 5. Register on-chain (server derives wallet from NIN)
      const res = await fetch("/api/farmers/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          maaifFarmerId: maaifId,
          cooperativeWallet: coopWallet,
          farmBoundaryIpfsCid: cidBytes32,
          farmAreaHectares: Math.round(Number(area) * 100), // ×100 scaling (contract: 250 = 2.50 ha)
          gfwDeforestationFree: gfwStatus === "verified",
          nationalId: nin,
          farmerName: name,
          phoneNumber: phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setResult(`Farmer registered — ${name} (${data.farmerWallet?.slice(0, 6)}...${data.farmerWallet?.slice(-4)})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setNin(""); setName(""); setPhone(""); setMaaifId("");
    setCooperativeName("Protocol Hub"); setArea(""); setLat(""); setLng("");
    setPhotoFile(null); setGfwStatus("pending");
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

        </div>

        <div className="space-y-2 mt-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(55% 0.012 60)" }}>
            Deforestation Status
          </p>
          <div className="flex gap-2">
            {([["pending", "⏳", "Pending", "oklch(50% 0.01 58)", "Not yet checked against GFW"],
              ["verified", "✓", "Deforestation-Free", "oklch(50% 0.16 155)", "GFW confirmed — no deforestation since Dec 2020"],
              ["flagged", "⚠", "Risk Flagged", "oklch(55% 0.18 40)", "Possible deforestation detected — review required"],
            ] as const).map(([key, icon, label, color, desc]) => (
              <button key={key} type="button" onClick={() => setGfwStatus(key as GfwStatus)}
                className={`flex-1 rounded-xl border p-3 text-left transition-all ${
                  gfwStatus === key ? "ring-2" : "opacity-60 hover:opacity-100"
                }`}
                style={{
                  borderColor: gfwStatus === key ? color : "oklch(82% 0.008 60)",
                  backgroundColor: gfwStatus === key ? `${color}10` : "white",
                  boxShadow: gfwStatus === key ? `0 0 0 2px ${color}40` : "none",
                }}>
                <div className="text-sm font-medium" style={{ color }}>{icon} {label}</div>
                <p className="text-[11px] mt-0.5" style={{ color: "oklch(50% 0.01 58)" }}>{desc}</p>
              </button>
            ))}
          </div>
        </div>
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


