import { getPublicClient } from "./mantle";
import {
  addresses,
  batchTokenAbi,
  farmerRegistryAbi,
  lendingVaultAbi,
  traceLogAbi,
  creditScoreAbi,
  purchaseOrderAbi,
  identityRegistryAbi,
} from "./contracts";

const publicClient = getPublicClient();

// ─── Types ──────────────────────────────────────────────

export interface DashboardStats {
  totalBatches: number;
  activeLoans: number;
  totalPrincipalUsdc: bigint;
}

export interface BatchSummary {
  tokenId: number;
  batchId: string;
  farmerWallet: string;
  weightKg: bigint;
  grade: string;
  stage: number;
  loanActive: boolean;
}

export interface LoanInfo {
  batchTokenId: number;
  farmerWallet: string;
  principalUsdc: bigint;
  interestUsdc: bigint;
  originatedAt: number;
  expiresAt: number;
  status: number;
  ltvBps?: number;
}

export interface FarmerInfo {
  farmerWallet: string;
  maaifFarmerId: string;
  cooperativeWallet: string;
  farmAreaHectares: bigint;
  gfwDeforestationFree: boolean;
  active: boolean;
  registrationTimestamp: number;
}

export interface AgentIdentity {
  agentId: number;
  name: string;
  owner: string | null;
  tokenUri: string | null;
}

const STAGES = [
  "DELIVERED",
  "GRADED",
  "MILLED",
  "WAREHOUSED",
  "COMMITTED",
  "EXPORTED",
  "SETTLED",
] as const;

export function stageLabel(s: number): string {
  return STAGES[s] ?? `UNKNOWN(${s})`;
}

export function stageColor(s: number): string {
  const colors = [
    "bg-blue-100 text-blue-800",
    "bg-purple-100 text-purple-800",
    "bg-indigo-100 text-indigo-800",
    "bg-yellow-100 text-yellow-800",
    "bg-orange-100 text-orange-800",
    "bg-pink-100 text-pink-800",
    "bg-green-100 text-green-800",
  ];
  return colors[s] ?? "bg-navy-100 text-navy-800";
}

export function ltvColor(bps: number): string {
  if (bps < 8000) return "text-risk-healthy";
  if (bps < 10000) return "text-risk-warning";
  return "text-risk-critical";
}

export function formatUsdc(amount: bigint): string {
  const whole = Number(amount) / 1_000_000;
  return whole.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Data helpers ───────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const nextTokenId = await publicClient.readContract({
    address: addresses.batchToken,
    abi: batchTokenAbi,
    functionName: "nextTokenId",
  });

  const maxTokens = Number(nextTokenId);
  const totalBatches = maxTokens - 1;

  // Scan loan data via multicall — one RPC instead of up to 200 sequential calls
  const start = Math.max(1, maxTokens - 200);
  const contracts: {
    address: `0x${string}`;
    abi: typeof lendingVaultAbi;
    functionName: "getLoan";
    args: readonly [bigint];
  }[] = [];

  for (let id = start; id < maxTokens; id++) {
    contracts.push({
      address: addresses.lendingVault,
      abi: lendingVaultAbi,
      functionName: "getLoan",
      args: [BigInt(id)],
    });
  }

  const results = await publicClient.multicall({
    contracts,
    allowFailure: true,
  });

  let activeLoans = 0;
  let totalPrincipal = 0n;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "failure") continue;
    // loan tuple: [batchTokenId, farmerWallet, principalUsdc, interestUsdc, originatedAt, expiresAt, forbearanceExpiry, status]
    const loan = r.result as readonly [bigint, string, bigint, bigint, bigint, bigint, bigint, number];
    if (loan[7] === 0) {
      activeLoans++;
      totalPrincipal += loan[2];
    }
  }

  return { totalBatches, activeLoans, totalPrincipalUsdc: totalPrincipal };
}

