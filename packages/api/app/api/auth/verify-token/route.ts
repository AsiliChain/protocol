import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { verifyMagicToken } from "@/lib/nonce";
import { getWalletForEmail } from "@/lib/email-wallets";
import { getPublicClient } from "@/lib/mantle";
import { addresses, farmerRegistryAbi } from "@/lib/contracts";
import { keccak256, toBytes } from "viem";

const COOP_ROLE = keccak256(toBytes("COOP_ROLE"));
const JWT_SECRET = new TextEncoder().encode(process.env.API_JWT_SECRET || "fallback-secret-change-in-production");
const JWT_EXPIRES_IN = "24h";

export async function POST(request: Request) {
  let body: { token: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { token } = body;
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  // Token is HMAC based — we need to find which email it belongs to.
  // Iterate all registered emails to find a match.
  const { getAllCoopEmails } = await import("@/lib/email-wallets");
  const emails = getAllCoopEmails();

  let matchedEmail: string | null = null;
  for (const email of emails) {
    if (await verifyMagicToken(email, token)) {
      matchedEmail = email;
      break;
    }
  }

  if (!matchedEmail) {
    return NextResponse.json({ error: "Invalid or expired link. Request a new one." }, { status: 401 });
  }

  const wallet = getWalletForEmail(matchedEmail);
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
    console.error("[auth/verify-token] RPC error:", message);
    return NextResponse.json({ error: "Failed to verify role. Check network connection." }, { status: 502 });
  }

  if (!hasRole) {
    return NextResponse.json({ error: "Linked wallet does not have COOP_ROLE" }, { status: 403 });
  }

  const jwt = await new SignJWT({
    role: "COOP_ROLE",
    wallet,
    sub: wallet,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  return NextResponse.json({ token: jwt, role: "COOP_ROLE", wallet });
}
