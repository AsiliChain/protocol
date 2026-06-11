interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendVerificationEmail(params: SendEmailParams): Promise<{ success: boolean; id?: string }> {
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "AsiliChain <noreply@asilichain.xyz>",
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[email] Resend failed:", err);
      return { success: false };
    }

    const data = await res.json();
    return { success: true, id: data.id };
  }

  // Development fallback — log to console
  console.log("═══════════════════════════════════════════");
  console.log(`[EMAIL] To: ${params.to}`);
  console.log(`[EMAIL] Subject: ${params.subject}`);
  console.log(`[EMAIL] Text: ${params.text}`);
  console.log("═══════════════════════════════════════════");
  return { success: true };
}
