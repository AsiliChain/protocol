import { ethers } from "hardhat";

/**
 * End-to-end test of the full AsiliChain protocol cycle on Mantle Sepolia.
 *
 * Flow:
 *   1. Grant AGENT_ROLE to deployer (FarmerRegistry, BatchToken, TraceLog)
 *   2. Create test farmer wallet
 *   3. Register test farmer
 *   4. Mint batch token → get tokenId
 *   5. Start trace (Stage 0: DELIVERED)
 *   6. MFI deposits USDC into LendingVault
 *   7. Originate loan (vault sends principal to farmer)
 *   8. Advance trace through stages 1→5 (EXPORTED)
 *   9. Transfer buyer USDC into vault
 *  10. Settle loan
 *  11. Verify farmer received net payout
 */

const AGENT_ROLE = ethers.id("AGENT_ROLE");

async function main() {
  console.log("=== AsiliChain E2E Protocol Test (Mantle Sepolia) ===\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address, "\n");

  // ─── Contract Addresses ──────────────────────────
  const FARMER_REGISTRY = "0x302c598637045a77d8667f5f1DDCaCdfCF9d42Ca";
  const CREDIT_SCORE   = "0xDC7a375e511D8190b2AbfD04fe8e578d30F977a3";
  const BATCH_TOKEN    = "0xD9b4834b46Ed7cA1A9b2B506ec7A5f4f84D5CB14";
  const TRACE_LOG      = "0xB67D3569C5089cF7142c664098a84EC49Ca832Fb";
  const PROTOCOL_FEE   = "0x5Fdb79BaEE557Da50849ad9AEdEf2ae205278Bda";
  const LENDING_VAULT  = "0x0d1816408956EC76249D362e5e0E6163Afd21b45";
  const USDC          = "0x0fF5e462efD3AB43153d22187c7BD5ED40Ae0C4a";

  // Attach to deployed contracts
  const farmerRegistry = await ethers.getContractAt("FarmerRegistry", FARMER_REGISTRY);
  const creditScore    = await ethers.getContractAt("CreditScore", CREDIT_SCORE);
  const batchToken     = await ethers.getContractAt("BatchToken", BATCH_TOKEN);
  const traceLog       = await ethers.getContractAt("TraceLog", TRACE_LOG);
  const protocolFee    = await ethers.getContractAt("ProtocolFee", PROTOCOL_FEE);
  const lendingVault   = await ethers.getContractAt("LendingVault", LENDING_VAULT);
  const usdc           = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDC);

  // ─── Deployer balances ───────────────────────────
  console.log("--- Pre-flight checks ---");
  const deployerMnt = await ethers.provider.getBalance(deployer.address);
  const deployerUsdc = await usdc.balanceOf(deployer.address);
  console.log("  Deployer MNT:", ethers.formatEther(deployerMnt));
  console.log("  Deployer USDC:", ethers.formatUnits(deployerUsdc, 6));

  // ─── Step 1: Grant roles to deployer ────────────
  console.log("\n--- 1. Granting roles to deployer ---");
  for (const [name, contract] of [
    ["FarmerRegistry", farmerRegistry],
    ["BatchToken", batchToken],
    ["TraceLog", traceLog],
    ["CreditScore", creditScore],
  ] as const) {
    const hasRole = await contract.hasRole(AGENT_ROLE, deployer.address);
    if (!hasRole) {
      const tx = await contract.grantRole(AGENT_ROLE, deployer.address);
      await tx.wait();
      console.log(`  ✅ ${name}: AGENT_ROLE granted (tx: ${tx.hash})`);
    } else {
      console.log(`  ✅ ${name}: already has AGENT_ROLE`);
    }
  }

  // Also grant COOP_ROLE and PURCHASE_ORDER_ROLE on TraceLog for stage advancement
  const COOP_ROLE = ethers.id("COOP_ROLE");
  const PURCHASE_ORDER_ROLE = ethers.id("PURCHASE_ORDER_ROLE");
  for (const [roleLabel, roleBytes32] of [["COOP_ROLE", COOP_ROLE], ["PURCHASE_ORDER_ROLE", PURCHASE_ORDER_ROLE]] as const) {
    const hasRole = await traceLog.hasRole(roleBytes32, deployer.address);
    if (!hasRole) {
      const tx = await traceLog.grantRole(roleBytes32, deployer.address);
      await tx.wait();
      console.log(`  ✅ TraceLog: ${roleLabel} granted (tx: ${tx.hash})`);
    } else {
      console.log(`  ✅ TraceLog: already has ${roleLabel}`);
    }
  }

  // ─── Step 2: Create test farmer wallet ──────────
  console.log("\n--- 2. Creating test farmer wallet ---");
  const farmerWallet = ethers.Wallet.createRandom().connect(ethers.provider);
  const farmerAddress = ethers.getAddress(farmerWallet.address);
  console.log("  Farmer address:", farmerAddress);

  // Fund farmer with MNT for gas + some USDC to start
  const fundTx = await deployer.sendTransaction({
    to: farmerAddress,
    value: ethers.parseEther("0.1"),
  });
  await fundTx.wait();
  console.log("  ✅ Farmer funded with 0.1 MNT (tx:", fundTx.hash, ")");
  console.log("  Farmer MNT:", ethers.formatEther(await ethers.provider.getBalance(farmerAddress)));

  // ─── Step 3: Register farmer ────────────────────
  console.log("\n--- 3. Registering test farmer ---");
  const maaifId = `TEST-MAAIF-${Date.now()}`;
  const coopWallet = ethers.getAddress(deployer.address);
  const ipfsCid = ethers.hexlify(ethers.randomBytes(32));
  const farmArea = 250n; // 2.50 hectares

  const regTx = await farmerRegistry.registerFarmer(
    ethers.getAddress(farmerAddress),
    maaifId,
    ethers.getAddress(coopWallet),
    ipfsCid,
    farmArea,
    true, // gfwDeforestationFree
  );
  await regTx.wait();
  console.log(`  ✅ Farmer registered (tx: ${regTx.hash})`);
  console.log(`  MAAIF ID: ${maaifId}`);

  // ─── Step 4: Mint batch token ───────────────────
  console.log("\n--- 4. Minting batch token ---");
  const batchId = `BATCH-E2E-${Date.now()}`;
  const weightKg = 1000n;
  const grade = "screen18";
  const moisturePct = 110n; // 11.0%
  const collectionPointHash = ethers.hexlify(ethers.randomBytes(32));
  const weightSlipIpfsCid = ethers.hexlify(ethers.randomBytes(32));

  const mintTx = await batchToken.mintBatch(
    batchId,
    ethers.getAddress(coopWallet),
    ethers.getAddress(farmerAddress),
    weightKg,
    grade,
    moisturePct,
    collectionPointHash,
    weightSlipIpfsCid,
  );
  const mintReceipt = await mintTx.wait();

  // Parse tokenId from BatchMinted event
  const batchTokenInterface = batchToken.interface;
  let tokenId: bigint | null = null;
  for (const log of mintReceipt?.logs || []) {
    try {
      const parsed = batchTokenInterface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      if (parsed && parsed.name === "BatchMinted") {
        tokenId = parsed.args.tokenId;
        break;
      }
    } catch {}
  }
  if (tokenId === null) throw new Error("Could not parse tokenId from BatchMinted event");
  console.log(`  ✅ Batch minted (tx: ${mintTx.hash})`);
  console.log(`  Batch ID: ${batchId}, Token ID: ${tokenId}`);

  // ─── Step 5: Start trace (Stage 0: DELIVERED) ──
  console.log("\n--- 5. Starting trace (DELIVERED) ---");
  const traceTx = await traceLog.updateStage(tokenId, 0);
  await traceTx.wait();
  console.log(`  ✅ Stage 0 (DELIVERED) set (tx: ${traceTx.hash})`);

  // ─── Step 6: MFI deposits USDC into vault ──────
  console.log("\n--- 6. MFI depositing USDC into vault ---");
  const mfiDepositAmount = ethers.parseUnits("250000", 6); // 250,000 USDC
  const approveTx = await usdc.approve(LENDING_VAULT, mfiDepositAmount);
  await approveTx.wait();
  const depositTx = await lendingVault.deposit(mfiDepositAmount);
  await depositTx.wait();
  console.log(`  ✅ ${ethers.formatUnits(mfiDepositAmount, 6)} USDC deposited into vault`);
  console.log(`  Approve: ${approveTx.hash}, Deposit: ${depositTx.hash}`);

  // ─── Step 7: Originate loan ─────────────────────
  console.log("\n--- 7. Originating loan ---");
  const origTx = await lendingVault.originate(tokenId, ethers.getAddress(farmerAddress));
  await origTx.wait();

  // Check farmer received principal
  const farmerUsdcAfterOriginate = await usdc.balanceOf(farmerAddress);
  console.log(`  ✅ Loan originated (tx: ${origTx.hash})`);
  console.log(`  Farmer USDC after originate: ${ethers.formatUnits(farmerUsdcAfterOriginate, 6)}`);

  // ─── Step 8: Advance trace to EXPORTED ─────────
  const STAGE_NAMES = ["DELIVERED", "GRADED", "MILLED", "WAREHOUSED", "COMMITTED", "EXPORTED"];
  console.log("\n--- 8. Advancing trace to EXPORTED ---");
  for (let stage = 1; stage <= 5; stage++) {
    const tx = await traceLog.updateStage(tokenId, stage);
    await tx.wait();
    console.log(`  ✅ Stage ${stage} (${STAGE_NAMES[stage]}) (tx: ${tx.hash})`);
  }

  // ─── Step 9: Transfer buyer USDC into vault ────
  console.log("\n--- 9. Simulating buyer payment into vault ---");
  const batchValue = await lendingVault.getBatchValue(tokenId);
  console.log(`  Batch value: ${ethers.formatUnits(batchValue, 6)} USDC`);

  // Buyer pays batch value + enough to cover interest + protocol fee
  const buyerPayment = batchValue; // Simplified: buyer pays the full batch value
  const buyerToVaultTx = await usdc.transfer(LENDING_VAULT, buyerPayment);
  await buyerToVaultTx.wait();
  console.log(`  ✅ ${ethers.formatUnits(buyerPayment, 6)} USDC transferred from buyer to vault (tx: ${buyerToVaultTx.hash})`);
  console.log(`  Vault USDC: ${ethers.formatUnits(await usdc.balanceOf(LENDING_VAULT), 6)}`);

  // ─── Step 10: Settle loan ───────────────────────
  console.log("\n--- 10. Settling loan ---");
  // usdcAmount = total from buyer (we use batchValue here)
  const settleTx = await lendingVault.settle(tokenId, batchValue);
  await settleTx.wait();
  console.log(`  ✅ Loan settled (tx: ${settleTx.hash})`);

  // ─── Step 11: Verify farmer received net payout ──
  console.log("\n--- 11. Verifying farmer payout ---");
  const farmerFinalUsdc = await usdc.balanceOf(farmerAddress);
  const farmerNetGain = farmerFinalUsdc - farmerUsdcAfterOriginate;
  console.log(`  Farmer USDC after originate: ${ethers.formatUnits(farmerUsdcAfterOriginate, 6)}`);
  console.log(`  Farmer USDC after settle:   ${ethers.formatUnits(farmerFinalUsdc, 6)}`);
  console.log(`  Farmer net gain from settle: ${ethers.formatUnits(farmerNetGain, 6)} USDC`);

  if (farmerNetGain > 0n) {
    console.log("\n  ✅ E2E TEST PASSED — Farmer received positive net payout");
  } else {
    console.log("\n  ❌ E2E TEST FAILED — Farmer did not receive net payout");
  }

  // ─── Summary ────────────────────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log("  E2E Test Complete");
  console.log("═══════════════════════════════════════════");
  console.log(`  Farmer:        ${farmerAddress}`);
  console.log(`  MAAIF ID:      ${maaifId}`);
  console.log(`  Batch ID:      ${batchId}`);
  console.log(`  Token ID:      ${tokenId}`);
  console.log(`  Farmer PK:     ${farmerWallet.privateKey}`);
  console.log("═══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error("\n❌ E2E test failed:", error);
  process.exitCode = 1;
});
