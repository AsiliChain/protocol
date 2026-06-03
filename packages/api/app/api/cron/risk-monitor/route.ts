import { NextRequest, NextResponse } from "next/server";
import { runRiskMonitorCycle } from "@/lib/agents/risk-monitor";

/**
 * GET /api/cron/risk-monitor
 *
 * Triggered by Vercel Cron Job every 15 minutes.
 * Requires Authorization: Bearer ${CRON_SECRET} header.
 * Runs a full risk monitor cycle and returns the report.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "dev-cron-secret";

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await runRiskMonitorCycle();
    return NextResponse.json({ success: true, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
