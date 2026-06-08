import { getPublicClient } from "@/lib/mantle";
import {
  addresses,
  batchTokenAbi,
  traceLogAbi,
  lendingVaultAbi,
  purchaseOrderAbi,
} from "@/lib/contracts";
import { formatUsdc, formatDate } from "@/lib/dashboard";
import { DdsButton } from "../_components/DdsButton";
import { StageControls } from "../_components/StageControls";

const STAGE_LABELS = [
  "DELIVERED", "GRADED", "MILLED", "WAREHOUSED",
  "COMMITTED", "EXPORTED", "SETTLED",
];

const LOAN_STATUS = ["Active", "Defaulted", "Settled", "Forborne"];

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
                  className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? "bg-[oklch(72%_0.16_80)] text-[oklch(12%_0.005_60)]"
                      : isCurrent
                        ? "bg-[oklch(72%_0.16_80)] text-[oklch(12%_0.005_60)] ring-2 ring-[oklch(72%_0.16_80)] ring-offset-2 ring-offset-[oklch(17%_0.008_55)]"
                        : "bg-[oklch(24%_0.008_55)] text-[oklch(42%_0.012_55)]"
                  }`}
                >
                  {i + 1}
                </div>
                {i < STAGE_LABELS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      isDone
                        ? "bg-[oklch(72%_0.16_80)]"
                        : isCurrent
                          ? "bg-gradient-to-r from-[oklch(72%_0.16_80)] to-[oklch(24%_0.008_55)]"
                          : "bg-[oklch(24%_0.008_55)]"
                    }`}
                  />
                )}
              </div>
              <span
                className={`mt-2 text-center text-[10px] font-medium leading-tight ${
                  isDone || isCurrent
                    ? "text-[oklch(72%_0.16_80)]"
                    : "text-[oklch(42%_0.012_55)]"
                }`}
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

