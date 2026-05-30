# Post-Pilot Cleanup

Items deliberately deferred until Phase 2 or post-pilot. Not bugs,
not forgotten — scoped out for speed.

## API Routes

### farmers/register — missing `isRegistered` pre-flight check
- **What**: `POST /api/farmers/register` calls `registerFarmer()` directly
  without checking `isRegistered(farmerWallet)` first.
- **Effect**: Contract reverts with `"FarmerRegistry: already registered"`.
  Error surfaces as a 500 with the revert reason.
- **Fix**: Add a `publicClient.readContract({ functionName: "isRegistered", args: [farmerWallet] })`
  before the write, return `409 Conflict` if true.
- **Why deferred**: Contract error message is clear enough. Not worth the
  extra RPC call this week.

### GFW verification stub → real oracle call
- **What**: `farmers/register` accepts `gfwDeforestationFree: boolean` directly
  from the client. Phase 2 should query GlobalFarmingWatch GLAD-L alerts.
- **Fix**: In the route, call `gfw.verifyFarmPolygon()` before `registerFarmer()`
  and pass the result as the bool.
- **Why deferred**: No GFW API key configured. Client-provided bool is
  sufficient for pilot.

## Contract Architecture

### Pyth oracle stored but never queried
- **What**: `LendingVault.initialize()` accepts a Pyth oracle address and stores
  it, but `settle()` uses a hardcoded `pricePerKgBase` instead of querying Pyth.
- **Fix**: Wire `pyth.getPriceNoOlderThan()` into `settle()` to get live
  coffee price.
- **Why deferred**: Hardcoded $2.50/kg is fine for pilot volume. Live pricing
  introduces oracle failure modes that increase surface area.

### LendingVault.deposit() is MFI-only, no ERC-4626
- **What**: `deposit(uint256 amount)` is a custom function (not ERC-4626).
  No share tokens, no withdrawal queue.
- **Fix**: Either add ERC-4626 wrapper or document MFI deposit flow with
  buyback mechanism.
- **Why deferred**: MFI partners deposit USDC directly. Share math adds
  complexity with zero benefit at pilot scale.

### Sentinel guard (Invariant #8) — no test coverage
- **What**: Sentinel role (`SENTINEL_ROLE`) can pause `LendingVault` but has
  zero test coverage.
- **Fix**: Add tests: sentinel pauses, sentinel unpauses, non-sentinel cannot
  pause.
- **Why deferred**: Not triggered until mainnet incident. Low priority before
  pilot.

### `nextStep` workaround in batch/submit response
- **What**: `batch/submit` returns `nextStep: "PATCH /api/batch/[tokenId]/stage"`
  because we can't parse `BatchMinted` event logs from `writeContract()` receipt
  in the current architecture.
- **Fix**: Use `waitForTransactionReceipt`, parse logs for `BatchMinted` event,
  include `tokenId` in response body. Or make the agent include `tokenId` in
  the submit body (pre-computed).
- **Why deferred**: Functional as-is. The cooperative/agent knows the tokenId
  (it's returned in `mintBatch` output which they see client-side).
