import { NextResponse } from "next/server";
import { getWalletForEmail } from "@/lib/email-wallets";
import { sendVerificationEmail } from "@/lib/email";
import { createEmailCode, codeExpiresAt, createMagicToken } from "@/lib/nonce";

export async function POST(request: Request) {
  let body: { email: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email } = body;
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const wallet = getWalletForEmail(email);
  if (!wallet) {
    return NextResponse.json({ error: "Email not registered. Contact protocol admin to link your wallet." }, { status: 404 });
  }

  const code = await createEmailCode(email);
  const token = await createMagicToken(email);
  const expiresAt = codeExpiresAt();
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/verify?token=${token}`;

  console.log(`[auth/request-code] Code for ${email}: ${code} (expires at ${new Date(expiresAt).toISOString()})`);

  await sendVerificationEmail({
    to: email,
    subject: "Your AsiliChain verification code",
    html: `
      <div style="font-family: system-ui; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">AsiliChain Verification</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f5f5f5; border-radius: 8px; text-align: center;">
          ${code}
        </div>
        <p style="margin-top: 24px;">Or click the link below to sign in:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #C8922A; color: #1a1a1a; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Sign in to AsiliChain
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">This code and link expire in 5 minutes.</p>
      </div>
    `,
    text: `Your AsiliChain verification code: ${code}\n\nOr click: ${verifyUrl}\n\nThis code and link expire in 5 minutes.`,
  });

  return NextResponse.json({ success: true, expiresAt });
}
