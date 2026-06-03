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
          const isFuture = i > current;
          return (
            <div key={i} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? "bg-brand-500 text-white"
                      : isCurrent
                        ? "bg-brand-600 text-white ring-2 ring-brand-200 ring-offset-2"
                        : "bg-navy-100 text-navy-400"
                  }`}
                >
                  {i + 1}
                </div>
                {i < STAGE_LABELS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      isDone
                        ? "bg-brand-300"
                        : isCurrent
                          ? "bg-gradient-to-r from-brand-300 to-navy-200"
                          : "bg-navy-100"
                    }`}
                  />
                )}
              </div>
              <span
                className={`mt-2 text-center text-[10px] font-medium leading-tight ${
                  isDone || isCurrent ? "text-navy-900" : "text-navy-300"
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
        <h2 className="text-2xl font-bold text-navy-900">Invalid Batch</h2>
        <div className="rounded-xl border border-navy-200 bg-white p-6">
          <p className="text-sm text-navy-400">
            Token ID must be a positive number
          </p>
          <a
            href="/batches"
            className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ← Back to batches
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
        <h2 className="text-2xl font-bold text-navy-900">Batch Not Found</h2>
        <div className="rounded-xl border border-navy-200 bg-white p-6">
          <p className="text-sm text-navy-400">
            No batch with token ID <strong>#{tokenId}</strong> exists on Mantle
            Sepolia
          </p>
          <a
            href="/batches"
            className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ← Back to batches
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
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← Batches
        </a>
        <h2 className="mt-1 text-2xl font-bold text-navy-900">
          Batch #{tokenId}
        </h2>
      </div>

      {/* Batch Info Card */}
      <div className="rounded-xl border border-navy-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
              Batch ID
            </p>
            <p className="mt-0.5 font-mono text-sm text-navy-900">{batchId}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
              Farmer
            </p>
            <a
              href={`/farmers/${farmerWallet}`}
              className="mt-0.5 block font-mono text-sm text-brand-600 hover:underline"
            >
              {farmerWallet.slice(0, 6)}...{farmerWallet.slice(-4)}
            </a>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
              Cooperative
            </p>
            <p className="mt-0.5 font-mono text-sm text-navy-600">
              {cooperativeWallet.slice(0, 6)}...{cooperativeWallet.slice(-4)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
              Minted
            </p>
            <p className="mt-0.5 text-sm text-navy-900">
              {formatDate(Number(mintTimestamp))}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
              Weight
            </p>
            <p className="mt-0.5 text-sm text-navy-900">
              {weightKg.toString()} kg
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
              Grade
            </p>
            <p className="mt-0.5 text-sm font-medium text-navy-900">{grade}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
              Moisture
            </p>
            <p className="mt-0.5 text-sm text-navy-900">
              {moisturePct.toString()}%
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
              Loan Status
            </p>
            {loanActive ? (
              <span className="mt-0.5 inline-block rounded-full bg-risk-healthy/10 px-2.5 py-0.5 text-xs font-medium text-risk-healthy">
                Active
              </span>
            ) : (
              <span className="mt-0.5 inline-block rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-medium text-navy-500">
                Inactive
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stage Timeline */}
      <div className="rounded-xl border border-navy-200 bg-white p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold text-navy-900">Supply Chain Stage</h3>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
            {STAGE_LABELS[currentStage] ?? `Unknown (${currentStage})`}
          </span>
        </div>
        <StageTimeline current={currentStage} />
      </div>

      {/* EUDR Compliance Document */}
      {currentStage >= 5 && (
        <div className="rounded-xl border border-navy-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-navy-900">
                EUDR Compliance Document
              </h3>
              <p className="mt-1 text-sm text-navy-400">
                Generate an automated Due Diligence Statement for this batch.
                GPS coordinates, deforestation-free status, and supply chain
                history are included.
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
        <div className="rounded-xl border border-navy-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-navy-900">Loan Details</h3>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                Principal
              </p>
              <p className="mt-0.5 text-sm font-medium text-navy-900">
                {formatUsdc(loan[2])}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                Interest
              </p>
              <p className="mt-0.5 text-sm text-navy-900">
                {formatUsdc(loan[3])}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                Originated
              </p>
              <p className="mt-0.5 text-sm text-navy-600">
                {formatDate(Number(loan[4]))}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                Expires
              </p>
              <p className="mt-0.5 text-sm text-navy-600">
                {formatDate(Number(loan[5]))}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                Status
              </p>
              <span
                className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  loan[7] === 0
                    ? "bg-risk-healthy/10 text-risk-healthy"
                    : loan[7] === 1
                      ? "bg-risk-critical/10 text-risk-critical"
                      : "bg-navy-100 text-navy-600"
                }`}
              >
                {LOAN_STATUS[loan[7]] ?? `Unknown (${loan[7]})`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Order */}
      {order ? (
        <div className="rounded-xl border border-navy-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-navy-900">
            Purchase Order
          </h3>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                Order ID
              </p>
              <p className="mt-0.5 text-sm text-navy-900">
                #{Number(orderId).toString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                Buyer
              </p>
              <p className="mt-0.5 font-mono text-sm text-navy-600">
                {order[2].slice(0, 6)}...{order[2].slice(-4)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                Organisation
              </p>
              <p className="mt-0.5 text-sm text-navy-900">{order[3]}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                Agreed Price
              </p>
              <p className="mt-0.5 text-sm font-medium text-navy-900">
                {formatUsdc(order[4])}
              </p>
            </div>
          </div>
        </div>
      ) : (
        loanActive && (
          <div className="rounded-xl border border-navy-200 bg-white p-5">
            <h3 className="mb-1 font-semibold text-navy-900">Purchase Order</h3>
            <p className="text-sm text-navy-400">
              No purchase order linked to this batch
            </p>
          </div>
        )
      )}
    </div>
  );
}
