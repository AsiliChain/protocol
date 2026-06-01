import { parseFonbnkWebhook, type FonbnkWebhookPayload } from "@/lib/fonbnk";

/**
 * POST /api/webhooks/fonbnk
 *
 * Receives order-status-change events from Fonbnk.
 * Triggered when a payout to a farmer's MTN Mobile Money settles, fails, etc.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const raw = await request.json();
    const webhook = parseFonbnkWebhook(raw);

    const { order } = webhook.data;

    switch (order.status) {
      case "payout_successful":
        console.log(
          "[fonbnk:webhook] payout settled",
          JSON.stringify({
            orderId: order.id,
            depositAmountUsd: order.deposit.cashout.amountBeforeFeesUsd,
            payoutAmount: order.payout.cashout.amountAfterFees,
            payoutCurrency: order.payout.currencyCode,
          }),
        );
        break;

      case "failed":
        console.error(
          "[fonbnk:webhook] payout failed",
          JSON.stringify({ orderId: order.id }),
        );
        break;

      default:
        console.log(
          "[fonbnk:webhook] status change",
          order.id,
          order.status,
        );
    }

    return Response.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[fonbnk:webhook]", message);
    return Response.json({ received: false, error: message }, { status: 400 });
  }
}
