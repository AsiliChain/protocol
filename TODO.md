# TODO

## Hackathon Sprint (June 2–15)

- [x] ERC-8004 IdentityRegistry deployed to Mantle Sepolia (proxy: `0x62a6b58f8c3625F0c5f46D6C86A65595AA769C89`)
- [x] AI agents registered: risk-monitor (id=0), anomaly-detector (id=1)
- [x] **Dashboard MVP** — Next.js frontend with batch lifecycle, farmer view, agent reports
- [x] **Landing page** — marketing page at / with hero, twin narrative, how it works, AI agents, tech stack
- [x] **Brand palette** — official colors in globals.css: Forest Green, Coffee Brown, Origin Gold, Deep Navy
- [x] **App restructure** — route group (dashboard)/ for sidebar pages, clean root layout for landing page
- [ ] Deploy API + dashboard to Vercel
- [ ] Pitch deck + demo video (2 min walkthrough)
- [ ] Submit to Dorahacks (deadline: June 15)

## Offramp (evaluating)

- [ ] reply.cash (Solana USDC → MTN MoMo, ~2% fee, no min) — wait for hackathon submission
- [ ] Yativo API sandbox test

## Integration Libs

- [ ] `lib/hedera.ts` — Real HCS credentials (sandbox topic)
- [ ] `lib/gfw.ts` — Wire to GlobalFarmingWatch API
- [ ] `lib/maaif.ts` — Wire to MAAIF NTS API

## Infrastructure

- [x] All 7 contracts deployed to Mantle Sepolia
- [x] CCIP bridge (Mantle → Base) tested
- [x] ERC-8004 IdentityRegistry deployed
- [ ] Set up `.env` on Vercel with all contract addresses
- [ ] Add `packages/api` to turbo.json pipeline