export async function getRecentBatches(count = 5): Promise<BatchSummary[]> {
  const nextTokenId = await publicClient.readContract({
    address: addresses.batchToken,
    abi: batchTokenAbi,
    functionName: "nextTokenId",
  });

  const maxTokens = Number(nextTokenId);
  const start = Math.max(1, maxTokens - count);
  const tokenIds: bigint[] = [];

  for (let id = maxTokens - 1; id >= start; id--) {
    tokenIds.push(BigInt(id));
  }

  // Batch batchData + stages reads into a single multicall
  const contracts: {
    address: `0x${string}`;
    abi: typeof batchTokenAbi | typeof traceLogAbi;
    functionName: string;
    args: readonly [bigint];
  }[] = [];

  for (const id of tokenIds) {
    contracts.push(
      { address: addresses.batchToken, abi: batchTokenAbi, functionName: "batchData", args: [id] },
      { address: addresses.traceLog, abi: traceLogAbi, functionName: "stages", args: [id] },
    );
  }

  const multicallResults = await publicClient.multicall({
    contracts,
    allowFailure: true,
  });

  const results: BatchSummary[] = [];

  for (let i = 0; i < tokenIds.length; i++) {
    const baseIdx = i * 2;
    const batchResult = multicallResults[baseIdx];
    const stageResult = multicallResults[baseIdx + 1];

    if (batchResult.status === "failure") continue;

    const batch = batchResult.result as readonly [string, string, string, bigint, string, bigint, bigint, boolean];
    const stage = stageResult.status === "success" ? Number(stageResult.result) : 0;

    results.push({
      tokenId: Number(tokenIds[i]),
      batchId: batch[0],
      farmerWallet: batch[1],
      weightKg: batch[3],
      grade: batch[4],
      stage,
      loanActive: batch[7],
    });
  }

  return results;
}

export async function getFarmerInfo(
  wallet: `0x${string}`,
): Promise<FarmerInfo | null> {
  try {
    const f = await publicClient.readContract({
      address: addresses.farmerRegistry,
      abi: farmerRegistryAbi,
      functionName: "getFarmer",
      args: [wallet],
    });
    return {
      farmerWallet: wallet,
      maaifFarmerId: f[0],
      cooperativeWallet: f[1],
      farmAreaHectares: f[3],
      gfwDeforestationFree: f[4],
      active: f[5],
      registrationTimestamp: Number(f[6]),
    };
  } catch {
    return null;
  }
}

export async function getFarmerCreditScore(
  wallet: `0x${string}`,
): Promise<number | null> {
  try {
    const score = await publicClient.readContract({
      address: addresses.creditScore,
      abi: creditScoreAbi,
      functionName: "getScore",
      args: [wallet],
    });
    return Number(score);
  } catch {
    return null;
  }
}

export async function getFarmerLoans(
  wallet: `0x${string}`,
): Promise<LoanInfo[]> {
  try {
    const tokenIds = await publicClient.readContract({
      address: addresses.lendingVault,
      abi: lendingVaultAbi,
      functionName: "getFarmerLoans",
      args: [wallet],
    });
    const loans: LoanInfo[] = [];
    for (const id of tokenIds) {
      const loan = await publicClient.readContract({
        address: addresses.lendingVault,
        abi: lendingVaultAbi,
        functionName: "getLoan",
        args: [id],
      });
      loans.push({
        batchTokenId: Number(loan[0]),
        farmerWallet: loan[1],
        principalUsdc: loan[2],
        interestUsdc: loan[3],
        originatedAt: Number(loan[4]),
        expiresAt: Number(loan[5]),
        status: loan[7],
      });
    }
    return loans;
  } catch {
    return [];
  }
}

export async function getAllLoans(): Promise<LoanInfo[]> {
  const nextTokenId = await publicClient.readContract({
    address: addresses.batchToken,
    abi: batchTokenAbi,
    functionName: "nextTokenId",
  });

  const loans: LoanInfo[] = [];
  const maxTokens = Number(nextTokenId);

  for (let id = 1; id < maxTokens; id++) {
    try {
      const loan = await publicClient.readContract({
        address: addresses.lendingVault,
        abi: lendingVaultAbi,
        functionName: "getLoan",
        args: [BigInt(id)],
      });
      // status: 0 = ACTIVE
      if (loan[7] !== 0) continue;

      const batch = await publicClient.readContract({
        address: addresses.batchToken,
        abi: batchTokenAbi,
        functionName: "batchData",
        args: [BigInt(id)],
      });

      loans.push({
        batchTokenId: Number(loan[0]),
        farmerWallet: loan[1],
        principalUsdc: loan[2],
        interestUsdc: loan[3],
        originatedAt: Number(loan[4]),
        expiresAt: Number(loan[5]),
        status: loan[7],
        ltvBps: undefined, // computed client-side
      });
    } catch {
      // no loan
    }
  }
  return loans;
}

export async function getAgentsIdentity(): Promise<AgentIdentity[]> {
  const registry = [
    { agentId: 0, name: "risk-monitor" },
    { agentId: 1, name: "anomaly-detector" },
  ];
  const results: AgentIdentity[] = [];
  for (const r of registry) {
    let owner: string | null = null;
    let tokenUri: string | null = null;
    try {
      owner = await publicClient.readContract({
        address: addresses.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "ownerOf",
        args: [BigInt(r.agentId)],
      });
      tokenUri = await publicClient.readContract({
        address: addresses.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "tokenURI",
        args: [BigInt(r.agentId)],
      });
    } catch {
      // not registered
    }
    results.push({ agentId: r.agentId, name: r.name, owner, tokenUri });
  }
  return results;
}
