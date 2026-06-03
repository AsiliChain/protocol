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
- Dashboard at `/dashboard` — stats, portfolio health, batch table, agent status
- Farmers, Batches (with 7-stage timeline), Loans (LTV-sorted), AI Agents pages
- Tailwind CSS v4 with official brand colors
- Sidebar + topbar layout under `(dashboard)/` route group
- Logo: `/asilichain_logo.png`

### API
Next.js API routes at `app/api/` for agents, webhooks, payments, batch management.

## DO NOT
- Rewrite test files
- Modify .sol files unless explicitly told to
- Use sed for multiline replacements (use Python instead)
