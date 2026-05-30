# TODO

## Priority — Sprint

- [ ] Wire up Kotani Pay — implement real API calls in `lib/kotanipay.ts`, webhook handling, $1 test ping
- [ ] Deploy API package to Vercel — get routes live, configure `.env` with contract addresses + secrets
- [ ] Configure Alchemy webhook pointing at `/api/webhooks/alchemy` — trigger on EXPORTED stage
- [ ] Kotani Pay $1 E2E test: USDC on Mantle Sepolia → MTN Uganda Mobile Money
- [ ] `POST /api/eudr/generate-dds` — Generate EUDR Due Diligence Statement
- [ ] `GET  /api/eudr/dds/[id]` — Get DDS details
- [ ] `POST /api/eudr/verify-gfw` — Verify farm polygon via GFW
- [ ] `GET  /api/payments/[id]` — Get payment status

## Integration Libs — Wire Up Stubs

- [ ] `lib/hedera.ts` — Install Hedera SDK, implement HCS message publish
- [ ] `lib/gfw.ts` — Wire to GlobalFarmingWatch API (needs API key)
- [ ] `lib/maaif.ts` — Wire to MAAIF NTS API (needs API key + test records)
- [ ] `lib/transfi.ts` — Wire to Transfi API (needs API key)

## Infrastructure

- [x] Deploy all 7 contracts to Mantle Sepolia
- [x] E2E protocol test passed (11-step cycle, farmer net payout verified)
- [ ] Set up `.env` on Vercel/railway with all contract addresses + secrets
- [ ] Add `packages/api` to turbo.json pipeline
- [ ] MAAIF NTS API returns farmer records for test IDs
- [ ] Alchemy webhook fires for EXPORTED within 30s
- [ ] Hedera HCS topic created, ID saved to `.env`
- [ ] UWRSA-licensed warehouse confirmed for Mbale pilot

## Phase 0 Blockers (required before mainnet)

- [ ] Deployer wallet holds 0.1+ MNT for Sepolia gas
- [ ] All `.env` vars populated
- [ ] Kotani Pay FIA VASP registration confirmed
- [ ] 50 loans auto-repaid on Mantle mainnet (pilot gate)

## Tech Debt / Tooling

- [ ] Install `typescript-language-server` globally (needed for LSP in API pkg)
- [ ] `lib/notion.ts` depends on `@notionhq/client` — add to `package.json`
- [ ] Add coverage threshold gate to CI (`solidity-coverage` check mode)
