# AsiliChain

On-chain supply chain finance for Uganda's smallholder coffee farmers.

AsiliChain turns farm evidence — GPS boundaries, MAAIF registry data, harvest records, and export documents — into tokenized coffee batches, working capital loans, and automated EUDR Due Diligence Statements on Mantle Network. Farmers get paid in seconds through MTN Mobile Money, without ever handling stablecoins or seed phrases.

The protocol is built for the EU Deforestation Regulation (EUDR) deadline of December 2026, which will block Ugandan coffee from the European market unless exporters can prove deforestation-free, traceable supply chains.

## What the demo does

Visit [asilichain.xyz](https://asilichain.xyz) to see the full flow: a cooperative operator logs in with a wallet, registers a farmer using a national ID derived wallet, records a coffee delivery, advances the batch through the supply chain, and settles the loan into mobile money. Two AI agents — a risk monitor and an anomaly detector — watch the batches and publish signed reports to Hedera Consensus Service.

The live dashboard shows batch lifecycle, active loans with LTV risk tiers, agent identity cards, and the CCIP bridge configuration used for cross-chain settlement tests.

## Architecture

The system has three layers. On-chain logic lives on Mantle Sepolia as UUPS upgradeable OpenZeppelin contracts. Off-chain evidence is pinned to IPFS via Pinata. Hedera Consensus Service records every agent decision and stage advance as an immutable audit trail. The Next.js app serves both the landing page and the cooperative dashboard, with wallet-based JWT auth for protected routes.

The BatchToken contract represents each coffee lot as it moves from delivered cherry through grading, milling, warehousing, export commitment, export, and final settlement. LendingVault issues USDC loans against the tokenized collateral, withholds protocol fees and a credit loss reserve, and settles automatically when the buyer pays. FarmerRegistry ties every batch to a farmer wallet derived deterministically from the Ugandan national ID, so farmers do not need to manage private keys.

## Deployed contracts on Mantle Sepolia

| Contract | Address |
| --- | --- |
| FarmerRegistry | 0xa2F5Bb2Aa25deC5c7F8e1fE9455E725F6CBb15F1 |
| CreditScore | 0xd8b18B874F58C7adef805f5Efb02433febc41Ad2 |
| BatchToken | 0x9e5B886b4dB39b8C86a75Ae139d28376EF32694c |
| TraceLog | 0x99280b9B1D7c07B144b32DBa192a89781d6c872D |
| PurchaseOrder | 0xea62E8dFA98eF3E2eBD1f6dcBC839302984a3eDA |
| ProtocolFee | 0x687D03c79125eD82E19CCBA377FaA8f49b47d971 |
| IdentityRegistry | 0xA31AE6917C1C9A746d71b0475Ca211F44D2135F4 |
| LendingVault | 0x069b761A76778e5f4bb39B130e304F3183F8b858 |
| USDC mock | 0x987758676f7c2219754039AF65FCBB218b707BD4 |

## Running locally

The repo is a pnpm monorepo with two main packages: `packages/contracts` for Hardhat and `packages/api` for the Next.js app.

First, copy the environment file and fill in your own RPC URL and optional Pinata, Resend, and Hedera credentials:

```bash
cp packages/api/.env.example packages/api/.env.local
```

Install dependencies and build the contracts package:

```bash
pnpm install
pnpm --filter contracts build
```

Run the API locally:

```bash
pnpm --filter api dev
```

The app will be available at `http://localhost:3000`.

## Links

Live demo: [asilichain.xyz](https://asilichain.xyz)
Documentation: [docs.asilichain.xyz](https://docs.asilichain.xyz)
Pitch deck: see `docs/pitch-deck.pptx`

## Team

Built by Mucunguzi Moses for the Turing Test Hackathon 2026.
Contact: hello@asilichain.xyz
