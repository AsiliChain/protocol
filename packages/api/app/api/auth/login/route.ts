import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { recoverMessageAddress, keccak256, toBytes } from "viem";
import { getPublicClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi } from "@/lib/contracts";
import { getNonce, deleteNonce } from "@/api/_lib/nonces";

const COOP_ROLE = keccak256(toBytes("COOP_ROLE"));
const JWT_SECRET = new TextEncoder().encode(process.env.API_JWT_SECRET || "fallback-secret-change-in-production");
const JWT_EXPIRES_IN = "24h";

export async function POST(request: Request) {
  let body: { address: string; signature: string; nonce: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { address, signature, nonce } = body;

  if (!address || !signature || !nonce) {
    return NextResponse.json({ error: "address, signature, and nonce are required" }, { status: 400 });
  }

  const stored = getNonce(address);
  if (!stored || stored.nonce !== nonce || stored.expiresAt < Date.now()) {
    return NextResponse.json({ error: "Invalid or expired nonce. Request a new one." }, { status: 401 });
  }

  deleteNonce(address);

  const recovered = await recoverMessageAddress({
    message: nonce,
    signature: signature as `0x${string}`,
  });

  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: "Signature does not match address" }, { status: 401 });
  }

  const publicClient = getPublicClient();
  const hasRole = await publicClient.readContract({
    address: addresses.farmerRegistry,
    abi: farmerRegistryAbi,
    functionName: "hasRole",
    args: [COOP_ROLE, address as `0x${string}`],
  });

  if (!hasRole) {
    return NextResponse.json({ error: "Wallet does not have COOP_ROLE" }, { status: 403 });
  }

  const token = await new SignJWT({
    role: "COOP_ROLE",
    wallet: address,
    sub: address,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  return NextResponse.json({ token, role: "COOP_ROLE", wallet: address });
}
