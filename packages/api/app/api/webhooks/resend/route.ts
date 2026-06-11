import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const FORWARD_TO = process.env.RESEND_FORWARD_TO || "moemucu@gmail.com";
const ALLOWED_INBOX = "hello@asilichain.xyz";

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[resend-webhook] RESEND_API_KEY not set, skipping");
    return NextResponse.json({ ok: true });
  }

  const resend = new Resend(apiKey);

  try {
    const rawBody = await request.text();

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const headers = {
        id: request.headers.get("webhook-id") || "",
        timestamp: request.headers.get("webhook-timestamp") || "",
        signature: request.headers.get("webhook-signature") || "",
      };

      try {
        resend.webhooks.verify({
          payload: rawBody,
          headers,
          webhookSecret,
        });
      } catch {
        console.error("[resend-webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);

    if (event.type === "email.received") {
      const to: string[] = event.data.to || [];

      const isForHello = to.some(
        (addr) => addr.toLowerCase() === ALLOWED_INBOX,
      );
      if (!isForHello) {
        console.log(`[resend-webhook] Skipped ${event.data.email_id} — not for ${ALLOWED_INBOX}`);
        return NextResponse.json({ ok: true });
      }

      const { data, error } = await resend.emails.receiving.forward({
        emailId: event.data.email_id,
        to: FORWARD_TO,
        from: "AsiliChain <hello@asilichain.xyz>",
      });

      if (error) {
        console.error("[resend-webhook] Forward failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log(`[resend-webhook] Forwarded ${event.data.email_id} → ${FORWARD_TO}`);
      return NextResponse.json({ ok: true, id: data?.id });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[resend-webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
