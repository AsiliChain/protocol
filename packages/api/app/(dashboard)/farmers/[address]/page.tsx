import Link from "next/link";
export const dynamic = "force-dynamic";
import {
  getFarmerInfo,
  getFarmerCreditScore,
  getFarmerLoans,
  getRecentBatches,
  formatUsdc,
  formatDate,
  stageLabel,
  stageColor,
  type LoanInfo,
  type BatchSummary,
} from "@/lib/dashboard";

export default async function FarmerDetailPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const wallet = address as `0x${string}`;

  let farmer = null;
  let creditScore: number | null = null;
  let loans: LoanInfo[] = [];
  let batches: BatchSummary[] = [];

  try {
    farmer = await getFarmerInfo(wallet);
  } catch {
    farmer = null;
  }

  try {
    creditScore = await getFarmerCreditScore(wallet);
  } catch {
    creditScore = null;
  }

  try {
    loans = await getFarmerLoans(wallet);
  } catch {
    loans = [];
  }

  try {
    batches = await getRecentBatches(50);
  } catch {
    batches = [];
  }

  if (!farmer) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy-900">Farmer Not Found</h1>
        <div className="rounded-lg border border-navy-200 bg-white p-6">
          <p className="text-sm text-navy-400">
            No farmer registered with wallet address{" "}
            <code className="rounded bg-navy-100 px-2 py-0.5 font-mono text-xs text-navy-700">
              {wallet}
            </code>
          </p>
          <Link
            href="/batches"
            className="mt-4 inline-block text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
          >
            &larr; Back to batches
          </Link>
        </div>
      </div>
    );
  }

  const activeLoans = loans.filter((l) => l.status === 0);
  const farmerBatches = batches.filter(
    (b) => b.farmerWallet.toLowerCase() === wallet.toLowerCase(),
  );

  const scoreColor =
    creditScore !== null
      ? creditScore >= 70
        ? "text-risk-healthy"
        : creditScore >= 40
          ? "text-risk-warning"
          : "text-risk-critical"
      : "text-navy-400";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/batches"
          className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          &larr; Batches
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-navy-900">
          Farmer Profile
        </h1>
      </div>

      <div className="rounded-lg border border-navy-200 bg-white p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                Wallet
              </p>
              <p className="font-mono text-sm text-navy-900">
                {farmer.farmerWallet}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                  MAAIF ID
                </p>
                <p className="text-sm text-navy-900">
                  {farmer.maaifFarmerId}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                  Cooperative
                </p>
                <p className="font-mono text-sm text-navy-900">
                  {farmer.cooperativeWallet.slice(0, 6)}...
                  {farmer.cooperativeWallet.slice(-4)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                  Farm Area
                </p>
                <p className="text-sm text-navy-900">
                  {Number(farmer.farmAreaHectares)} hectares
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
                  Registered
                </p>
                <p className="text-sm text-navy-900">
                  {formatDate(farmer.registrationTimestamp)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {farmer.active ? (
              <span className="rounded-full bg-risk-healthy/10 px-3 py-1 text-xs font-medium text-risk-healthy">
                Active
              </span>
            ) : (
              <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-medium text-navy-500">
                Inactive
              </span>
            )}
            {farmer.gfwDeforestationFree && (
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
                GFW Deforestation-Free
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-navy-200 bg-white p-6">
        <h2 className="mb-3 font-semibold text-navy-900">Credit Score</h2>
        {creditScore !== null ? (
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-bold ${scoreColor}`}>
              {creditScore}
            </span>
            <span className="text-lg text-navy-400">/ 100</span>
          </div>
        ) : (
          <p className="text-sm text-navy-400">No credit score</p>
        )}
      </div>

      <div className="rounded-lg border border-navy-200 bg-white p-6">
        <h2 className="mb-3 font-semibold text-navy-900">Active Loans</h2>
        {activeLoans.length === 0 ? (
          <p className="text-sm text-navy-400">No active loans</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-xs font-medium uppercase tracking-wide text-navy-400">
                  <th className="pb-2 pr-4">Batch Token ID</th>
                  <th className="pb-2 pr-4">Principal</th>
                  <th className="pb-2 pr-4">Interest</th>
                  <th className="pb-2 pr-4">Originated</th>
                  <th className="pb-2 pr-4">Expires</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {activeLoans.map((l) => (
                  <tr
                    key={l.batchTokenId}
                    className="border-b border-navy-50 transition-colors hover:bg-navy-50/50"
                  >
                    <td className="py-2.5 pr-4 font-mono text-xs text-navy-900">
                      #{l.batchTokenId}
                    </td>
                    <td className="py-2.5 pr-4 text-navy-900">
                      ${formatUsdc(l.principalUsdc)}
                    </td>
                    <td className="py-2.5 pr-4 text-navy-900">
                      ${formatUsdc(l.interestUsdc)}
                    </td>
                    <td className="py-2.5 pr-4 text-navy-600">
                      {formatDate(l.originatedAt)}
                    </td>
                    <td className="py-2.5 pr-4 text-navy-600">
                      {formatDate(l.expiresAt)}
                    </td>
                    <td className="py-2.5">
                      <Link
                        href={`/batches/${l.batchTokenId}`}
                        className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
                      >
                        View batch
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-navy-200 bg-white p-6">
        <h2 className="mb-3 font-semibold text-navy-900">Batch History</h2>
        {farmerBatches.length === 0 ? (
          <p className="text-sm text-navy-400">No batches recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-xs font-medium uppercase tracking-wide text-navy-400">
                  <th className="pb-2 pr-4">Token ID</th>
                  <th className="pb-2 pr-4">Batch ID</th>
                  <th className="pb-2 pr-4">Weight</th>
                  <th className="pb-2 pr-4">Grade</th>
                  <th className="pb-2 pr-4">Stage</th>
                  <th className="pb-2">Loan</th>
                </tr>
              </thead>
              <tbody>
                {farmerBatches.map((b) => (
                  <tr
                    key={b.tokenId}
                    className="border-b border-navy-50 transition-colors hover:bg-navy-50/50"
                  >
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/batches/${b.tokenId}`}
                        className="font-mono text-xs text-brand-600 transition-colors hover:text-brand-700 hover:underline"
                      >
                        #{b.tokenId}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-navy-600">
                      {b.batchId.slice(0, 10)}...
                    </td>
                    <td className="py-2.5 pr-4 text-navy-900">
                      {b.weightKg.toString()} kg
                    </td>
                    <td className="py-2.5 pr-4 text-navy-900">{b.grade}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColor(b.stage)}`}
                      >
                        {stageLabel(b.stage)}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {b.loanActive ? (
                        <span className="text-risk-healthy">&#9679;</span>
                      ) : (
                        <span className="text-navy-300">&#9675;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
