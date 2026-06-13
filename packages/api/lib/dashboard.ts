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

export interface PortfolioHealth {
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  weightedAvgLtvBps: number;
  totalAssessed: number;
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
  farmBoundaryIpfsCid: string;
  farmAreaHectares: bigint;
  gfwDeforestationFree: boolean;
  active: boolean;
  registrationTimestamp: number;
  nationalId: string;
  farmerName: string;
  phoneNumber: string;
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

  // Multicall3 not available on Mantle Sepolia — use individual reads in parallel
  const loanPromises: Promise<readonly [bigint, string, bigint, bigint, bigint, bigint, bigint, number] | null>[] = [];

  for (let id = 1; id < maxTokens; id++) {
    loanPromises.push(
      publicClient.readContract({
        address: addresses.lendingVault,
        abi: lendingVaultAbi,
        functionName: "getLoan",
        args: [BigInt(id)],
      })
        .then((r) => r as readonly [bigint, string, bigint, bigint, bigint, bigint, bigint, number])
        .catch(() => null),
    );
  }

  const results = await Promise.all(loanPromises);

  let activeLoans = 0;
  let totalPrincipal = 0n;

  for (let i = 0; i < results.length; i++) {
    const loan = results[i];
    if (!loan) continue;
    if (loan[7] === 1) {
      activeLoans++;
      totalPrincipal += loan[2];
    }
  }

  return { totalBatches, activeLoans, totalPrincipalUsdc: totalPrincipal };
}

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

export async function getPortfolioHealth(): Promise<PortfolioHealth | null> {
  const nextTokenId = await publicClient.readContract({
    address: addresses.batchToken,
    abi: batchTokenAbi,
    functionName: "nextTokenId",
  });

  const maxTokens = Number(nextTokenId);
  if (maxTokens <= 1) return null;

  const start = Math.max(1, maxTokens - 200);

  // Multicall3 not available on Mantle Sepolia — use individual reads in parallel
  const loanPromises: Promise<readonly [bigint, string, bigint, bigint, bigint, bigint, bigint, number] | null>[] = [];

  for (let id = start; id < maxTokens; id++) {
    loanPromises.push(
      publicClient.readContract({
        address: addresses.lendingVault,
        abi: lendingVaultAbi,
        functionName: "getLoan",
        args: [BigInt(id)],
      })
        .then((r) => r as readonly [bigint, string, bigint, bigint, bigint, bigint, bigint, number])
        .catch(() => null),
    );
  }

  const loanResults = await Promise.all(loanPromises);

  // Collect active loan data: tokenId → principalUsdc
  const activeLoanData: { tokenId: number; principalUsdc: number }[] = [];

  for (let i = 0; i < loanResults.length; i++) {
    const loan = loanResults[i];
    if (!loan) continue;
    if (loan[7] !== 1) continue;
    activeLoanData.push({
      tokenId: start + i,
      principalUsdc: Number(loan[2]),
    });
  }

  if (activeLoanData.length === 0) return null;

  // Pass 2: read price params + batchData for active loans only
  const [rawPricePerKg, rawMaxLtvBps] = await Promise.all([
    publicClient.readContract({
      address: addresses.lendingVault,
      abi: lendingVaultAbi,
      functionName: "pricePerKgBase",
    }),
    publicClient.readContract({
      address: addresses.lendingVault,
      abi: lendingVaultAbi,
      functionName: "maxLtvBps",
    }),
  ]);

  const pricePerKgBase = Number(rawPricePerKg);
  const maxLtvBps = Number(rawMaxLtvBps);

  const batchPromises: Promise<readonly [string, string, string, bigint, string, bigint, string, string, bigint, boolean] | null>[] = [];

  for (const d of activeLoanData) {
    batchPromises.push(
      publicClient.readContract({
        address: addresses.batchToken,
        abi: batchTokenAbi,
        functionName: "batchData",
        args: [BigInt(d.tokenId)],
      })
        .then((r) => r as readonly [string, string, string, bigint, string, bigint, string, string, bigint, boolean])
        .catch(() => null),
    );
  }

  const batchResults = await Promise.all(batchPromises);

  let healthy = 0;
  let warning = 0;
  let critical = 0;
  let totalPrincipal = 0;
  let totalValue = 0;

  for (let i = 0; i < activeLoanData.length; i++) {
    const d = activeLoanData[i];
    const batch = batchResults[i];
    if (!batch) continue;

    const weightKg = Number(batch[3]);
    const grade = String(batch[4]);
    const gradeMultiplier = getGradeMultiplier(grade);
    const valueUsdc = (pricePerKgBase * weightKg * gradeMultiplier) / 100;
    const ltvBps = valueUsdc > 0
      ? Math.round((d.principalUsdc / valueUsdc) * 10000)
      : 0;

    totalPrincipal += d.principalUsdc;
    totalValue += valueUsdc;

    const ratio = maxLtvBps > 0 ? ltvBps / maxLtvBps : 0;
    if (ratio >= 1.0) critical++;
    else if (ratio >= 0.8) warning++;
    else healthy++;
  }

  const weightedAvgLtvBps = totalValue > 0
    ? Math.round((totalPrincipal / totalValue) * 10000)
    : 0;

  return {
    healthyCount: healthy,
    warningCount: warning,
    criticalCount: critical,
    weightedAvgLtvBps,
    totalAssessed: healthy + warning + critical,
  };
}

