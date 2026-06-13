import { getPublicClient } from "@/lib/mantle";
import {
  addresses,
  batchTokenAbi,
  traceLogAbi,
  lendingVaultAbi,
  purchaseOrderAbi,
  farmerRegistryAbi,
} from "@/lib/contracts";
import { formatUsdc, formatDate } from "@/lib/dashboard";
import { DdsButton } from "../_components/DdsButton";
import { BatchActions } from "../_components/BatchActions";

const STAGE_LABELS = [
  "DELIVERED", "GRADED", "MILLED", "WAREHOUSED",
  "COMMITTED", "EXPORTED", "SETTLED",
];

// Matches LendingVault LoanStatus enum: NONE=0, ACTIVE=1, DEFAULTED=2, SETTLED=3
const LOAN_STATUS = ["None", "Active", "Defaulted", "Settled"];

function StageTimeline({ current }: { current: number }) {
  return (
    <div className="py-4">
      <div className="flex items-center justify-between">
        {STAGE_LABELS.map((label, i) => {
          const isDone = i < current;
          const isCurrent = i === current;
          return (
            <div key={i} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: isDone
                      ? "oklch(72% 0.16 80)"
                      : isCurrent
                      ? "oklch(62% 0.14 65)"
                      : "oklch(88% 0.006 60)",
                    color: isDone || isCurrent ? "oklch(12% 0.005 60)" : "oklch(55% 0.012 60)",
                    boxShadow: isCurrent ? "0 0 0 3px oklch(72% 0.16 80 / 0.3)" : undefined,
                  }}
                >
                  {i + 1}
                </div>
                {i < STAGE_LABELS.length - 1 && (
                  <div
                    className="h-0.5 flex-1"
                    style={{
                      backgroundColor: isDone
                        ? "oklch(72% 0.16 80)"
                        : isCurrent
                        ? "oklch(55% 0.012 60)"
                        : "oklch(88% 0.006 60)",
                    }}
                  />
                )}
              </div>
              <span
                className="mt-2 text-center text-[10px] font-medium leading-tight"
                style={{
                  color: isDone || isCurrent ? "oklch(18% 0.01 60)" : "oklch(55% 0.012 60)",
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tokenId = Number(id);

  if (!tokenId || tokenId < 1) {
    return (
      <div className="space-y-6">
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: "oklch(18% 0.01 60)" }}
        >
          Invalid Batch
        </h2>
        <div className="dash-card p-6">
          <p className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
            Token ID must be a positive number
          </p>
          <a
            href="/batches"
            className="mt-3 inline-block text-sm font-medium hover:underline"
            style={{ color: "oklch(72% 0.16 80)" }}
          >
            &larr; Back to batches
          </a>
        </div>
      </div>
    );
  }

  const publicClient = getPublicClient();

  const batchReq = publicClient
    .readContract({
      address: addresses.batchToken,
      abi: batchTokenAbi,
      functionName: "batchData",
      args: [BigInt(tokenId)],
    })
    .catch(() => null);

  const stageReq = publicClient
    .readContract({
      address: addresses.traceLog,
      abi: traceLogAbi,
      functionName: "stages",
      args: [BigInt(tokenId)],
    })
    .catch(() => null);

  const loanReq = publicClient
    .readContract({
      address: addresses.lendingVault,
      abi: lendingVaultAbi,
      functionName: "getLoan",
      args: [BigInt(tokenId)],
    })
    .catch(() => null);

  const orderIdReq = publicClient
    .readContract({
      address: addresses.purchaseOrder,
      abi: purchaseOrderAbi,
      functionName: "batchToActiveOrder",
      args: [BigInt(tokenId)],
    })
    .catch(() => null);

  const [batch, stage, loan, orderId] = await Promise.all([
    batchReq,
    stageReq,
    loanReq,
    orderIdReq,
  ]);

  if (!batch) {
    return (
      <div className="space-y-6">
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: "oklch(18% 0.01 60)" }}
        >
          Batch Not Found
        </h2>
        <div className="dash-card p-6">
          <p className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
            No batch with token ID <strong style={{ color: "oklch(18% 0.01 60)" }}>#{tokenId}</strong> exists on Mantle Sepolia
          </p>
          <a
            href="/batches"
            className="mt-3 inline-block text-sm font-medium hover:underline"
            style={{ color: "oklch(72% 0.16 80)" }}
          >
            &larr; Back to batches
          </a>
        </div>
      </div>
    );
  }

  const [
    batchId,
    farmerWallet,
    cooperativeWallet,
    weightKg,
    grade,
    moisturePct,
    , // collectionPointHash (skip)
    , // weightSlipIpfsCid (skip)
    mintTimestamp,
    loanActive,
  ] = batch;

  const currentStage = stage !== null ? Number(stage) : 0;

  let farmerName: string | null = null;
  let farmerNationalId: string | null = null;
  let farmerPhone: string | null = null;
  try {
    const farmerData = await publicClient.readContract({
      address: addresses.farmerRegistry,
      abi: farmerRegistryAbi,
      functionName: "farmers",
      args: [farmerWallet],
    });
    farmerName = farmerData[8];
    farmerNationalId = farmerData[7];
    farmerPhone = farmerData[9];
  } catch {
  }

  let ltvBps: number | null = null;
  let maxLtvBps: number | null = null;
  if (loan && loan[7] === 1) {
    try {
      const [rawPricePerKg, rawMaxLtv] = await Promise.all([
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
      maxLtvBps = Number(rawMaxLtv);
      const collateralValue = Number(weightKg) * pricePerKgBase;
      if (collateralValue > 0) {
        ltvBps = Math.round((Number(loan[2]) / collateralValue) * 10000);
      }
    } catch {
      // price params unavailable for LTV
    }
  }

  let order = null;
  if (orderId !== null && Number(orderId) > 0) {
    order = await publicClient
      .readContract({
        address: addresses.purchaseOrder,
        abi: purchaseOrderAbi,
        functionName: "orders",
        args: [orderId],
      })
      .catch(() => null);
  }

  return (
    <div className="space-y-6">
      <div>
        <a
          href="/batches"
          className="text-sm font-medium hover:underline"
          style={{ color: "oklch(72% 0.16 80)" }}
        >
          &larr; Batches
        </a>
        <h2
          className="mt-1 text-2xl font-bold"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: "oklch(18% 0.01 60)" }}
        >
          Batch #{tokenId}
        </h2>
      </div>

      <div className="dash-card">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <p className="dash-table-header">Batch ID</p>
            <p className="mt-0.5 font-mono text-sm" style={{ color: "oklch(18% 0.01 60)" }}>{batchId}</p>
          </div>
          <div>
            <p className="dash-table-header">Farmer</p>
            <a
              href={`/farmers/${farmerWallet}`}
              className="mt-0.5 block font-mono text-sm hover:underline"
              style={{ color: "oklch(72% 0.16 80)" }}
            >
              {truncateAddress(farmerWallet)}
            </a>
          </div>
          <div>
            <p className="dash-table-header">Cooperative</p>
            <p className="mt-0.5 font-mono text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
              {truncateAddress(cooperativeWallet)}
            </p>
          </div>
          <div>
            <p className="dash-table-header">Minted</p>
            <p className="mt-0.5 text-sm" style={{ color: "oklch(18% 0.01 60)" }}>
              {formatDate(Number(mintTimestamp))}
            </p>
          </div>
          <div>
            <p className="dash-table-header">Weight</p>
            <p className="mt-0.5 text-sm" style={{ color: "oklch(18% 0.01 60)" }}>
              {Number(weightKg).toLocaleString()} kg
            </p>
          </div>
          <div>
            <p className="dash-table-header">Grade</p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: "oklch(18% 0.01 60)" }}>{grade}</p>
          </div>
          <div>
            <p className="dash-table-header">Moisture</p>
            <p className="mt-0.5 text-sm" style={{ color: "oklch(18% 0.01 60)" }}>
              {(Number(moisturePct) / 10).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="dash-table-header">Loan Status</p>
            {loanActive ? (
              <span
                className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: "oklch(62% 0.17 155 / 0.15)", color: "oklch(62% 0.17 155)" }}
              >
                Active
              </span>
            ) : (
              <span
                className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: "oklch(88% 0.006 60)", color: "oklch(55% 0.012 60)" }}
              >
                Inactive
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stage Timeline + Controls */}
      <div className="dash-card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
            Supply Chain Stage
          </h3>
        </div>
        <StageTimeline current={currentStage} />
        <BatchActions tokenId={tokenId} currentStage={currentStage} />
      </div>

      {/* Farmer Info Card */}
      <div className="dash-card">
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
          Farmer Information
        </h3>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <p className="dash-table-header">Name</p>
            <p className="mt-0.5 text-sm" style={{ color: "oklch(18% 0.01 60)" }}>
              {farmerName ?? "Unknown"}
            </p>
          </div>
          <div>
            <p className="dash-table-header">Wallet</p>
            <a
              href={`/farmers/${farmerWallet}`}
              className="mt-0.5 block font-mono text-sm hover:underline"
              style={{ color: "oklch(72% 0.16 80)" }}
            >
              {truncateAddress(farmerWallet)}
            </a>
          </div>
          <div>
            <p className="dash-table-header">National ID</p>
            <p className="mt-0.5 font-mono text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
              {farmerNationalId ?? "N/A"}
            </p>
          </div>
          <div>
            <p className="dash-table-header">Phone</p>
            <p className="mt-0.5 text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
              {farmerPhone ?? "N/A"}
            </p>
          </div>
          <div>
            <p className="dash-table-header">Cooperative</p>
            <p className="mt-0.5 font-mono text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
              {truncateAddress(cooperativeWallet)}
            </p>
          </div>
        </div>
      </div>

      {/* Batch Metadata Card */}
      <div className="dash-card">
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
          Batch Metadata
        </h3>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <p className="dash-table-header">Weight</p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: "oklch(18% 0.01 60)" }}>
              {Number(weightKg).toLocaleString()} kg
            </p>
          </div>
          <div>
            <p className="dash-table-header">Grade</p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: "oklch(18% 0.01 60)" }}>
              {grade}
            </p>
          </div>
          <div>
            <p className="dash-table-header">Moisture</p>
            <p className="mt-0.5 text-sm" style={{ color: "oklch(18% 0.01 60)" }}>
              {(Number(moisturePct) / 10).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="dash-table-header">Minted</p>
            <p className="mt-0.5 text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
              {formatDate(Number(mintTimestamp))}
            </p>
          </div>
          <div>
            <p className="dash-table-header">Current Stage</p>
            <span
              className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: "oklch(72% 0.16 80 / 0.15)", color: "oklch(72% 0.16 80)" }}
            >
              {STAGE_LABELS[currentStage]}
            </span>
          </div>
          <div>
            <p className="dash-table-header">Batch ID</p>
            <p className="mt-0.5 font-mono text-xs" style={{ color: "oklch(68% 0.01 58)" }}>
              {batchId}
            </p>
          </div>
        </div>
      </div>

      {/* EUDR Compliance Document */}
      {currentStage >= 5 && (
        <div className="dash-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
                EUDR Compliance Document
              </h3>
              <p className="mt-1 text-sm" style={{ color: "oklch(60% 0.01 60)" }}>
                Generate an automated Due Diligence Statement for this batch.
              </p>
            </div>
            <DdsButton
              tokenId={tokenId}
              batchId={batchId}
              farmer={farmerWallet}
              grade={grade}
              weightKg={weightKg.toString()}
              stage={STAGE_LABELS[currentStage]}
            />
          </div>
        </div>
      )}

      {/* Loan Info Card */}
      {loan && (
        <div className="dash-card">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
            Loan Details
          </h3>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="dash-table-header">Principal</p>
              <p className="mt-0.5 text-sm font-medium" style={{ color: "oklch(18% 0.01 60)" }}>
                {formatUsdc(loan[2])} USDC
              </p>
            </div>
            <div>
              <p className="dash-table-header">Interest</p>
              <p className="mt-0.5 text-sm" style={{ color: "oklch(18% 0.01 60)" }}>
                {formatUsdc(loan[3])} USDC
              </p>
            </div>
            <div>
              <p className="dash-table-header">Interest Rate</p>
              <p className="mt-0.5 text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
                10% APR
              </p>
            </div>
            <div>
              <p className="dash-table-header">LTV</p>
              <p
                className="mt-0.5 text-sm font-medium"
                style={{
                  color: ltvBps !== null
                    ? ltvBps < 8000
                      ? "oklch(62% 0.17 155)"
                      : ltvBps < 10000
                      ? "oklch(70% 0.15 75)"
                      : "oklch(55% 0.2 25)"
                    : "oklch(55% 0.012 60)",
                }}
              >
                {ltvBps !== null ? `${(ltvBps / 100).toFixed(1)}%` : "N/A"}
                {maxLtvBps !== null && ltvBps !== null && (
                  <span style={{ color: "oklch(55% 0.012 60)" }}> / {(maxLtvBps / 100).toFixed(0)}% max</span>
                )}
              </p>
            </div>
            <div>
              <p className="dash-table-header">Originated</p>
              <p className="mt-0.5 text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
                {formatDate(Number(loan[4]))}
              </p>
            </div>
            <div>
              <p className="dash-table-header">Expires</p>
              <p className="mt-0.5 text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
                {formatDate(Number(loan[5]))}
              </p>
            </div>
            <div>
              <p className="dash-table-header">Status</p>
              <span
                className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor:
                    loan[7] === 1
                      ? "oklch(62% 0.17 155 / 0.15)"
                      : loan[7] === 3
                      ? "oklch(72% 0.16 80 / 0.15)"
                      : loan[7] === 2
                      ? "oklch(55% 0.2 25 / 0.15)"
                      : "oklch(88% 0.006 60)",
                  color:
                    loan[7] === 1
                      ? "oklch(62% 0.17 155)"
                      : loan[7] === 3
                      ? "oklch(72% 0.16 80)"
                      : loan[7] === 2
                      ? "oklch(55% 0.2 25)"
                      : "oklch(55% 0.012 60)",
                }}
              >
                {LOAN_STATUS[loan[7]] ?? `Unknown (${loan[7]})`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Order Card */}
      {order ? (
        <div className="dash-card">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
            Purchase Order
          </h3>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="dash-table-header">Order ID</p>
              <p className="mt-0.5 text-sm" style={{ color: "oklch(18% 0.01 60)" }}>
                #{Number(orderId).toString()}
              </p>
            </div>
            <div>
              <p className="dash-table-header">Buyer</p>
              <p className="mt-0.5 font-mono text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
                {truncateAddress(order[2])}
              </p>
            </div>
            <div>
              <p className="dash-table-header">Organisation</p>
              <p className="mt-0.5 text-sm" style={{ color: "oklch(18% 0.01 60)" }}>{order[3]}</p>
            </div>
            <div>
              <p className="dash-table-header">Agreed Price</p>
              <p className="mt-0.5 text-sm font-medium" style={{ color: "oklch(18% 0.01 60)" }}>
                {formatUsdc(order[4])} USDC
              </p>
            </div>
            <div>
              <p className="dash-table-header">Created</p>
              <p className="mt-0.5 text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
                {Number(order[5]) > 0 ? formatDate(Number(order[5])) : "Pending"}
              </p>
            </div>
            <div>
              <p className="dash-table-header">Confirmed</p>
              <p className="mt-0.5 text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
                {Number(order[6]) > 0 ? formatDate(Number(order[6])) : "Pending"}
              </p>
            </div>
            <div>
              <p className="dash-table-header">Status</p>
              <span
                className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: Number(order[7]) > 0 ? "oklch(72% 0.16 80 / 0.15)" : "oklch(88% 0.006 60)",
                  color: Number(order[7]) > 0 ? "oklch(72% 0.16 80)" : "oklch(55% 0.012 60)",
                }}
              >
                {Number(order[7]) === 0 ? "Pending" : Number(order[7]) === 1 ? "Confirmed" : `Status ${order[7]}`}
              </span>
            </div>
          </div>
        </div>
      ) : (
        loanActive && (
          <div className="dash-card">
            <h3 className="mb-1 text-sm font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
              Purchase Order
            </h3>
            <p className="text-sm" style={{ color: "oklch(60% 0.01 60)" }}>
              No purchase order linked to this batch
            </p>
          </div>
        )
      )}
    </div>
  );
}
