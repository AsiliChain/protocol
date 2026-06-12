import { keccak256, toBytes } from "viem";

const PINATA_JWT = process.env.PINATA_JWT;

interface UploadResult {
  cid: string;
  url: string;
}

async function pinToPinata(data: FormData): Promise<UploadResult> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: data,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata upload failed: ${err}`);
  }
  const json = await res.json();
  return { cid: json.IpfsHash, url: `https://gateway.pinata.cloud/ipfs/${json.IpfsHash}` };
}

async function pinJsonToPinata(json: Record<string, unknown>): Promise<UploadResult> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(json),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata JSON upload failed: ${err}`);
  }
  const json_resp = await res.json();
  return { cid: json_resp.IpfsHash, url: `https://gateway.pinata.cloud/ipfs/${json_resp.IpfsHash}` };
}

function deterministicCid(data: string): UploadResult {
  const hash = keccak256(toBytes(data));
  const cid = hash.slice(2, 18);
  return { cid, url: `ipfs://${cid}` };
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // File upload (photo, GeoJSON)
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return Response.json({ error: "No file provided" }, { status: 400 });
      }

      if (PINATA_JWT) {
        const pinataForm = new FormData();
        pinataForm.append("file", file, file.name);
        const result = await pinToPinata(pinataForm);
        return Response.json(result);
      }

      // Fallback: deterministic CID from file hash
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      const result = deterministicCid(hex);
      return Response.json(result);
    }

    // JSON upload (farm evidence manifest)
    const body = await request.json();
    if (PINATA_JWT) {
      const result = await pinJsonToPinata(body);
      return Response.json(result);
    }

    // Fallback: deterministic CID from JSON string
    const result = deterministicCid(JSON.stringify(body));
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[upload]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
