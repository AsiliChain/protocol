# AsiliChain — Project Memory

You are working on AsiliChain, a DeFi protocol for Uganda coffee farmers on Mantle Network. Pre-launch, Phase 1 targeting Q3 2026.

## Project Identity

AsiliChain is on-chain financial infrastructure for Uganda's 3.5 million smallholder coffee farmers. It converts MAAIF government GPS farm data into working capital loans, 60-second MTN Mobile Money payments, and automated EUDR Due Diligence Statements on Mantle Network.

Status: PRE-LAUNCH. Phase 1 pilot Q3 2026.
Gate: 50 loans auto-repaid on Mantle mainnet.
Contact: hello@asilichain.xyz
Docs: https://asilichain.github.io/docs

## Local Directory Structure

```
~/dev/AsiliChain/           ← workspace root (not a repo)
~/dev/AsiliChain/protocol/  ← THIS REPO (AsiliChain/protocol)
~/dev/AsiliChain/docs/      ← docs site repo (AsiliChain/docs)
```

## Monorepo Structure (AsiliChain/protocol)

```
protocol/
├── packages/
│   ├── contracts/          ← Hardhat, Solidity 0.8.28
│   │   ├── contracts/      ← .sol files here
│   │   ├── test/           ← test files here
│   │   └── scripts/        ← deploy.ts, e2e-test.ts (both proven on Mantle Sepolia)
│   ├── api/                ← Next.js 14 App Router
│   │   ├── app/api/        ← REST endpoints
│   │   └── lib/            ← integrations
│   ├── agent-app/          ← Next.js PWA (field agents)
│   └── ussd/               ← Africa's Talking *384#
├── .goosehints             ← Goose context file
├── CLAUDE.md               ← this file
├── .env                    ← never commit (populated with Sepolia addresses)
├── .env.keychain            ← Keychain-based secret management (source to load)
├── TODO.md                 ← active/upcoming work items
├── post-pilot-cleanup.md   ← explicitly deferred cleanup items
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

DO NOT USE: `protocol/`, `app/`, `api/` at root level.
USE: `packages/contracts/`, `packages/api/`, `packages/agent-app/`

## Tech Stack

- Node.js: >= 20.x LTS
- pnpm: >= 9.x
- Solidity: 0.8.28 (OpenZeppelin 5.6.1 requires >= 0.8.28)
- OpenZeppelin: 5.x upgradeable
- viem: 2.x (Mantle client)
- Next.js: 14 App Router
- TypeScript: strict mode everywhere
- Mantle mainnet: chainId 5000
- Mantle Sepolia: chainId 5003
- Gas: ~$0.002/proof, ~$7/year per cooperative
- Foundry: installed locally — `cast` for balance checks, contract reads, tx debugging
- hardhat.config.ts: includes `mantleSepolia` network (chainId 5003, RPC from env)

## Contract Deployment Order (STRICT)

1. **FarmerRegistry.sol** — no deps. AGENT_ROLE, COOP_ROLE.
2. **CreditScore.sol** — no deps. VAULT_ROLE, AGENT_ROLE.
   Scores keyed by MAAIF ID (portable). Start 500.
   +50 repay, +10 delivery, -100 default, -25 coop penalty.
   Floor 0, ceiling 850.
3. **BatchToken.sol** — needs FarmerRegistry.
   ERC-1155. AGENT_ROLE mints. VAULT_ROLE locks/burns.
   hasActiveLoan flag (NOT transfer to vault).
4. **TraceLog.sol** — needs BatchToken.
   Stages 0-6. Strictly +1 per step. No skip/reverse.
   Event-driven: TraceLog emits EXPORTED, API layer triggers LendingVault.
   ⚠️ Do NOT add a direct call to LendingVault — creates circular dependency.
5. **PurchaseOrder.sol** — needs BatchToken + TraceLog.
   Confirm auto-advances TraceLog to COMMITTED.
6. **ProtocolFee.sol** — no deps.
   4% per settlement. MULTISIG_ROLE to withdraw.
7. **LendingVault.sol** — needs ALL above (5 args).
   Custom `deposit(uint256)` (not ERC-4626). Phase 1 uses admin-set `pricePerKgBase` ($5.00/kg).
   ✅ Was `250_000000` ($250.00) due to source bug — fixed via `setCoffeePrice(5_000000)` on 2026-05-30.
   Chainlink/Pyth oracle guard is Phase 2.
   Drought guard: pause if probability > 70%.

Post-deploy role grants (MANDATORY):
```solidity
batchToken.grantRole(VAULT_ROLE, lendingVaultAddr)
creditScore.grantRole(VAULT_ROLE, lendingVaultAddr)
traceLog.grantRole(VAULT_ROLE, lendingVaultAddr)
protocolFee.grantRole(VAULT_ROLE, lendingVaultAddr)
```

## Role Matrix

- **DEFAULT_ADMIN_ROLE** → 3-of-5 multisig (upgrade, grant roles)
- **VAULT_ROLE** → LendingVault ONLY
- **AGENT_ROLE** → field agent wallets
- **COOP_ROLE** → cooperative wallet
- **BUYER_ROLE** → buyer portal wallet
- **MULTISIG_ROLE** → 3-of-5 Gnosis Safe (fee distribution)

## Eight Invariants (enforce in every contract)

1. hasActiveLoan blocks double-collateral
2. TraceLog stages only increase, strictly +1
3. Only VAULT_ROLE calls burnSettled()
4. Price oracle is admin-set `pricePerKgBase` (Chainlink/Pyth is Phase 2). Set to `5_000000` ($5.00/kg) via `setCoffeePrice()`.
5. Fee withdrawal requires MULTISIG_ROLE
6. _authorizeUpgrade requires DEFAULT_ADMIN_ROLE
7. hasActiveLoan == true reverts safeTransferFrom
8. Sentinel guard: when a mapping value of 0 is both "default" and valid
   state, use a separate `mapping(address => bool) initialized` to
   disambiguate. Never compare to 0 alone.

## API Structure

### packages/api/app/api/

```
batch/submit/           POST - submit batch for tracing
batch/[id]/             GET  - get batch details
batch/[id]/stage/       PATCH - advance batch stage
eudr/generate-dds/       POST - generate EUDR DDS
eudr/dds/[id]/           GET  - get DDS details
eudr/verify-gfw/         POST - verify via GlobalFarmingWatch
farmers/register/        POST - register new farmer
farmers/[id]/            GET  - get farmer details
farmers/[id]/credit-score/ GET - get credit score
payments/farmer-payout/  POST - initiate farmer payout (MTN)
payments/mfi-deposit/    POST - record MFI deposit
payments/[id]/           GET  - get payment status
webhooks/alchemy/        POST - Alchemy EXPORTED webhook
```

### packages/api/app/api/_lib/

- `auth.ts` — JWT Bearer verification (jose, Edge-compatible). Extracts role + wallet from token.

### packages/api/lib/

- `mantle.ts` — viem client, wallet transactions. Uses `mantleSepolia` (5003) or `mantle` (5000) by env.
- `contracts.ts` — Minimal ABIs + deployed addresses from env vars. Keep in sync with contracts.
- `hedera.ts` — HCS topic publishing
- `kotanipay.ts` — USDC → MTN conversion
- `transfi.ts` — international transfers
- `gfw.ts` — GlobalFarmingWatch verification
- `maaif.ts` — NTS API farmer data
- `alchemy.ts` — webhook handling

### Contract Interaction Notes

- **mintBatch** param order: `(string batchId, address cooperativeWallet, address farmerWallet, uint256 weightKg, string grade, uint256 moisturePct, bytes32 collectionPointHash, bytes32 weightSlipIpfsCid)`. batchId is FIRST.
- **TraceLog has NO initializeTrace()**. Create batch → call `updateStage(tokenId, 0)` for DELIVERED (auto-initializes).
- **TraceLog stage roles**: DELIVERED→AGENT_ROLE, GRADED/MILLED/WAREHOUSED/EXPORTED→COOP_ROLE, COMMITTED→PURCHASE_ORDER_ROLE, SETTLED→VAULT_ROLE. Stages must increase strictly by +1.
- **settle()** requires TWO params: `settle(uint256 batchTokenId, uint256 usdcAmount)`. Not `settleLoan()`. usdcAmount = principal + interest + protocolFee.
- **No onExported()** function exists on LendingVault. EXPORTED is event-driven: Alchemy webhook → API calls `settle()`.
- **deposit()** on LendingVault is custom (not ERC-4626): `deposit(uint256 amount)`. MFI partners deposit USDC, tracked by `mfiDeposits` mapping.

## Phase 0 Blockers (all required before mainnet)

1. Kotani Pay $1 test: USDC on Mantle Sepolia → Uganda MTN
2. Alchemy webhook fires for EXPORTED within 30s
3. MAAIF NTS API returns farmer records for test IDs
4. ~~Deployer wallet holds 0.1+ MNT for Sepolia gas~~ ✅ Funded (900 MNT)
5. Hedera HCS topic created, ID saved to .env
6. All .env vars populated
7. Kotani Pay FIA VASP registration confirmed
8. UWRSA-licensed warehouse confirmed for Mbale pilot

## Revenue (no token, permanent)

- Protocol fee: 4% per cycle (Phase 2+)
- DDS fee: $15-40/shipment (Phase 2+)
- Aggregator: 0.5% on transfers (Phase 3+)
- SaaS: $200-500/month/org (Phase 3+)

## EUDR Deadlines

- Dec 30 2026: large operators
- Jun 30 2027: SMEs
- Phase 1 gate (Q3 2026) = 3 months before large operator deadline

## Regulatory

- MAAIF: owns NTS data (UCDA dissolved 2024)
- BoU: mobile money regulator
- FIA: VASP registration
- UMRA: MFI licences (legal opinion required before Phase 2)
- UWRSA Act 2006: warehouse receipts as negotiable instruments

## ERC-8004 Agents (Mantle mainnet)

1. Risk Monitor: between Chainlink and LendingVault
2. USSD Session Agent: between Africa's Talking and API
3. DDS Anomaly Detector: between GRADED event and DDS pipeline
4. Cooperative Intelligence: reads all contracts → dashboard

GrowingCropToken: deferred to post-V1. Do not implement.

## Goose Setup

- Primary coding agent: Goose (goose-docs.ai)
- Config: ~/.config/goose/config.yaml
- Hints: protocol/.goosehints
- Recipes: protocol/.goose/recipes/

Goose reads .goosehints for project context on every session.
NEVER enable auto-approve for contract deployments or git pushes.
Always review Goose's plan before execution.

## Development Rules

1. Read packages/../docs before writing any code
2. Source of truth: https://asilichain.github.io/docs
3. Solidity: 0.8.28 only (OZ 5.6.1 minimum)
4. TypeScript strict mode everywhere
5. Never commit .env files
6. Run pnpm turbo test before every commit
7. All 8 invariants must be in every contract
8. Post-deploy role grants are mandatory
9. Never invent specs — flag unknowns

## ethers v6 + Hardhat ENS Resolution Fix (CRITICAL)

When passing address arguments to contract calls (`grantRole`, `setIndependentAggregator`,
`registerFarmer`, `mintBatch`, etc.), ALWAYS wrap with `ethers.getAddress()`:
```
await contract.grantRole(ROLE, ethers.getAddress(signer.address));
```
This prevents `HardhatEthersProvider.resolveName` errors (Hardhat incorrectly resolves
address strings as ENS names in ethers v6).

**Exceptions** (do NOT wrap):
- `deployProxy` arguments (e.g., `[admin.address]`)
- `expect` assertions (e.g., `hasRole(ROLE, admin.address)`)
- Pre-resolved strings stored in variables, e.g. `adminAddr = admin.address`

## IBatchToken Interface — Keep Minimal

`IBatchToken.sol` must expose ONLY the functions LendingVault needs:
- `checkExists(uint256 tokenId)` — `view`
- `hasActiveLoan(uint256 tokenId)` — `view`
- `lockAsCollateral(uint256 tokenId)` — `external`
- `unlockCollateral(uint256 tokenId)` — `external`
- `burnSettled(uint256 tokenId)` — `external`

Do NOT add struct-based batch data getters to it. BatchToken's full API
(storing/returning structs) stays internal — LendingVault should not import
struct definitions it doesn't own. Interface bloat caused the earlier ABI mismatch.

## Sentinel Guard Pattern

When a mapping value of 0 can be both "uninitialized/default" and a
valid state (e.g. score=0, loanAmount=0), always use a separate
`mapping(address => bool)` to track explicit initialization. The getter
must check the bool, not compare the value to 0:
```
mapping(address => uint256) public values;
mapping(address => bool) public initialized;
function getValue(address a) public view returns (uint256) {
    return initialized[a] ? values[a] : DEFAULT_VALUE;
}
```
Flag this in CreditScore (score=0 ambiguity) and TraceLog (stage=0 ambiguity).

## Test Suite Status (Phase 1 Gate)

- **216 tests passing, 0 failing** across 7 contracts
- Run: `pnpm exec hardhat test` from `packages/contracts/`
- Pre-commit: `pnpm turbo test`
- Coverage: `COVERAGE=true pnpm exec hardhat coverage` — **94.3% lines, 92.68% functions**
- Run with `COVERAGE=true` env var to enable `allowUnlimitedContractSize`

## Deployment

`scripts/deploy.ts` deploys all 7 contracts in order + MockUSDC + 4 post-deploy
VAULT_ROLE grants. For mainnet, replace MockUSDC with real USDC address and
supply real Pyth oracle params (currently using placeholder non-zero values).

### Mantle Sepolia (2026-05-30)

Deployed via `npx hardhat run scripts/deploy.ts --network mantleSepolia`.
Deployer: `0xB70f03dE20c9D4c90246c830F81D44f377A652C0` (900 MNT balance).

| Contract | Address |
|---|---|
| FarmerRegistry | `0x302c598637045a77d8667f5f1DDCaCdfCF9d42Ca` |
| CreditScore | `0xDC7a375e511D8190b2AbfD04fe8e578d30F977a3` |
| BatchToken | `0xD9b4834b46Ed7cA1A9b2B506ec7A5f4f84D5CB14` |
| TraceLog | `0xB67D3569C5089cF7142c664098a84EC49Ca832Fb` |
| PurchaseOrder | `0xd25DC7F81D9a1C45d762f667AFB09C6217755f9E` |
| ProtocolFee | `0x5Fdb79BaEE557Da50849ad9AEdEf2ae205278Bda` |
| LendingVault | `0x0d1816408956EC76249D362e5e0E6163Afd21b45` |
| MockUSDC | `0x0fF5e462efD3AB43153d22187c7BD5ED40Ae0C4a` |

Role grants applied: VAULT_ROLE → LendingVault on BatchToken, CreditScore,
TraceLog, ProtocolFee. Deployer retains DEFAULT_ADMIN (revoke for production).

### E2E Test (2026-05-30)

`scripts/e2e-test.ts` runs an 11-step protocol cycle end-to-end. Passed on Mantle
Sepolia: 1000kg batch at $5.00/kg = $5,000 valuation, 50% LTV loan of $2,500,
farmer net payout ~$2,335.89.

Run with:
```bash
source ../../.env.keychain
export DEPLOYER_PRIVATE_KEY="$(security find-generic-password -s "asilichain-deploy" -w)"
npx hardhat run scripts/e2e-test.ts --network mantleSepolia
```

Note: `.env.keychain` uses `asilichain-deployer` but the actual keychain entry
is `asilichain-deploy` — must export directly or fix the keychain script.

### Using cast (Foundry)

```bash
# Check deployer balance
cast balance 0xB70f03dE20c9D4c90246c830F81D44f377A652C0 --rpc-url https://rpc.sepolia.mantle.xyz

# Read contract state
cast call 0x302c598637045a77d8667f5f1DDCaCdfCF9d42Ca "isRegistered(address)(bool)" \
  0xSomeFarmerWallet --rpc-url https://rpc.sepolia.mantle.xyz
```

### Env Files

- `protocol/.env` — uses `FARMER_REGISTRY_ADDRESS=` naming (deploy script convention)
- `protocol/packages/api/.env.local` — uses `CONTRACT_FARMER_REGISTRY=` naming (contracts.ts convention)
- `protocol/.env.keychain` — Keychain entries for secrets (source to load)