import { NextRequest, NextResponse } from "next/server";
import { runRiskMonitorCycle } from "@/lib/agents/risk-monitor";
import { agents } from "@/lib/agents/registry";

/**
 * GET /api/agents/risk-monitor
 *
 * Returns agent metadata and the latest run status.
 * Does NOT trigger a new cycle — use POST for that.
 */
export async function GET() {
  const agent = agents["risk-monitor"];

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      version: agent.version,
      status: agent.status,
      capabilities: agent.capabilities,
    },
    runIntervalSeconds: agent.runIntervalSeconds,
    lastRun: null,
    docs: "POST /api/agents/risk-monitor to trigger a cycle",
  });
}

/**
 * POST /api/agents/risk-monitor
 *
 * Triggers one full Risk Monitor assessment cycle.
 * Reads on-chain state, computes LTVs, writes to Hedera HCS.
 *
 * Query params:
 *   ?scanLimit=N  — max token IDs to scan (default 1000, max 5000)
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scanLimit = Math.min(
    Number(searchParams.get("scanLimit")) || 1000,
    5000,
  );

  try {
    const report = await runRiskMonitorCycle(scanLimit);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