export async function getRecentBatches(count = 5): Promise<BatchSummary[]> {
  const nextTokenId = await publicClient.readContract({
    address: addresses.batchToken,
    abi: batchTokenAbi,
    functionName: "nextTokenId",
  });

  const maxTokens = Number(nextTokenId);
  const start = Math.max(1, maxTokens - count);

  // Multicall3 not available on Mantle Sepolia — use individual reads in parallel
  const batchPromises: Promise<readonly [string, `0x${string}`, `0x${string}`, bigint, string, bigint, `0x${string}`, `0x${string}`, bigint, boolean] | null>[] = [];
  const stagePromises: Promise<number | null>[] = [];

  for (let id = start; id < maxTokens; id++) {
    batchPromises.push(
      publicClient.readContract({
        address: addresses.batchToken,
        abi: batchTokenAbi,
        functionName: "batchData",
        args: [BigInt(id)],
      })
        .then((r) => r as readonly [string, `0x${string}`, `0x${string}`, bigint, string, bigint, `0x${string}`, `0x${string}`, bigint, boolean])
        .catch(() => null),
    );
    stagePromises.push(
      publicClient.readContract({
        address: addresses.traceLog,
        abi: traceLogAbi,
        functionName: "stages",
        args: [BigInt(id)],
      })
        .then((r) => Number(r))
        .catch(() => null),
    );
  }

  const [batchResults, stageResults] = await Promise.all([
    Promise.all(batchPromises),
    Promise.all(stagePromises),
  ]);

  const results: BatchSummary[] = [];

  for (let i = 0; i < batchResults.length; i++) {
    const batch = batchResults[i];
    const stage = stageResults[i] ?? 0;

    if (!batch) continue;
    if (batch[1] === "0x0000000000000000000000000000000000000000") continue;

    results.push({
      tokenId: start + i,
      batchId: batch[0],
      farmerWallet: batch[1],
      weightKg: batch[3],
      grade: batch[4],
      stage,
      loanActive: batch[9],
    });
  }

  return results.reverse();
}

export async function getFarmerInfo(
  wallet: `0x${string}`,
): Promise<FarmerInfo | null> {
  try {
    const f = await publicClient.readContract({
      address: addresses.farmerRegistry,
      abi: farmerRegistryAbi,
      functionName: "farmers",
      args: [wallet],
    });
    return {
      farmerWallet: wallet,
      maaifFarmerId: f[0],
      cooperativeWallet: f[1],
      farmBoundaryIpfsCid: f[2],
      farmAreaHectares: f[3],
      gfwDeforestationFree: f[4],
      active: f[5],
      registrationTimestamp: Number(f[6]),
      nationalId: f[7],
      farmerName: f[8],
      phoneNumber: f[9],
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

  const maxTokens = Number(nextTokenId);
  if (maxTokens <= 1) return [];

  const start = Math.max(1, maxTokens - 200);

  // Multicall3 not available on Mantle Sepolia — use individual reads in parallel
  const loanPromises: Promise<readonly [bigint, string, bigint, bigint, bigint, bigint, bigint, number] | null>[] = [];

  for (let id = start; id < maxTokens; id++) {
    loanPromises.push(
      publicClient.readContract({
        address: addresses.lendingVault,
        abi: lendingVaultAbi,
        functionName: "getLoan",
        args: [BigInt(id)],
      })
        .then((r) => r as readonly [bigint, string, bigint, bigint, bigint, bigint, bigint, number])
        .catch(() => null),
    );
  }

  const loanResults = await Promise.all(loanPromises);

  // Collect active loans: ACTIVE = 1
  interface RawLoan {
    batchTokenId: bigint;
    farmerWallet: `0x${string}`;
    principalUsdc: bigint;
    interestUsdc: bigint;
    originatedAt: bigint;
    expiresAt: bigint;
    status: number;
  }

  const activeRaw: { tokenId: number; loan: RawLoan }[] = [];

  for (let i = 0; i < loanResults.length; i++) {
    const loan = loanResults[i];
    if (!loan) continue;
    if (loan[7] !== 1) continue; // LoanStatus: ACTIVE = 1
    activeRaw.push({
      tokenId: start + i,
      loan: {
        batchTokenId: loan[0],
        farmerWallet: loan[1] as `0x${string}`,
        principalUsdc: loan[2],
        interestUsdc: loan[3],
        originatedAt: loan[4],
        expiresAt: loan[5],
        status: loan[7],
      },
    });
  }

  if (activeRaw.length === 0) return [];

  return activeRaw.map((a) => ({
    batchTokenId: a.tokenId,
    farmerWallet: a.loan.farmerWallet,
    principalUsdc: a.loan.principalUsdc,
    interestUsdc: a.loan.interestUsdc,
    originatedAt: Number(a.loan.originatedAt),
    expiresAt: Number(a.loan.expiresAt),
    status: a.loan.status,
    ltvBps: undefined,
  }));
}

export async function getAgentsIdentity(): Promise<AgentIdentity[]> {
  const registry = [
    { agentId: 0, name: "risk-monitor" },
    { agentId: 1, name: "anomaly-detector" },
  ];

  const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("RPC timeout")), ms));

  const fetchAgent = async (agentId: number): Promise<AgentIdentity> => {
    let owner: string | null = null;
    let tokenUri: string | null = null;
    try {
      [owner, tokenUri] = await Promise.race([
        Promise.all([
          publicClient.readContract({
            address: addresses.identityRegistry,
            abi: identityRegistryAbi,
            functionName: "ownerOf",
            args: [BigInt(agentId)],
          }),
          publicClient.readContract({
            address: addresses.identityRegistry,
            abi: identityRegistryAbi,
            functionName: "tokenURI",
            args: [BigInt(agentId)],
          }),
        ]),
        timeout(8000),
      ]);
    } catch {
      // RPC timeout or contract not registered
    }
    return { agentId, name: registry.find((r) => r.agentId === agentId)?.name ?? "", owner, tokenUri };
  };

  // Fetch both agents in parallel with a combined timeout
  const results = await Promise.all(registry.map((r) => fetchAgent(r.agentId)));
  return results;
}
