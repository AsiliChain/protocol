import { getPublicClient } from "../mantle";
import {
  addresses,
  batchTokenAbi,
  traceLogAbi,
  purchaseOrderAbi,
} from "../contracts";
import { agents } from "./registry";
import { publishToHcs } from "../hedera";

const STAGE_NAMES = [
  "DELIVERED",   // 0
  "GRADED",      // 1
  "MILLED",      // 2
  "WAREHOUSED",  // 3
  "COMMITTED",   // 4
  "EXPORTED",    // 5
  "SETTLED",     // 6
] as const;

export interface BatchSnapshot {
  tokenId: number;
  stage: number;
  stageName: string;
  batchId: string | null;
  weightKg: number;
  grade: string | null;
  farmerWallet: `0x${string}` | null;
  mintTimestamp: number | null;
  hasActiveOrder: boolean;
}

export interface Anomaly {
  tokenId: number;
  type:
    | "missing_purchase_order"
    | "stale_exported"
    | "delivered_no_grade"
    | "unusual_weight"
    | "stage_distribution_anomaly";
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface AnomalyDetectorReport {
  agentId: string;
  agentVersion: string;
  timestamp: string;
  cycleNumber: number;
  totalScanned: number;
  batches: BatchSnapshot[];
  anomalies: Anomaly[];
  stageDistribution: Record<string, number>;
  hcsConsensusTimestamp: string | null;
}

let _cycleCounter = 0;
function nextCycle(): number {
  _cycleCounter += 1;
  return _cycleCounter;
}

/**
 * Run one full DDS Anomaly Detector cycle.
 *
 * 1. Scan token IDs 1–N and collect batch + stage data
 * 2. Cross-reference with PurchaseOrder data
 * 3. Classify anomalies
 * 4. Write summary to Hedera HCS
 *
 * @param scanLimit  Max token IDs to scan (default 1000)
 */
export async function runAnomalyDetectorCycle(
  scanLimit = 1000,
): Promise<AnomalyDetectorReport> {
  const agent = agents["anomaly-detector"];
  const client = getPublicClient();
  const cycle = nextCycle();
  const anomalies: Anomaly[] = [];
  const stageCounts: Record<string, number> = {};

  // Batch all contract reads into a single multicall to prevent RPC rate limiting.
  // Each token produces 3 calls: batchData + stages + batchToActiveOrder.
  // allowFailure ensures non-existent tokens don't block the rest.
  const contracts: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  }[] = [];

  for (let i = 1; i <= scanLimit; i++) {
    const id = BigInt(i);
    contracts.push(
      { address: addresses.batchToken, abi: batchTokenAbi, functionName: "batchData", args: [id] },
      { address: addresses.traceLog, abi: traceLogAbi, functionName: "stages", args: [id] },
      { address: addresses.purchaseOrder, abi: purchaseOrderAbi, functionName: "batchToActiveOrder", args: [id] },
    );
  }

  const multicallResults = await client.multicall({ contracts, allowFailure: true });

  const batches: BatchSnapshot[] = [];

