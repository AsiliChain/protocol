import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getEmailCode, deleteEmailCode } from "@/api/_lib/nonces";
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

  const stored = getEmailCode(email);
  if (!stored || stored.code !== code || stored.expiresAt < Date.now()) {
    return NextResponse.json({ error: "Invalid or expired code. Request a new one." }, { status: 401 });
  }

  deleteEmailCode(email);

  const publicClient = getPublicClient();
  const hasRole = await publicClient.readContract({
    address: addresses.farmerRegistry,
    abi: farmerRegistryAbi,
    functionName: "hasRole",
    args: [COOP_ROLE, stored.wallet as `0x${string}`],
  });

  if (!hasRole) {
    return NextResponse.json({ error: "Linked wallet does not have COOP_ROLE" }, { status: 403 });
  }

  const token = await new SignJWT({
    role: "COOP_ROLE",
    wallet: stored.wallet,
    sub: stored.wallet,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  return NextResponse.json({ token, role: "COOP_ROLE", wallet: stored.wallet });
}
