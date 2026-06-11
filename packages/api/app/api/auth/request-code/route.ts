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
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://asilichain.xyz"}/asilichain-logo.svg`;

  console.log(`[auth/request-code] Code for ${email}: ${code} (expires at ${new Date(expiresAt).toISOString()})`);

  await sendVerificationEmail({
    to: email,
    subject: "Your AsiliChain verification code",
    html: `
      <table role="presentation" style="width: 100%; max-width: 480px; margin: 0 auto; font-family: system-ui, sans-serif;">
        <tr>
          <td style="padding: 32px 24px;">
            <table role="presentation" style="width: 100%;">
              <tr>
                <td style="width: 48px; vertical-align: middle;">
                  <img src="${logoUrl}" alt="AsiliChain" width="160" height="51" style="display: block; max-width: 160px; height: auto;" />
                </td>
                <td style="vertical-align: middle; padding-left: 16px;">
                  <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1a1a1a;">AsiliChain Protocol Verification</h1>
                </td>
              </tr>
            </table>
            <p style="font-size: 15px; color: #333; margin-top: 28px;">Your verification code is:</p>
            <div style="font-size: 40px; font-weight: 800; letter-spacing: 10px; padding: 20px; background: #f5f0e8; border-radius: 10px; text-align: center; color: #2d2d2d; user-select: all; -webkit-user-select: all; cursor: text;">
              ${code}
            </div>
            <p style="font-size: 15px; color: #333; margin-top: 24px;">Or click the button below to sign in:</p>
            <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: #C8922A; color: #1a1a1a; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
              Sign in to AsiliChain
            </a>
            <p style="color: #888; font-size: 12px; margin-top: 28px; line-height: 1.5;">
              This code and link expire in 5 minutes.
            </p>
          </td>
        </tr>
      </table>
    `,
    text: `Your AsiliChain verification code: ${code}\n\nOr open: ${verifyUrl}\n\nThis code and link expire in 5 minutes.`,
  });

  return NextResponse.json({ success: true, expiresAt });
}
