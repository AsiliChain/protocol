/**
 * GlobalFarmingWatch integration.
 * Verifies farm polygons against deforestation alerts.
 *
 * Phase 1: Stub — returns mock "no alerts" result.
 */

export interface GfwVerificationResult {
  farmId: string;
  alertCount: number;
  latestAlertDate: string | null;
  verified: boolean;
}

export async function verifyFarmPolygon(
  _farmId: string,
  _polygonWkt: string,
): Promise<GfwVerificationResult> {
  if (!process.env.GFW_API_KEY) {
    throw new Error("GFW_API_KEY not set");
  }

  // TODO: POST polygon to GFW GLAD-L alert API
  console.log("[gfw:stub] verifying farm", _farmId);

  return {
    farmId: _farmId,
    alertCount: 0,
    latestAlertDate: null,
    verified: true,
  };
}

export async function verifyExportDds(
  _batchTokenId: string,
  _polygonWkt: string,
): Promise<GfwVerificationResult> {
  if (!process.env.GFW_API_KEY) {
    throw new Error("GFW_API_KEY not set");
  }

  // TODO: GLAD-L deforestation check for EUDR DDS
  console.log("[gfw:stub] verifying DDS for batch", _batchTokenId);

  return {
    farmId: _batchTokenId,
    alertCount: 0,
    latestAlertDate: null,
    verified: true,
  };
}
