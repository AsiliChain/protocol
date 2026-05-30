# AsiliChain — Session Log

Each session appends here. Searchable, human-readable.

---

## 2026-05-30 — E2E Test Passed + pricePerKgBase Fix (Session 8)

### E2E Test Script (`scripts/e2e-test.ts`)
Wrote and successfully ran 11-step end-to-end test on Mantle Sepolia:

1. Role grants: AGENT_ROLE (FarmerRegistry, BatchToken, TraceLog, CreditScore), COOP_ROLE + PURCHASE_ORDER_ROLE (TraceLog)
2. Create random farmer wallet, fund with 0.1 MNT
3. Register farmer with mock MAAIF ID
4. Mint batch token (1000kg, screen18, token ID 5)
5. Start trace at DELIVERED
6. Deposit 200,000 USDC into vault
7. Originate loan (50% LTV = 125,000 USDC to farmer)
8. Advance trace through GRADED→MILLED→WAREHOUSED→COMMITTED→EXPORTED
9. Transfer 250,000 USDC (batch value) from buyer to vault
10. Settle loan
11. Verify farmer received positive net payout: **$116,794.52**

### Key Fixes
- **`insufficient liquidity`**: `pricePerKgBase` = 250_000000 (250 * 10^6) makes batchValue for 1000kg = 250,000 USDC. Previous 10,000 USDC deposit was insufficient. Increased deposit to 200,000 USDC.
- **Stage advancement roles**: TraceLog stages 1-5 require COOP_ROLE (GRADED, MILLED, WAREHOUSED, EXPORTED) and PURCHASE_ORDER_ROLE (COMMITTED). Added explicit grant in test script.
- **Stage names array**: Updated from wrong values to match actual enum (`GRADED`, `MILLED`, `WAREHOUSED`, `COMMITTED`, `EXPORTED`).
- **`.env.keychain` mismatch**: keychain service name is `asilichain-deploy` (not `asilichain-deployer` as in .env.keychain). Must source with correct key name.

### Issues Fixed in Session
- `pricePerKgBase` was `250_000000` ($250.00) instead of `2_500000` ($2.50) — source code had wrong literal. Initially fixed to $2.50, then set to **$5.00/kg** as final realistic price. Patched deployed contract via `setCoffeePrice(5_000000)`. E2E re-verified.
- Zombie loan (Token 4, 125k USDC, $250/kg era) settled to clear `activeLoanBook` (was stuck at 125k). Batch burned.
- Stage names in test script had wrong labels (WEIGHED, SHIPPED not actual enum values)

### Remaining Issues
- `.env.keychain` has wrong service/account names for many secrets — need to audit against actual keychain entries

### Next Steps
- Deploy API routes to Vercel
- Configure Alchemy webhook → `/api/webhooks/alchemy`
- Fonbnk sandbox test: deposit Celo USDC → disburse to MTN Uganda
- EUDR routes
- Payment status GET routes

## 2026-05-30 — Deployment to Mantle Sepolia + API Routes Complete (Session 7)

### Deployment
- Installed Foundry (cast 1.7.1)
- Added `mantleSepolia` network to hardhat.config.ts (chainId 5003)
- All 7 contracts deployed to Mantle Sepolia via `hardhat run --network mantleSepolia`
- Deployer: `0xB70f03dE20c9D4c90246c830F81D44f377A652C0`
- 900 MNT faucet-funded for gas

### Deployed Addresses

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

Post-deploy: VAULT_ROLE → LendingVault on BatchToken, CreditScore, TraceLog, ProtocolFee.

### .env Files Populated
- `protocol/.env` — contract addresses + RPC URLs
- `packages/api/.env.local` — all CONTRACT_* vars, API_PRIVATE_KEY, MANTLE_CHAIN_ID=5003

### API Package — All Routes Implemented

| Route | Status |
|---|---|
| POST /api/webhooks/alchemy | ✅ Deployed |
| POST /api/farmers/register | ✅ |
| GET /api/farmers/[id] | ✅ |
| GET /api/farmers/[id]/credit-score | ✅ |
| POST /api/batch/submit | ✅ |
| GET /api/batch/[id] | ✅ |
| PATCH /api/batch/[id]/stage | ✅ |
| POST /api/payments/mfi-deposit | ✅ |
| POST /api/payments/farmer-payout | ✅ |

