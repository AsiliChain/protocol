import { NextRequest, NextResponse } from "next/server";
import { runAnomalyDetectorCycle } from "@/lib/agents/anomaly-detector";
import { agents } from "@/lib/agents/registry";

/**
 * GET /api/agents/anomaly-detector
 *
 * Returns agent metadata. Does NOT trigger a cycle.
 */
export async function GET() {
  const agent = agents["anomaly-detector"];

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
    docs: "POST /api/agents/anomaly-detector to trigger a scan cycle",
  });
}

/**
 * POST /api/agents/anomaly-detector
 *
 * Triggers one full DDS Anomaly Detector scan.
 * Scans all batch token IDs, reads stages + purchase orders,
 * and classifies anomalies.
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
    const report = await runAnomalyDetectorCycle(scanLimit);

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
