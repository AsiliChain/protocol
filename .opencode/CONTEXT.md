# AsiliChain Protocol — Agent Context

## What this project is
Uganda coffee supply chain protocol on Mantle. 7 UUPS upgradeable Solidity
contracts + Hardhat test suite + Next.js dashboard + marketing landing page.

## Read these files before any code work
- CLAUDE.md — invariants, deployment order, role matrix, dev rules, frontend structure
- packages/contracts/hardhat.config.ts — Solidity 0.8.28, OZ 5.6.1
- packages/api/app/globals.css — Brand palette (Forest Green #2D6A2D, etc.)

## Current state
### Contracts
All 8 contracts deployed to Mantle Sepolia.
ERC-8004 IdentityRegistry deployed: `0x62a6b58f8c3625F0c5f46D6C86A65595AA769C89`
AI agents registered: risk-monitor (id=0), anomaly-detector (id=1)

### Frontend
- Landing page at `/` — hero, twin narrative (EUDR + credit), how it works, AI agents, tech stack
- Dashboard at `/dashboard` — stats, portfolio health donut (computed from on-chain multicall), batch table, agent status cards
- Farmers page — **KNOWN_FARMERS list** (3 seeded names with clickable wallet links), search form below
- Batches (with 7-stage timeline, DDS stub for EXPORTED/SETTLED), Loans (LTV-sorted), AI Agents pages
- CCIP Bridge page at `/ccip` — static info with MantleScan link
- All data reads use **multicall** (no sequential RPC loops in dashboard) — load time ~0.7s warm
- Portfolio health donut is a zero-dependency SVG component — no agent API dependency
- Tailwind CSS v4 with official brand colors
- Sidebar + topbar layout under `(dashboard)/` route group
- Logo: `/asilichain_logo.png`

### Agents
- **Risk Monitor**: triggered by Vercel Cron every 15 min (`GET /api/cron/risk-monitor`) OR manually via "Run Now" button on `/agents` page
- **Anomaly Detector**: manual trigger only (event-triggered — BATCH_SUBMITTED needs Phase 3)
- `RunAgentButton` client component — POSTs to `/api/agents/{slug}`, shows loading/result
- Run button is in the report card (not identity card) — one per agent

### API
- `GET /api/cron/risk-monitor` — Vercel Cron endpoint, requires `Authorization: Bearer ${CRON_SECRET}`
- `vercel.json` configured with `*/15 * * * *` cron schedule
- Dashboard no longer POSTs to agent APIs during SSR (was blocking 5+ seconds)
- Next.js dev server on port 3000 (not Routerly — `ai.routerly.service` unloaded)

### Key data
- Seed script created 6 batches (#7–#11, #13) on Mantle Sepolia across all 7 stages
- 4 active loans on tokens #7, #8, #9, #13 (principal varies by LTV tier)
- Deployer: `0xB70f03dE20c9D4c90246c830F81D44f377A652C0` (898 MNT balance)
- **Active-loan bug fixed**: `loan[7] === 0` → `=== 1` (was counting NONE-status as active)
- **Portfolio health** computed via two-pass multicall: `getLoan()` → filter ACTIVE → `batchData()` → LTV calc
- **Grade multipliers**: screen18=100%, screen15=95%, PB/pBerry=75%, FAQ=60%, unknown=50%

### Seed Script
`scripts/seed-testnet.ts` — run with `npx tsx --env-file=.env.local scripts/seed-testnet.ts`
Registers 3 farmers (deployer wallet), mints 5 batches at varying stages.
Requires tsx dev dependency (installed).

## DO NOT
- Rewrite test files
- Modify .sol files unless explicitly told to
- Use sed for multiline replacements (use Python instead)
