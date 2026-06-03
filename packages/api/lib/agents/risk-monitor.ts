import { getPublicClient } from "../mantle";
import {
  addresses,
  batchTokenAbi,
  lendingVaultAbi,
} from "../contracts";
import { agents } from "./registry";
import { publishToHcs } from "../hedera";

// ──────────────────────────────────────────
//  Types
// ──────────────────────────────────────────

export interface LoanPosition {
  tokenId: number;
  farmerWallet: `0x${string}`;
  batchId: string;
  weightKg: number;
  grade: string;
  principalUsdc: number;
  interestUsdc: number;
  valueUsdc: number;
  ltvBps: number;
  status: number; // 0=NONE 1=ACTIVE 2=DEFAULTED 3=SETTLED
}

export type RiskLevel = "healthy" | "warning" | "critical" | "unknown";

export interface LoanRiskAssessment {
  tokenId: number;
  level: RiskLevel;
  ltvBps: number;
  maxLtvBps: number;
  message: string;
}

export interface RiskMonitorReport {
  agentId: string;
  agentVersion: string;
  timestamp: string;
  cycleNumber: number;
  pricePerKgBase: number;
  maxLtvBps: number;
  totalLoans: number;
  activeLoans: number;
  assessments: LoanRiskAssessment[];
  portfolio: {
    totalPrincipalUsdc: number;
    totalValueUsdc: number;
    weightedAvgLtvBps: number;
    healthyCount: number;
    warningCount: number;
    criticalCount: number;
  };
  hcsConsensusTimestamp: string | null;
}

// ──────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────

/**
 * Grade multiplier as a percentage (same as LendingVault.sol).
 * Screen18 = 100%, Screen15 = 95%, FAQ = 60%, PB/PBerry = 75%, unknown = 50%.
 */
function getGradeMultiplier(grade: string): number {
  const map: Record<string, number> = {
    screen18: 100,
    screen15: 95,
    PB: 75,
    pBerry: 75,
    FAQ: 60,
  };
  return map[grade.toLowerCase()] ?? 50;
}

/**
 * Classify a loan's risk level based on LTV vs max LTV.
 */
function classifyRisk(ltvBps: number, maxLtvBps: number): LoanRiskAssessment {
  const ratio = maxLtvBps > 0 ? ltvBps / maxLtvBps : 0;

  if (ratio >= 1.0) {
    return {
      tokenId: 0,
      level: "critical",
      ltvBps,
      maxLtvBps,
      message: `LTV (${ltvBps} bps) at or above max (${maxLtvBps} bps) — collateral under water`,
    };
  }
  if (ratio >= 0.8) {
    return {
      tokenId: 0,
      level: "warning",
      ltvBps,
      maxLtvBps,
      message: `LTV (${ltvBps} bps) above 80% of max (${maxLtvBps} bps) — approaching threshold`,
    };
  }
  return {
    tokenId: 0,
    level: "healthy",
    ltvBps,
    maxLtvBps,
    message: `LTV (${ltvBps} bps) within safe range of max (${maxLtvBps} bps)`,
  };
}

// ──────────────────────────────────────────
//  Cycle counter (ephemeral — resets on restart)
// ──────────────────────────────────────────

let _cycleCounter = 0;
function nextCycle(): number {
  _cycleCounter += 1;
  return _cycleCounter;
}

// ──────────────────────────────────────────
//  Core Agent — Risk Monitor Cycle
// ──────────────────────────────────────────

/**
 * Run one full Risk Monitor assessment cycle.
 *
 * 1. Read `pricePerKgBase` and `maxLtvBps` from LendingVault
 * 2. Scan all token IDs and collect loans
 * 3. Calculate value and LTV for each active loan
 * 4. Classify risk per loan
 * 5. Write summary to Hedera HCS
 * 6. Return structured report
 *
 * @param scanLimit  Max token IDs to scan (default 1000)
 */
