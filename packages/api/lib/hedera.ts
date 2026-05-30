/**
 * Hedera HCS (Hashgraph Consensus Service) integration.
 * Publishes coffee batch events to an immutable audit log.
 *
 * Phase 1: Stub — returns tx ID without actual HCS publish.
 */
export interface HcsMessage {
  topicId: string;
  batchTokenId: string;
  eventType: "DELIVERED" | "EXPORTED" | "SETTLED";
  payload: Record<string, unknown>;
  timestamp: string;
}

export async function publishToHcs(
  _message: Omit<HcsMessage, "timestamp">,
): Promise<{ consensusTimestamp: string; messageId: string }> {
  const { HEDERA_TOPIC_ID } = process.env;
  if (!HEDERA_TOPIC_ID) throw new Error("HEDERA_TOPIC_ID not set");

  // TODO: Implement HCS message submission via Hedera SDK
  console.log("[hedera:stub] would publish to topic", HEDERA_TOPIC_ID);

  return {
    consensusTimestamp: new Date().toISOString(),
    messageId: `stub-${Date.now()}`,
  };
}