### Key Corrections vs Recipe
- `registerFarmer` ABIs fixed (stale interface didn't match actual contracts)
- viem v2.49: `mantleSepolia` renamed to `mantleSepoliaTestnet`
- `WalletClient` typing fixed (replaced `ReturnType` with explicit generic)
- `ProtocolFee` added to post-deploy VAULT_ROLE grants (was missing)
- LendingVault is custom `deposit()`, not ERC-4626

### Tracking Files Created
- `TODO.md` — active/upcoming work
- `post-pilot-cleanup.md` — deferred items (GFW oracle, isRegistered pre-flight, Pyth, sentinel tests, batch/submit tokenId parsing)

### Next
- End-to-end test: mint batch → advance stages → webhook settle → farmer payout
- Fonbnk sandbox test
- Alchemy webhook configuration

---

## 2026-05-19 — FarmerRegistry Tests COMPLETE + Contract Fix (Session 6)

### Test suite

| Metric | Value |
|--------|-------|
| Tests | 63 (all passing, 727ms) |
| Categories | 9 describe blocks |
| Coverage target | 90%+ line coverage |
| Coverage check | Not yet run (needs `hardhat coverage`) |

### Contract bug found and fixed

| Bug | Location | Fix |
|-----|----------|-----|
| `registerFarmer` re-registration guard used `!farmers[wallet].active` | registerFarmer L125 | Deactivated farmers (`active = false`) could be re-registered. Changed to `registrationTimestamp == 0`. Caught by test "reverts if agent tries to re-register same wallet after deactivation". |

### Test infrastructure
- `FarmerRegistryV2.sol` (15 lines) — minimal V2 for upgrade tests, adds `version()` getter
- `@openzeppelin/hardhat-upgrades` added as dependency
- `hardhat.config.ts` updated with upgrades import

### Gap tests added (from Session 5 review)
| Gap | Test | Result |
|-----|------|--------|
| Gap 1: getFarmer guard verified | "getFarmer guard uses registrationTimestamp, not active" | ✅ Dual assertion |
| Gap 2: Cross-cooperative deactivate | "COOP_ROLE can deactivate any farmer regardless of cooperative — Phase 1 behaviour" | ✅ Documented + tested |

### All test blocks
```
initialize             4 tests
registerFarmer         13 tests (7 guards + 4 happy + event + args)
isRegistered            3 tests
getFarmer               5 tests (incl. guard verification + negative)
isIndependent           4 tests (incl. zero-address safety)
verifyFarmer            6 tests
deactivateFarmer        11 tests (incl. cross-cooperative + re-registration)
setIndependentAggregator 5 tests
migrateFarmer           9 tests (incl. post-migration state checks)
_authorizeUpgrade/UUPS   3 tests (incl. storage preservation)
```

### Next
- Docs updates (3 .mdx files per Session 5 plan) → DONE (Session 6)
- Deploy script

---

## 2026-05-19 — Docs Sync + 100% Coverage (Session 6 cont.)

### Docs sync — 4 files updated

| File | Before | After | Key additions |
|------|--------|-------|---------------|
| `farmer-registry.mdx` | 95 lines | 206 lines | Sidebar `badge:`, 7-field struct, 8-function interface, roles table, Independent Farmers section, migration path, Aggregator rotation caution, dual registration flow, 5 events |
| `supply-chain-actors.mdx` | 53 lines | 71 lines | 4th actor row, updated Mermaid diagram with INDEPENDENT_AGGREGATOR, `:::note Independent Farmer Path` |
| `deployment.mdx` | 180 lines | 205 lines | Step 8a in deployment order, `:::caution` rotation warning, deploy.ts snippet with ROTATION WARNING comment, env output, pre-deploy checklist |
| `references.mdx` | 68 lines | 69 lines | IITA 2020 + ILO 2021 citations in Market Data table |

### Coverage — 100% across all metrics
| Contract | Lines | Branch | Functions | Statements |
|----------|-------|--------|-----------|------------|
| FarmerRegistry.sol | 100% | 100% | 100% | 100% |

### `.solcover.js` created — skips V2 and test files

### CI gate note
`ci.yml` coverage job checks `LendingVault.sol` — won't work until LendingVault exists.
Interim: temporarily check `FarmerRegistry.sol` until LendingVault is written.


### FarmerRegistry.sol — DONE ✅

| Metric | Value |
|--------|-------|
| Lines | 249 |
| Compilation | ✅ Clean (17 Solidity files, 0 errors) |
| Solidity | 0.8.22 (bumped from 0.8.20 — OZ 5.6.1 requires ≥ 0.8.22) |
| OpenZeppelin | 5.6.1 upgradeable |

### Functions (8)
| # | Function | Caller |
|---|----------|--------|
| 1 | `registerFarmer(wallet, maaifId, coopWallet, ipfsCid, area, gfw)` | AGENT_ROLE |
| 2 | `isRegistered(wallet)` | Public |
| 3 | `getFarmer(wallet)` — works on deactivated | Public |
| 4 | `isIndependent(wallet)` — zero-address safe | Public |
| 5 | `verifyFarmer(wallet, gfwStatus)` | AGENT_ROLE |
| 6 | `deactivateFarmer(wallet)` — AGENT_ROLE or COOP_ROLE | Both |
| 7 | `setIndependentAggregator(addr)` | DEFAULT_ADMIN_ROLE |
| 8 | `migrateFarmer(wallet, newCoop)` | DEFAULT_ADMIN_ROLE |

### Events (5)
`FarmerRegistered`, `FarmerVerified`, `FarmerDeactivated`, `IndependentAggregatorSet`, `FarmerMigrated`

### Post-review fixes applied
| Item | Status |
|------|--------|
| `getFarmer()` blocked deactivated records | ✅ Fixed — uses `registrationTimestamp != 0` |
| `__UUPSUpgradeable_init()` missing | ❌ Report incorrect — OZ 5.x has no such function. Compile passes without it. |
| `isIndependent()` zero-address edge case | ✅ Fixed — guards against `INDEPENDENT_AGGREGATOR == address(0)` |
| Solidity version bump propagated | ✅ `.goosehints`, `CLAUDE.md` (3 occurrences), `hardhat.config.ts` all updated |
| GFW comment typo | ✅ Fixed — "Global Forest Watch" |

### Spec deviation (intentional)
- Solidity bumped 0.8.20 → 0.8.22 (OZ 5.6.1 requirement, not optional)

### Next
- Docs updates (3 .mdx files: supply-chain-actors, farmer-registry, deployment)
- Then deploy script + test suite

### What changed

1. **Deleted crews/ entirely** — all 9 CrewAI crews, tools, orchestrator, review bridge, prompts
   - Reason: secondary R&D, not part of build pipeline. 15 bugs, 3 broken models.
   - Academy tutorial (`layer3_agentic_setup.md`) preserved — it was the real deliverable

2. **Cleaned all crew references** from project context:
   - `.goosehints` — removed rule 10, removed crew output handoff section
   - `CLAUDE.md` — removed CrewAI section, `crews/` directory, handoff references
   - `complete-contract.yaml` — changed handoff reference → CLAUDE.md reference
   - `run-crew.yaml`, `review-crew-output.yaml` — deleted

3. **Recipes reduced** from 3 → 1 (`complete-contract.yaml` only)

### Project state (post-cleanup)

```
protocol/
├── packages/
│   ├── contracts/contracts/   ← 7 empty .sol files
│   ├── api/                   ← no routes yet
│   ├── agent-app/academy/     ← layer3_agentic_setup.md (2,482 lines)
│   └── ussd/                  ← empty
├── .goose/recipes/            ← complete-contract.yaml only
├── CLAUDE.md                  ← 197 lines, clean
├── .goosehints                ← 9 rules, clean
├── SESSION_LOG.md             ← this file
├── .env
└── .env.example
```

### Known issues (carried forward)
- CrewAI 0.5.0 broken with `Process.hierarchical` + `manager_llm` (archived, irrelevant)
- `deepseek_pro` hangs on NVIDIA NIM (archived, irrelevant)
- Langchain `openai_api_key` must be env var not constructor param (archived)

### Next session: FarmerRegistry.sol
- First contract, zero dependencies
- CLAUDE.md has full spec
- UUPS + AccessControl patterns to establish

---

## 2026-05-17 — DevOps Scaffold + FarmerRegistry Spec (Session 4)

### What was done

1. **Crews archived** — all 9 crews, tools, orchestrator, review bridge deleted
2. **Project files cleaned** — `.goosehints`, `CLAUDE.md`, `SESSION_LOG.md`, all recipes updated
3. **DevOps scaffold recipe created** — `devops-scaffold.yaml` (570 lines, 5 workflows)
4. **FarmerRegistry.sol spec locked** — design reviewed against docs, 3 divergences corrected

### FarmerRegistry.sol — Settled Spec

**Storage:**
```solidity
mapping(address => Farmer) public farmers;        // wallet → Farmer
mapping(string => address) public maaifToWallet;  // MAAIF ID → wallet
```

**Farmer struct (exactly):**
| Field | Type | Purpose |
|-------|------|---------|
| maaifFarmerId | string | MAAIF government ID |
| cooperativeWallet | address | Coop that receives settlement share |
| farmBoundaryIpfsCid | bytes32 | IPFS CID of GeoJSON polygon (EUDR DDS) |
| farmAreaHectares | uint256 | ×100 (250 = 2.50 ha) |
| gfwDeforestationFree | bool | GlobalFarmingWatch result |
| active | bool | false = deactivated |
| registrationTimestamp | uint256 | block.timestamp |

**Roles:**
- AGENT_ROLE: registerFarmer, verifyFarmer, deactivateFarmer
- COOP_ROLE: deactivateFarmer only (no reassignment)
- DEFAULT_ADMIN_ROLE: upgrade + grant/revoke roles

**Key decisions:**
- Wallet-keyed (not string-keyed) — gas efficient, EVM-native, composable with downstream contracts
- COOP_ROLE intentionally narrow — reassignment has collateral implications not yet designed
- No extras in struct (no name, no isVerified) — follow spec exactly

**OPEN:** Independent farmers (no cooperative) — user researching before we code

### Next session
- Resolve independent farmer design
- Write FarmerRegistry.sol


Built monitoring infrastructure, crew tools, Hermes bridge, ran academy crew.
Fixed 15 bugs. All crews verified. Then archived — not on critical path.

Key artifacts preserved:
- `packages/agent-app/academy/layer3_agentic_setup.md` — academy deliverable
- Notion DB: `5dbcfcc5-2c40-4fdb-a391-ebae08d266c4` (still exists)
- Linear team: ASI `5f2d6879-1fc9-4032-9a42-9331a3578ed0` (still exists)
- 15 bugs documented across sessions (for reference)

---

## 2026-07-17 — PurchaseOrder + ProtocolFee + LendingVault (Session 8)

### Completed: PurchaseOrder.sol
- 233 lines, UUPS proxy, OZ 5.6.1, Solidity 0.8.28
- BUYER_ROLE creates, COOP_ROLE confirms, either cancels within 48h
- Auto-advances TraceLog to COMMITTED on confirm
- batchToActiveOrder sentinel: 0 = no active PO
- 28 tests, all passing

### Completed: ProtocolFee.sol
- 153 lines, zero dependencies (only IERC20 inline interface)
- VAULT_ROLE collects, MULTISIG_ROLE distributes
- pendingDistribution() = totalCollected - totalDistributed
- No Distribution[] array — events + subgraph
- 18 tests, all passing

### Completed: LendingVault.sol (Phase 1 design)
- 516 lines, depends on all 6 prior contracts
- ERC-4626-style vault with MFI deposits, loan origination, settlement
- Manual coffee pricing (pricePerKgBase = $2.50/kg, admin-updatable)
- Pyth USDC/USD feed for peg verification (deferred to Phase 2)
- Grade multipliers: screen18=100, screen15=85, FAQ=60
- Loan lifecycle: NONE → ACTIVE → DEFAULTED/SETTLED
- Auto-settlement via API on TraceLog EXPORTED events
- ProtocolFee 4% collection on settlement
- pause/unpause via DEFAULT_ADMIN_ROLE

### ENS Resolution Bug — Final Fix
Root cause: HardhatEthersProvider.resolveName not implemented in ethers v6.
Fix: Wrap ALL address arguments to contract calls (grantRole, mintBatch,
registerFarmer, etc.) with ethers.getAddress(). Applied across all test files:
- FarmerRegistry.test.ts — 2 edits
- CreditScore.test.ts — 2 edits
- BatchToken.test.ts — 2 edits
- TraceLog.test.ts — 3 edits
- PurchaseOrder.test.ts — all address args use ethers.getAddress()
- ProtocolFee.test.ts — used from start

### hardhat-verify Fix
Replaced @nomicfoundation/hardhat-toolbox with individual plugins:
- @nomicfoundation/hardhat-ethers
- @nomicfoundation/hardhat-chai-matchers
- @nomicfoundation/hardhat-network-helpers
- @typechain/hardhat
Removed broken hardhat-verify auto-import.

### Remaining: LendingVault tests
- Contract compiles clean
- Tests written but have ABI mismatch: IBatchToken.getBatchData returns
  8-field tuple in interface vs BatchData struct in BatchToken.sol
- Fix: LendingVault needs its own internal IBatchValuation interface
- Paused here for break. Pick up: fix interface, run tests, deploy.

### Full test suite (after fixes)
| Contract | Tests | Status |
|---|---|---|
| FarmerRegistry | 63 | ✅ |
| CreditScore | 26 | ✅ |
| BatchToken | 25 | ✅ |
| TraceLog | 32 | ✅ |
| PurchaseOrder | 28 | ✅ |
| ProtocolFee | 18 | ✅ |
| LendingVault | 32 written, pending fix | 🔧 |
| **Total** | **224** | 192 passing |