export async function runRiskMonitorCycle(
  scanLimit = 1000,
): Promise<RiskMonitorReport> {
  const agent = agents["risk-monitor"];
  const client = getPublicClient();
  const cycle = nextCycle();
  const now = new Date().toISOString();

  // ── Step 1: Read base parameters ──
  const [rawPricePerKg, rawMaxLtvBps] = await Promise.all([
    client.readContract({
      address: addresses.lendingVault,
      abi: lendingVaultAbi,
      functionName: "pricePerKgBase",
    }),
    client.readContract({
      address: addresses.lendingVault,
      abi: lendingVaultAbi,
      functionName: "maxLtvBps",
    }),
  ]);

  const pricePerKgBase = Number(rawPricePerKg);
  const maxLtvBps = Number(rawMaxLtvBps);

  // ── Step 2: Scan tokens ──
  const assessments: LoanRiskAssessment[] = [];
  let activeCount = 0;
  let totalPrincipal = 0;
  let totalValue = 0;
  let healthy = 0;
  let warning = 0;
  let critical = 0;

  // Build batch reads for all tokens in range
  const loanCalls = [];
  const batchCalls = [];
  for (let i = 1; i <= scanLimit; i++) {
    loanCalls.push(
      client.readContract({
        address: addresses.lendingVault,
        abi: lendingVaultAbi,
        functionName: "getLoan",
        args: [BigInt(i)],
      }).catch(() => null),
    );
    batchCalls.push(
      client.readContract({
        address: addresses.batchToken,
        abi: batchTokenAbi,
        functionName: "batchData",
        args: [BigInt(i)],
      }).catch(() => null),
    );
  }

  const loanResults = await Promise.all(loanCalls);
  const batchResults = await Promise.all(batchCalls);

  for (let i = 0; i < scanLimit; i++) {
    const tokenId = i + 1;
    const loan = loanResults[i];
    const batch = batchResults[i];

    // Skip nonexistent batches
    if (!batch) continue;

    // getLoan returns tuple: [batchTokenId, farmerWallet, principalUsdc, interestUsdc, originatedAt, expiresAt, forbearanceExpiry, status]
    // batchData returns tuple: [batchId, farmerWallet, cooperativeWallet, weightKg, grade, moisturePct, mintTimestamp, loanActive]
    const loanStatus = loan ? Number(loan[7]) : 0;
    if (loanStatus !== 1 && loanStatus !== 2) continue;

    activeCount += 1;

    const weightKg = Number(batch[3]);
    const grade = String(batch[4]);
    const gradeMultiplier = getGradeMultiplier(grade);
    const valueUsdc = (pricePerKgBase * weightKg * gradeMultiplier) / 100;

    const principalUsdc = loan ? Number(loan[2]) : 0;
    const interestUsdc = loan ? Number(loan[3]) : 0;

    // Compute LTV in basis points
    const ltvBps = valueUsdc > 0
      ? Math.round((principalUsdc / valueUsdc) * 10000)
      : 0;

    const assessment = classifyRisk(ltvBps, maxLtvBps);
    assessment.tokenId = tokenId;

    assessments.push(assessment);
    totalPrincipal += principalUsdc;
    totalValue += valueUsdc;

    if (assessment.level === "healthy") healthy += 1;
    else if (assessment.level === "warning") warning += 1;
    else if (assessment.level === "critical") critical += 1;
  }

  // ── Step 3: Build report ──
  const weightedAvgLtvBps = totalValue > 0
    ? Math.round((totalPrincipal / totalValue) * 10000)
    : 0;

  const report: RiskMonitorReport = {
    agentId: agent.id,
    agentVersion: agent.version,
    timestamp: now,
    cycleNumber: cycle,
    pricePerKgBase,
    maxLtvBps,
    totalLoans: assessments.length,
    activeLoans: activeCount,
    assessments,
    portfolio: {
      totalPrincipalUsdc: totalPrincipal,
      totalValueUsdc: totalValue,
      weightedAvgLtvBps,
      healthyCount: healthy,
      warningCount: warning,
      criticalCount: critical,
    },
    hcsConsensusTimestamp: null,
  };

  // ── Step 4: Write audit record to Hedera HCS ──
  try {
    const hcsResult = await publishToHcs({
      topicId: process.env.HEDERA_TOPIC_ID ?? "",
      eventType: "RISK_MONITOR_REPORT",
      batchTokenId: "risk-monitor-cycle",
      payload: {
        agent: agent.id,
        agentVersion: agent.version,
        cycle,
        pricePerKgBase,
        maxLtvBps,
        activeLoanCount: activeCount,
        weightedAvgLtvBps,
        healthy,
        warning,
        critical,
        assessments: assessments.map((a) => ({
          tokenId: a.tokenId,
          level: a.level,
          ltvBps: a.ltvBps,
        })),
      },
    });
    report.hcsConsensusTimestamp = hcsResult.consensusTimestamp;
  } catch (err) {
    console.warn("[risk-monitor] HCS publish failed (non-fatal):", err);
  }

  return report;
}