  // multicall returns a flat array of 3 entries per token: [batchData, stages, batchToActiveOrder, ...]
  for (let i = 0; i < scanLimit; i++) {
    const tokenId = i + 1;
    const baseIdx = i * 3;
    const batchResult = multicallResults[baseIdx];
    const stageResult = multicallResults[baseIdx + 1];
    const poResult = multicallResults[baseIdx + 2];

    // Must exist in BatchToken to be meaningful
    if (batchResult.status === "failure") continue;

    const batch = (batchResult as { status: "success"; result: Record<string, unknown> }).result;
    const stageVal = stageResult.status === "success" ? Number(stageResult.result) : 0;
    const activeOrderId = poResult.status === "success" ? (poResult.result as bigint) : 0n;

    const stage = stageVal;
    const stageName =
      stage >= 0 && stage < STAGE_NAMES.length ? STAGE_NAMES[stage] : "UNKNOWN";

    // Collect batch fields
    const batchId = (batch.batchId as string) ?? null;
    const weightKg = batch.weightKg !== undefined ? Number(batch.weightKg) : 0;
    const grade = (batch.grade as string) ?? null;
    const farmerWallet = (batch.farmerWallet as `0x${string}`) ?? null;
    const mintTimestamp =
      batch.mintTimestamp !== undefined ? Number(batch.mintTimestamp) : null;

    const hasActiveOrder = activeOrderId > 0n;

    batches.push({
      tokenId,
      stage,
      stageName,
      batchId,
      weightKg,
      grade,
      farmerWallet,
      mintTimestamp,
      hasActiveOrder,
    });

    // Count stage distribution
    stageCounts[stageName] = (stageCounts[stageName] ?? 0) + 1;

    // ── Anomaly checks ──

    // A. Missing PurchaseOrder — batch at WAREHOUSED or COMMITTED
    //    with no PO ever created (batchToActiveOrder === 0).
    //    Confirmed/cancelled POs clear the active order link, so we
    //    check the raw return value from the contract.
    //    This catches batches approaching export without any buyer.
    if (stage >= 3 && stage <= 4 && activeOrderId === 0n) {
      anomalies.push({
        tokenId,
        type: "missing_purchase_order",
        severity: "warning",
        message: `Batch ${tokenId} is ${stageName} but has never had a PurchaseOrder — no buyer commitment`,
      });
    }

    // B. EXPORTED/SETTLED without grade
    if (stage >= 4 && (!grade || grade === "")) {
      anomalies.push({
        tokenId,
        type: "delivered_no_grade",
        severity: "warning",
        message: `Batch ${tokenId} reached ${stageName} without a grade`,
      });
    }

    // C. Unusual weight (extreme outlier)
    const WEIGHT_KG_DECIMALS = 10; // scaled ×10
    const rawKg = weightKg / WEIGHT_KG_DECIMALS;
    if (rawKg > 500 || (rawKg > 0 && rawKg < 5)) {
      anomalies.push({
        tokenId,
        type: "unusual_weight",
        severity: "info",
        message: `Batch ${tokenId} weight ${rawKg} kg is outside expected range (5–500 kg)`,
      });
    }

    // E. Stale EXPORTED — batch at EXPORTED for more than 72 hours
    //    (uses mintTimestamp as proxy since TraceLog lacks per-stage timestamps)
    if (stage === 5 && mintTimestamp !== null) {
      const nowSec = Math.floor(Date.now() / 1000);
      const hoursSinceMint = (nowSec - mintTimestamp) / 3600;
      if (hoursSinceMint > 72) {
        anomalies.push({
          tokenId,
          type: "stale_exported",
          severity: "critical",
          message: `Batch ${tokenId} has been at EXPORTED for ${Math.round(hoursSinceMint)}h without settling (>72h threshold)`,
        });
      }
    }
  }

  // D. Stage distribution — flag if too many EXPORTED and no SETTLED
  const exportedCount = stageCounts["EXPORTED"] ?? 0;
  const settledCount = stageCounts["SETTLED"] ?? 0;
  if (exportedCount > 0 && settledCount === 0 && batches.length > 5) {
    anomalies.push({
      tokenId: 0,
      type: "stage_distribution_anomaly",
      severity: "info",
      message: `${exportedCount} batches at EXPORTED but none at SETTLED — possible backlog`,
    });
  }

  const report: AnomalyDetectorReport = {
    agentId: agent.id,
    agentVersion: agent.version,
    timestamp: new Date().toISOString(),
    cycleNumber: cycle,
    totalScanned: batches.length,
    batches,
    anomalies,
    stageDistribution: stageCounts,
    hcsConsensusTimestamp: null,
  };

  // Write to Hedera HCS
  try {
    const hcsResult = await publishToHcs({
      topicId: process.env.HEDERA_TOPIC_ID ?? "",
      eventType: "ANOMALY_SCAN_COMPLETE",
      batchTokenId: "anomaly-detector-cycle",
      payload: {
        agent: agent.id,
        agentVersion: agent.version,
        cycle,
        totalScanned: batches.length,
        anomalyCount: anomalies.length,
        anomalies: anomalies.map((a) => ({
          tokenId: a.tokenId,
          type: a.type,
          severity: a.severity,
        })),
        stageDistribution: stageCounts,
      },
    });
    report.hcsConsensusTimestamp = hcsResult.consensusTimestamp;
  } catch (err) {
    console.warn("[anomaly-detector] HCS publish failed (non-fatal):", err);
  }

  return report;
}
