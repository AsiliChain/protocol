/**
 * MAAIF NTS API (Uganda Ministry of Agriculture) integration.
 * Fetches government-registered farmer data for KYC validation.
 *
 * Phase 1: Stub — returns mock farmer record for test IDs.
 */

export interface MaaifFarmerRecord {
  nationalId: string;
  name: string;
  district: string;
  subCounty: string;
  village: string;
  farmSizeHectares: number;
  registeredAt: string;
}

export async function lookupFarmer(
  _nationalId: string,
): Promise<MaaifFarmerRecord | null> {
  if (!process.env.MAAIF_API_KEY) {
    throw new Error("MAAIF_API_KEY not set");
  }

  // TODO: GET from NTS API
  console.log("[maaif:stub] looking up farmer", _nationalId);

  // Return mock for testing
  if (_nationalId.startsWith("TEST")) {
    return {
      nationalId: _nationalId,
      name: "Test Farmer",
      district: "Mbale",
      subCounty: "Bungokho",
      village: "Test Village",
      farmSizeHectares: 2.5,
      registeredAt: "2025-01-01",
    };
  }

  return null;
}
