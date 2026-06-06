import { keccak256, toBytes } from "viem";

/**
 * Derives a deterministic wallet address from a Uganda NIN (National ID).
 * The farmer never signs transactions — the address is purely an on-chain identifier.
 *
 * Formula: keccak256("asilichain:{nin}") → take last 20 bytes → 0x-prefixed hex
 *
 * @param nin Uganda National ID string (e.g. "CMN8608004NAK")
 * @returns 0x-padded 20-byte Ethereum address
 */
export function addressFromNin(nin: string): `0x${string}` {
  const hash = keccak256(toBytes(`asilichain:${nin}`));
  return `0x${hash.slice(26)}` as `0x${string}`;
}
