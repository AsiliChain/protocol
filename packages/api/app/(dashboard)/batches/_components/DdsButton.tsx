"use client";

import { useState } from "react";

interface DdsButtonProps {
  tokenId: number;
  batchId: string;
  farmer: string;
  grade: string;
  weightKg: string;
  stage: string;
}

export function DdsButton({
  tokenId,
  batchId,
  farmer,
  grade,
  weightKg,
  stage,
}: DdsButtonProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    // Stub — simulate a brief delay, then show the mock document
    await new Promise((r) => setTimeout(r, 1200));
    setGenerating(false);
    setOpen(true);
  }

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {generating ? (
          <>
            <svg
              className="h-4 w-4 animate-spin text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Generate Compliance Document
          </>
        )}
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-navy-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-900">
                EUDR Due Diligence Statement
              </h3>
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
                DRAFT
              </span>
            </div>

            <div className="space-y-3 border-t border-navy-100 pt-4">
              <Row label="Batch Token" value={`#${tokenId} — ${batchId}`} />
              <Row label="Farmer Wallet" value={farmer} />
              <Row label="Grade" value={grade} />
              <Row label="Weight" value={`${weightKg} kg`} />
              <Row label="Supply Chain Stage" value={stage} />
              <Row label="GPS Verified" value="✅ Yes — MAAIF registered" />
              <Row label="Deforestation-Free" value="✅ GFW verified" />
              <Row label="Issued" value={new Date().toISOString().split("T")[0]} />
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-navy-100 pt-4">
              <p className="text-xs text-navy-400">
                This is a preview. Full integration with MAAIF NTS API pending.
              </p>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-navy-400">
        {label}
      </span>
      <span className="text-sm text-navy-900">{value}</span>
    </div>
  );
}
