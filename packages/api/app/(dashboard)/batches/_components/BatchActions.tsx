"use client";

import { StageControls } from "./StageControls";
import { DdsButton } from "./DdsButton";

interface BatchActionsProps {
  tokenId: number;
  currentStage: number;
  batchId?: string;
  farmer?: string;
  grade?: string;
  weightKg?: string;
  stage?: string;
}

export function BatchActions({
  tokenId,
  currentStage,
  batchId,
  farmer,
  grade,
  weightKg,
  stage,
}: BatchActionsProps) {
  return (
    <div className="space-y-4">
      <StageControls tokenId={tokenId} currentStage={currentStage} />
      {batchId && farmer && (
        <DdsButton
          tokenId={tokenId}
          batchId={batchId}
          farmer={farmer}
          grade={grade ?? ""}
          weightKg={weightKg ?? ""}
          stage={stage ?? ""}
        />
      )}
    </div>
  );
}
