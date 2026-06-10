# TODO

## Hackathon Sprint (June 3–15)

### Done
- [x] ERC-8004 IdentityRegistry deployed to Mantle Sepolia (proxy: `0x62a6b58f8c3625F0c5f46D6C86A65595AA769C89`)
- [x] AI agents registered: risk-monitor (id=0), anomaly-detector (id=1)
- [x] **Dashboard MVP** — Next.js frontend with batch lifecycle, farmer view, agent reports
- [x] **Landing page** — marketing page at / with hero, twin narrative, how it works, AI agents, tech stack
- [x] **Brand palette** — official colors in globals.css: Forest Green, Coffee Brown, Origin Gold, Deep Navy
- [x] **App restructure** — route group (dashboard)/ for sidebar pages, clean root layout for landing page
- [x] **Seed script** — `scripts/seed-testnet.ts` registers 3 farmers + mints 5 batches on Mantle Sepolia
- [x] **Farmers page** — KNOWN_FARMERS list, clickable cards
- [x] **Seed run** — batches #7–#11, #13 minted on Mantle Sepolia
- [x] **Option A** — `originate` added to `lendingVaultAbi`, 4 loans issued on #7, #8, #9, #13
- [x] **Stage advancement fixed** — DELIVERED init in TraceLog, all tokens at target stages
- [x] **VAULT_ROLE** granted to deployer for SETTLED
- [x] **Dashboard performance** — sequential RPC → multicall, 10s+ → 0.7s
- [x] **Agent triggers** — Vercel Cron (15 min) + manual "Run Now" button on /agents page
- [x] **CCIP page** — static bridge info at /ccip with nav item
- [x] **DDS stub** — "Generate Compliance Document" button on EXPORTED/SETTLED batches
- [x] **Port conflict** — Routerly launch agent removed from port 3000
- [x] **NEXT_PUBLIC_APP_URL** + CRON_SECRET + lockfix in .env.local
- [x] **Risk donut on dashboard** — `getPortfolioHealth()` + SVG donut, computed from on-chain multicall data
- [x] **Active-loan bug fixed** — `loan[7] === 0` → `=== 1` (was counting NONE-status loans as active)

### In progress
- [x] **Deploy API + dashboard to Vercel**
- [x] **Landing page redesign** — pill navbar, hero fixes, CrewAI-style How It Works
- [x] **Dashboard fixes** — Field Operators rename, sidebar collapse, form fields, nav state
- [x] **Docs diagrams** — SVG fixes, marketing architecture diagram, core-loop
- [x] **Field Agents → Field Operators** — project-wide rename, route move to /field-ops
- [x] **AI Agents page perf** — parallel RPC calls, 8s timeout

### Next
- [ ] **Pitch deck** + demo video (2 min walkthrough)
- [ ] Submit to Dorahacks (deadline: June 15)

## Offramp (evaluating)

- [ ] reply.cash (Solana USDC → MTN MoMo, ~2% fee, no min) — wait for hackathon submission
- [ ] Yativo API sandbox test

## Integration Libs

- [ ] `lib/hedera.ts` — Real HCS credentials (sandbox topic)
- [ ] `lib/gfw.ts` — Wire to GlobalFarmingWatch API
- [ ] `lib/maaif.ts` — Wire to MAAIF NTS API

## Infrastructure

- [x] All 8 contracts deployed to Mantle Sepolia
- [x] CCIP bridge (Mantle → Base) tested
- [x] ERC-8004 IdentityRegistry deployed
- [x] tsx installed as devDependency
- [x] Set up `.env` on Vercel with all contract addresses
- [x] Vercel Git integration connected (auto-deploy on push)
- [x] Add `packages/api` to turbo.json pipeline
