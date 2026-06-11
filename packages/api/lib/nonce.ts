// Stateless HMAC nonce — no server-side storage needed. Works across Vercel serverless instances.

const NONCE_TTL_MS = 5 * 60 * 1000;

function getSecret(): string {
  return process.env.API_JWT_SECRET || "fallback-secret-change-in-production";
}

async function hmacSign(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createNonce(address: string): Promise<{ nonce: string; expiresAt: number }> {
  const expiresAt = Date.now() + NONCE_TTL_MS;
  const payload = `${address.toLowerCase()}:${expiresAt}`;
  const sig = await hmacSign(payload);
  const nonce = `${payload}:${sig}`;
  return { nonce, expiresAt };
}

export async function verifyNonce(address: string, nonce: string): Promise<{ valid: boolean; reason?: string }> {
  const parts = nonce.split(":");
  if (parts.length < 3) {
    return { valid: false, reason: "Malformed nonce" };
  }

  const [addr, expiryStr, ...sigParts] = parts;
  const sig = sigParts.join(":");

  if (addr !== address.toLowerCase()) {
    return { valid: false, reason: "Address mismatch" };
  }

  const expiresAt = Number(expiryStr);
  if (isNaN(expiresAt) || expiresAt < Date.now()) {
    return { valid: false, reason: "Nonce expired. Request a new one." };
  }

  const payload = `${addr}:${expiryStr}`;
  const expected = await hmacSign(payload);

  if (sig !== expected) {
    return { valid: false, reason: "Invalid nonce signature" };
  }

  return { valid: true };
}

// ── Stateless email OTP ──

const OTP_TTL_MS = 5 * 60 * 1000;

function otpTimeWindow(): number {
  return Math.floor(Date.now() / OTP_TTL_MS) * OTP_TTL_MS;
}

export async function createEmailCode(email: string): Promise<string> {
  const sig = await hmacSign(`otp:${email.toLowerCase()}:${otpTimeWindow()}`);
  const num = parseInt(sig.slice(0, 8), 16); // first 8 hex chars → 0..4B
  return (100000 + (num % 900000)).toString(); // 6-digit code 100000–999999
}

export function codeExpiresAt(): number {
  return otpTimeWindow() + OTP_TTL_MS;
}

export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  const expected = await createEmailCode(email);
  return expected === code;
}

export async function createMagicToken(email: string): Promise<string> {
  return hmacSign(`magic:${email.toLowerCase()}:${otpTimeWindow()}`);
}

export async function verifyMagicToken(email: string, token: string): Promise<boolean> {
  const expected = await createMagicToken(email);
  // Also check previous time window (for edge case where request straddles window boundary)
  if (expected === token) return true;
  const prevSig = await hmacSign(`magic:${email.toLowerCase()}:${otpTimeWindow() - OTP_TTL_MS}`);
  return prevSig === token;
}
