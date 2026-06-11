import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { verifyEmailCode } from "@/lib/nonce";
import { getWalletForEmail } from "@/lib/email-wallets";
import { getPublicClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi } from "@/lib/contracts";
import { keccak256, toBytes } from "viem";

const COOP_ROLE = keccak256(toBytes("COOP_ROLE"));
const JWT_SECRET = new TextEncoder().encode(process.env.API_JWT_SECRET || "fallback-secret-change-in-production");
const JWT_EXPIRES_IN = "24h";

export async function POST(request: Request) {
  let body: { email: string; code: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, code } = body;
  if (!email || !code) {
    return NextResponse.json({ error: "email and code are required" }, { status: 400 });
  }

  const valid = await verifyEmailCode(email, code);
  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired code. Request a new one." }, { status: 401 });
  }

  const wallet = getWalletForEmail(email);
  if (!wallet) {
    return NextResponse.json({ error: "Email not registered." }, { status: 404 });
  }

  const publicClient = getPublicClient();
  let hasRole: boolean;
  try {
    hasRole = await publicClient.readContract({
      address: addresses.farmerRegistry,
      abi: farmerRegistryAbi,
      functionName: "hasRole",
      args: [COOP_ROLE, wallet as `0x${string}`],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "RPC error";
    console.error("[auth/verify-code] RPC error:", message);
    return NextResponse.json({ error: "Failed to verify role. Check network connection." }, { status: 502 });
  }

  if (!hasRole) {
    return NextResponse.json({ error: "Linked wallet does not have COOP_ROLE" }, { status: 403 });
  }

  const token = await new SignJWT({
    role: "COOP_ROLE",
    wallet,
    sub: wallet,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  return NextResponse.json({ token, role: "COOP_ROLE", wallet });
}
