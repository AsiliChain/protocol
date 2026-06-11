import { NextResponse } from "next/server";
import { setNonce, cleanupExpiredNonces } from "@/api/_lib/nonces";

const NONCE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const nonce = crypto.randomUUID();
  const expiresAt = Date.now() + NONCE_TTL_MS;
  setNonce(address, nonce, expiresAt);
  cleanupExpiredNonces();

  return NextResponse.json({ nonce, expiresAt });
}
