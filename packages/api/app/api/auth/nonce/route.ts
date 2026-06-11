import { NextResponse } from "next/server";
import { createNonce } from "@/lib/nonce";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const { nonce, expiresAt } = await createNonce(address);

  return NextResponse.json({ nonce, expiresAt });
}
