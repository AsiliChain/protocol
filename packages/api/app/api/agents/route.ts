import { NextResponse } from "next/server";
import { agents } from "@/lib/agents/registry";

/**
 * GET /api/agents
 *
 * Lists all registered AI agents, their identities,
 * status, and documented run intervals.
 */
export async function GET() {
  const entries = Object.entries(agents).map(([key, agent]) => ({
    id: agent.id,
    name: agent.name,
    version: agent.version,
    status: agent.status,
    capabilities: agent.capabilities,
    runIntervalSeconds: agent.runIntervalSeconds,
    endpoint: `/api/agents/${key}`,
  }));

  return NextResponse.json({
    count: entries.length,
    agents: entries,
  });
}
