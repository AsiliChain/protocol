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
All 7 contracts deployed to Mantle Sepolia.
ERC-8004 IdentityRegistry deployed: `0x62a6b58f8c3625F0c5f46D6C86A65595AA769C89`
AI agents registered: risk-monitor (id=0), anomaly-detector (id=1)

### Frontend
- Landing page at `/` — hero, twin narrative (EUDR + credit), how it works, AI agents, tech stack
- Dashboard at `/dashboard` — stats, portfolio health (manual trigger from Agents page), batch table, agent status
- Farmers page — **KNOWN_FARMERS list** (3 seeded names with clickable wallet links), search form below
- Batches (with 7-stage timeline, DDS stub for EXPORTED/SETTLED), Loans (LTV-sorted), AI Agents pages
- CCIP Bridge page at `/ccip` — static info with MantleScan link
- All data reads use **multicall** (no sequential RPC loops in dashboard) — load time ~0.7s warm
- Tailwind CSS v4 with official brand colors
- Sidebar + topbar layout under `(dashboard)/` route group
- Logo: `/asilichain_logo.png`

### Agents
- **Risk Monitor**: triggered by Vercel Cron every 15 min (`GET /api/cron/risk-monitor`) OR manually via "Run Now" button on `/agents` page
- **Anomaly Detector**: manual trigger only (event-triggered — BATCH_SUBMITTED needs Phase 3)
- `RunAgentButton` client component — POSTs to `/api/agents/{slug}`, shows loading/result
- Port 3000 was hijacked by Routerly launch agent — unloaded `ai.routerly.service`

### API
- `GET /api/cron/risk-monitor` — Vercel Cron endpoint, requires `Authorization: Bearer ${CRON_SECRET}`
- `vercel.json` configured with `*/15 * * * *` cron schedule
- Next.js dev server on port 3000 (not Routerly)

### API
Next.js API routes at `app/api/` for agents, webhooks, payments, batch management.

### Seed Script
`scripts/seed-testnet.ts` — run with `npx tsx --env-file=.env.local scripts/seed-testnet.ts`
Registers 3 farmers (deployer wallet), mints 5 batches at varying stages.
Requires tsx dev dependency (installed).

## DO NOT
- Rewrite test files
- Modify .sol files unless explicitly told to
- Use sed for multiline replacements (use Python instead)