export default async function BatchDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const tokenId = Number(params.id);

  if (!tokenId || tokenId < 1) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold" style={{ color: "oklch(93% 0.006 60)" }}>Invalid Batch</h2>
        <div className="dash-card">
          <p className="text-sm" style={{ color: "oklch(60% 0.01 60)" }}>
            Token ID must be a positive number
          </p>
          <a
            href="/batches"
            className="mt-3 inline-block text-sm font-medium"
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
        <h2 className="text-2xl font-bold" style={{ color: "oklch(93% 0.006 60)" }}>Batch Not Found</h2>
        <div className="dash-card">
          <p className="text-sm" style={{ color: "oklch(60% 0.01 60)" }}>
            No batch with token ID <strong>#{tokenId}</strong> exists on Mantle Sepolia
          </p>
          <a
            href="/batches"
            className="mt-3 inline-block text-sm font-medium"
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
    mintTimestamp,
    loanActive,
  ] = batch;

  const currentStage = stage !== null ? Number(stage) : 0;

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
          style={{ fontFamily: "'Archivo Black', sans-serif", color: "oklch(93% 0.006 60)" }}
        >
          Batch #{tokenId}
        </h2>
      </div>

      {/* Batch Info Card */}
      <div className="dash-card">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <p className="dash-table-header">Batch ID</p>
            <p className="mt-0.5 font-mono text-sm" style={{ color: "oklch(93% 0.006 60)" }}>{batchId}</p>
          </div>
          <div>
            <p className="dash-table-header">Farmer</p>
            <a
              href={`/farmers/${farmerWallet}`}
              className="mt-0.5 block font-mono text-sm hover:underline"
              style={{ color: "oklch(72% 0.16 80)" }}
            >
              {farmerWallet.slice(0, 6)}...{farmerWallet.slice(-4)}
            </a>
          </div>
          <div>
            <p className="dash-table-header">Cooperative</p>
            <p className="mt-0.5 font-mono text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
              {cooperativeWallet.slice(0, 6)}...{cooperativeWallet.slice(-4)}
            </p>
          </div>
          <div>
            <p className="dash-table-header">Minted</p>
            <p className="mt-0.5 text-sm" style={{ color: "oklch(93% 0.006 60)" }}>
              {formatDate(Number(mintTimestamp))}
            </p>
          </div>
          <div>
            <p className="dash-table-header">Weight</p>
            <p className="mt-0.5 text-sm" style={{ color: "oklch(93% 0.006 60)" }}>
              {weightKg.toString()} kg
            </p>
          </div>
          <div>
            <p className="dash-table-header">Grade</p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: "oklch(93% 0.006 60)" }}>{grade}</p>
          </div>
          <div>
            <p className="dash-table-header">Moisture</p>
            <p className="mt-0.5 text-sm" style={{ color: "oklch(93% 0.006 60)" }}>
              {moisturePct.toString()}%
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
                style={{ backgroundColor: "oklch(24% 0.008 55)", color: "oklch(42% 0.012 55)" }}
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
          <h3 className="text-sm font-semibold" style={{ color: "oklch(93% 0.006 60)" }}>
            Supply Chain Stage
          </h3>
        </div>
        <StageTimeline current={currentStage} />
        <StageControls tokenId={tokenId} currentStage={currentStage} />
      </div>

      {/* EUDR Compliance Document */}
      {currentStage >= 5 && (
        <div className="dash-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "oklch(93% 0.006 60)" }}>
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

      {/* Loan Info */}
      {loan && (
        <div className="dash-card">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "oklch(93% 0.006 60)" }}>Loan Details</h3>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="dash-table-header">Principal</p>
              <p className="mt-0.5 text-sm font-medium" style={{ color: "oklch(93% 0.006 60)" }}>
                {formatUsdc(loan[2])}
              </p>
            </div>
            <div>
              <p className="dash-table-header">Interest</p>
              <p className="mt-0.5 text-sm" style={{ color: "oklch(93% 0.006 60)" }}>
                {formatUsdc(loan[3])}
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
                className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium`}
                style={{
                  backgroundColor:
                    loan[7] === 0
                      ? "oklch(62% 0.17 155 / 0.15)"
                      : loan[7] === 1
                        ? "oklch(30% 0.12 30 / 0.2)"
                        : "oklch(24% 0.008 55)",
                  color:
                    loan[7] === 0
                      ? "oklch(62% 0.17 155)"
                      : loan[7] === 1
                        ? "oklch(70% 0.15 30)"
                        : "oklch(42% 0.012 55)",
                }}
              >
                {LOAN_STATUS[loan[7]] ?? `Unknown (${loan[7]})`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Order */}
      {order ? (
        <div className="dash-card">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "oklch(93% 0.006 60)" }}>
            Purchase Order
          </h3>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="dash-table-header">Order ID</p>
              <p className="mt-0.5 text-sm" style={{ color: "oklch(93% 0.006 60)" }}>
                #{Number(orderId).toString()}
              </p>
            </div>
            <div>
              <p className="dash-table-header">Buyer</p>
              <p className="mt-0.5 font-mono text-sm" style={{ color: "oklch(68% 0.01 58)" }}>
                {order[2].slice(0, 6)}...{order[2].slice(-4)}
              </p>
            </div>
            <div>
              <p className="dash-table-header">Organisation</p>
              <p className="mt-0.5 text-sm" style={{ color: "oklch(93% 0.006 60)" }}>{order[3]}</p>
            </div>
            <div>
              <p className="dash-table-header">Agreed Price</p>
              <p className="mt-0.5 text-sm font-medium" style={{ color: "oklch(93% 0.006 60)" }}>
                {formatUsdc(order[4])}
              </p>
            </div>
          </div>
        </div>
      ) : (
        loanActive && (
          <div className="dash-card">
            <h3 className="mb-1 text-sm font-semibold" style={{ color: "oklch(93% 0.006 60)" }}>Purchase Order</h3>
            <p className="text-sm" style={{ color: "oklch(60% 0.01 60)" }}>
              No purchase order linked to this batch
            </p>
          </div>
        )
      )}
    </div>
  );
}
