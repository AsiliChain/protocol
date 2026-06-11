"use client";

import { useState } from "react";
import { authHeaders } from "@/lib/auth-client";

const STAGE_LABELS = [
  "DELIVERED", "GRADED", "MILLED", "WAREHOUSED",
  "COMMITTED", "EXPORTED", "SETTLED",
];

interface StageControlsProps {
  tokenId: number;
  currentStage: number;
}

export function StageControls({ tokenId, currentStage }: StageControlsProps) {
  const [advancing, setAdvancing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAtEnd = currentStage >= STAGE_LABELS.length - 1;
  const nextStage = isAtEnd ? null : currentStage + 1;

  async function handleAdvance() {
    if (nextStage === null) return;
    setAdvancing(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/batch/${tokenId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ newStage: nextStage }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Stage update failed");
      } else {
        setMessage(`Advanced to ${STAGE_LABELS[nextStage]} — ${data.transactionHash.slice(0, 10)}...`);
      }
    } catch {
      setError("Network error");
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {!isAtEnd ? (
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className="dash-btn-primary text-sm disabled:opacity-50"
          >
            {advancing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Advancing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
                </svg>
                Advance to {STAGE_LABELS[nextStage!]}
              </>
            )}
          </button>
        ) : (
          <span
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: "oklch(62% 0.17 155 / 0.15)", color: "oklch(62% 0.17 155)" }}
          >
            Final stage reached
          </span>
        )}

        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-medium"
          style={{
            backgroundColor: "oklch(72% 0.16 80 / 0.15)",
            color: "oklch(72% 0.16 80)",
          }}
        >
          {STAGE_LABELS[currentStage]}
        </span>
      </div>

      {message && (
        <p className="text-xs" style={{ color: "oklch(62% 0.17 155)" }}>{message}</p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
