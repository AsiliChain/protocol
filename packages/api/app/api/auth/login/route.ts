import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { recoverMessageAddress, keccak256, toBytes } from "viem";
import { getPublicClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi } from "@/lib/contracts";
import { verifyNonce } from "@/lib/nonce";

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

  const nonceCheck = await verifyNonce(address, nonce);
  if (!nonceCheck.valid) {
    return NextResponse.json({ error: nonceCheck.reason || "Invalid nonce" }, { status: 401 });
  }

  let recovered: `0x${string}`;
  try {
    recovered = await recoverMessageAddress({
      message: nonce,
      signature: signature as `0x${string}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: "Signature does not match address" }, { status: 401 });
  }

  const publicClient = getPublicClient();
  let hasRole: boolean;
  try {
    hasRole = await publicClient.readContract({
      address: addresses.farmerRegistry,
      abi: farmerRegistryAbi,
      functionName: "hasRole",
      args: [COOP_ROLE, address as `0x${string}`],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "RPC error";
    console.error("[auth/login] RPC error checking COOP_ROLE:", message);
    return NextResponse.json({ error: "Failed to verify role. Check network connection." }, { status: 502 });
  }

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
