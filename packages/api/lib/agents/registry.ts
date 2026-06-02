/**
 * AI Agent Registry — ERC-8004 identity and metadata.
 *
 * Agents are registered on-chain via IdentityRegistry (Mantle Sepolia).
 * erc8004AgentId is the sequential token ID minted by the registry.
 *
 * Every agent decision is written to Hedera HCS with the agent's
 * identity, creating a verifiable audit trail of intent and outcome.
 */

export type AgentStatus = "active" | "paused" | "deprecated";

export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  status: AgentStatus;
  erc8004AgentId: number | null; // sequential token ID from IdentityRegistry
  capabilities: string[];
  runIntervalSeconds: number;
  trigger: "scheduled" | "event";
  triggerEvent?: string;
}

export const agents: Record<string, AgentMetadata> = {
  "risk-monitor": {
    id: "asilichain-risk-monitor",
    name: "LendingVault Risk Monitor",
    description:
      "Monitors coffee price (Pyth), active loan positions, " +
      "and LTV ratios. Alerts on undercollateralisation and " +
      "stale price feeds. Writes risk assessments to Hedera HCS.",
    version: "1.0.0",
    status: "active",
    erc8004AgentId: 0, // tokenId from IdentityRegistry (Mantle Sepolia)
    capabilities: [
      "LTV calculation per active loan",
      "Portfolio-level risk aggregation",
      "Price feed staleness detection",
      "Hedera HCS audit trail",
    ],
    runIntervalSeconds: 900, // 15 minutes
    trigger: "scheduled",
  },
  "anomaly-detector": {
    id: "asilichain-anomaly-detector",
    name: "DDS Anomaly Detector",
    description:
      "Scans coffee batches for supply chain anomalies: " +
      "missing purchase orders, stalled exports, " +
      "missing grades, and unusual weights. " +
      "Writes anomaly reports to Hedera HCS.",
    version: "1.0.0",
    status: "active",
    erc8004AgentId: 1, // tokenId from IdentityRegistry (Mantle Sepolia)
    capabilities: [
      "Missing purchase order detection",
      "Stale export detection",
      "Unweighted batch detection",
      "Unusual weight outlier detection",
      "Stage distribution analysis",
      "Hedera HCS audit trail",
    ],
    runIntervalSeconds: 0, // event-triggered, not scheduled
    trigger: "event",
    triggerEvent: "BATCH_SUBMITTED",
  },
} as const;
