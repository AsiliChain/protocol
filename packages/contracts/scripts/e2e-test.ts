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

  // ─── Contract Addresses (Sprint 3 — 2026-06-06) ──
  const FARMER_REGISTRY    = "0xa2F5Bb2Aa25deC5c7F8e1fE9455E725F6CBb15F1";
  const CREDIT_SCORE       = "0xd8b18B874F58C7adef805f5Efb02433febc41Ad2";
  const BATCH_TOKEN        = "0x9e5B886b4dB39b8C86a75Ae139d28376EF32694c";
  const TRACE_LOG          = "0x99280b9B1D7c07B144b32DBa192a89781d6c872D";
  const PROTOCOL_FEE       = "0x687D03c79125eD82E19CcBA377FaA8f49b47d971";
  const LENDING_VAULT      = "0x069b761A76778e5f4bb39B130e304F3183F8b858";
  const IDENTITY_REGISTRY  = "0xA31AE6917C1C9A746d71b0475Ca211F44D2135F4";
  const USDC              = "0x987758676f7c2219754039AF65FCBB218b707BD4";

  // Attach to deployed contracts
  const farmerRegistry = await ethers.getContractAt("FarmerRegistry", FARMER_REGISTRY);
  const creditScore    = await ethers.getContractAt("CreditScore", CREDIT_SCORE);
  const batchToken     = await ethers.getContractAt("BatchToken", BATCH_TOKEN);
  const traceLog       = await ethers.getContractAt("TraceLog", TRACE_LOG);
  const protocolFee      = await ethers.getContractAt("ProtocolFee", PROTOCOL_FEE);
  const lendingVault     = await ethers.getContractAt("LendingVault", LENDING_VAULT);
  const identityRegistry = await ethers.getContractAt("IdentityRegistry", IDENTITY_REGISTRY);
  const usdc             = await ethers.getContractAt("MockUSDC", USDC);

  // ─── Deployer balances ───────────────────────────
  console.log("--- Pre-flight checks ---");
  const deployerMnt = await ethers.provider.getBalance(deployer.address);
  const deployerUsdc = await usdc.balanceOf(deployer.address);
  console.log("  Deployer MNT:", ethers.formatEther(deployerMnt));
  console.log("  Deployer USDC:", ethers.formatUnits(deployerUsdc, 6));

  // ─── Step 1: Grant roles to deployer ────────────
  console.log("\n--- 1. Granting roles to deployer ---");
  const COOP_ROLE = ethers.id("COOP_ROLE");

  // Sprint 1: _setRoleAdmin(AGENT_ROLE, COOP_ROLE) means we need COOP_ROLE first
  for (const [name, contract] of [
    ["FarmerRegistry", farmerRegistry],
  ] as const) {
    let tx;
    // Grant COOP_ROLE first (deployer has DEFAULT_ADMIN which can grant COOP)
    const hasCoop = await contract.hasRole(COOP_ROLE, deployer.address);
    if (!hasCoop) {
      tx = await contract.grantRole(COOP_ROLE, deployer.address);
      await tx.wait();
      console.log(`  ✅ ${name}: COOP_ROLE granted (tx: ${tx.hash})`);
    } else {
      console.log(`  ✅ ${name}: already has COOP_ROLE`);
    }

    // Now grant AGENT_ROLE (COOP_ROLE is admin of AGENT_ROLE)
    const hasAgent = await contract.hasRole(AGENT_ROLE, deployer.address);
    if (!hasAgent) {
      tx = await contract.grantRole(AGENT_ROLE, deployer.address);
      await tx.wait();
      console.log(`  ✅ ${name}: AGENT_ROLE granted (tx: ${tx.hash})`);
    } else {
      console.log(`  ✅ ${name}: already has AGENT_ROLE`);
    }
  }

  // Grant roles on other contracts (no _setRoleAdmin change there)
  for (const [name, contract] of [
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

  // Grant PURCHASE_ORDER_ROLE on TraceLog for stage advancement
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

  // ─── Step 1b: Verify agent cap tracking + IdentityRegistry ──
  console.log("\n--- 1b. Verifying agent cap & identity registry ---");
  const agentCount = await farmerRegistry.agentCount();
  console.log(`  Agent count on FarmerRegistry: ${agentCount}`);
  if (agentCount > 0n) {
    console.log("  ✅ Agent cap tracking works");
  }

  // Test registerFor — mint a test agent NFT to a random wallet
  const testAgentWallet = ethers.Wallet.createRandom().address;
  const regForTx = await identityRegistry.registerFor(ethers.getAddress(testAgentWallet));
  await regForTx.wait();
  const agentBalance = await identityRegistry.balanceOf(ethers.getAddress(testAgentWallet));
  if (agentBalance === 1n) {
    console.log(`  ✅ IdentityRegistry.registerFor() works — agent NFT minted (tx: ${regForTx.hash})`);
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

  const nin = `CMN${Date.now()}NAK`;
  const farmerName = "E2E Test Farmer";
  const phoneNumber = "+256700123456";

  const regTx = await farmerRegistry.registerFarmer(
    ethers.getAddress(farmerAddress),
    maaifId,
    ethers.getAddress(coopWallet),
    ipfsCid,
    farmArea,
    true, // gfwDeforestationFree
    nin,
    farmerName,
    phoneNumber,
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

  // Refill deployer USDC if low (MockUSDC — testnet only)
  const deployerUsdcBalance = await usdc.balanceOf(deployer.address);
  const mfiDepositAmount = ethers.parseUnits("250000", 6); // 250,000 USDC
  if (deployerUsdcBalance < mfiDepositAmount) {
    const mintTx = await usdc.mint(deployer.address, mfiDepositAmount * 2n);
    await mintTx.wait();
    console.log(`  ✅ Minted additional USDC to deployer (tx: ${mintTx.hash})`);
  }
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

  // ─── Step 10: Capture fee baseline & settle loan ─
  console.log("\n--- 10. Settling loan ---");
  const protocolFeeBaseline = await usdc.balanceOf(PROTOCOL_FEE);
  console.log(`  ProtocolFee USDC before settle: ${ethers.formatUnits(protocolFeeBaseline, 6)}`);

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

  // ─── Step 12: Verify protocol fee arrived ────────
  console.log("\n--- 12. Verifying protocol fee arrived ---");
  console.log(`  ProtocolFee USDC before settle: ${ethers.formatUnits(protocolFeeBaseline, 6)}`);

  const feeBalanceAfter = await usdc.balanceOf(PROTOCOL_FEE);
  const feeArrived = feeBalanceAfter - protocolFeeBaseline;
  console.log(`  ProtocolFee USDC after settle:  ${ethers.formatUnits(feeBalanceAfter, 6)}`);
  console.log(`  Fee USDC transferred:            ${ethers.formatUnits(feeArrived, 6)}`);

  // ─── Step 13: Distribute fee via MULTISIG_ROLE ──
  console.log("\n--- 13. Distributing protocol fee ---");
  const MULTISIG_ROLE = ethers.id("MULTISIG_ROLE");
  const hasMultisig = await protocolFee.hasRole(MULTISIG_ROLE, deployer.address);
  if (!hasMultisig) {
    // Grant MULTISIG_ROLE to deployer if not already (new deployments handle this)
    const adminRole = await protocolFee.DEFAULT_ADMIN_ROLE();
    const isAdmin = await protocolFee.hasRole(adminRole, deployer.address);
    if (isAdmin) {
      const grantTx = await protocolFee.grantRole(MULTISIG_ROLE, deployer.address);
      await grantTx.wait();
      console.log(`  ✅ MULTISIG_ROLE granted to deployer (tx: ${grantTx.hash})`);
    } else {
      console.log("  ⚠️  Cannot grant MULTISIG_ROLE — deployer is not admin");
    }
  } else {
    console.log("  ✅ Deployer already has MULTISIG_ROLE");
  }

  const distributionRecipient = ethers.getAddress(deployer.address);
  const recipientBalanceBefore = await usdc.balanceOf(distributionRecipient);
  const distributeTx = await protocolFee.distribute(
    distributionRecipient,
    feeArrived,
    "Sprint 2 E2E test distribution",
  );
  await distributeTx.wait();
  console.log(`  ✅ Fee distributed (tx: ${distributeTx.hash})`);

  const recipientBalanceAfter = await usdc.balanceOf(distributionRecipient);
  const distReceived = recipientBalanceAfter - recipientBalanceBefore;
  console.log(`  Recipient USDC before: ${ethers.formatUnits(recipientBalanceBefore, 6)}`);
  console.log(`  Recipient USDC after:  ${ethers.formatUnits(recipientBalanceAfter, 6)}`);
  console.log(`  Distribution received:  ${ethers.formatUnits(distReceived, 6)}`);

  const pendingDist = await protocolFee.pendingDistribution();
  console.log(`  ProtocolFee pending:    ${ethers.formatUnits(pendingDist, 6)}`);

  // feeArrived verifies USDC physically transferred to ProtocolFee during settle
  // distReceived verifies MULTISIG_ROLE can distribute that USDC out
  // pendingDist > 0 is expected if previous test runs accumulated totalCollected without transfers
  if (feeArrived > 0n && distReceived === feeArrived) {
    console.log("\n  ✅ FEE FLOW VERIFIED — Full round-trip: settle → collect → distribute");
  } else {
    console.log("\n  ❌ FEE FLOW FAILED — Fee did not complete full cycle");
  }

  // ─── Step 14: Verify credit loss reserve ─────────
  console.log("\n--- 14. Verifying credit loss reserve ---");
  const creditLossReserve = await lendingVault.creditLossReserve();
  console.log(`  creditLossReserve: ${ethers.formatUnits(creditLossReserve, 6)} USDC`);
  if (creditLossReserve > 0n) {
    console.log("  ✅ Credit loss reserve > 0 — 2% reserve accrued during settlement");
  } else {
    console.log("  ❌ Credit loss reserve is zero — reserve did NOT accrue");
  }

  // Verify deployReserve works — deploy half the reserve back to deployer
  const vaultMultisigRole = ethers.id("MULTISIG_ROLE");
  const hasVaultMultisig = await lendingVault.hasRole(vaultMultisigRole, deployer.address);
  if (hasVaultMultisig) {
    const deployAmount = creditLossReserve / 2n;
    const deployerBefore = await usdc.balanceOf(deployer.address);
    const deployTx = await lendingVault.deployReserve(deployer.address, deployAmount);
    await deployTx.wait();
    const reserveAfter = await lendingVault.creditLossReserve();
    const deployerAfter = await usdc.balanceOf(deployer.address);
    const received = deployerAfter - deployerBefore;
    if (reserveAfter === creditLossReserve - deployAmount && received === deployAmount) {
      console.log(`  ✅ deployReserve() works — ${ethers.formatUnits(deployAmount, 6)} USDC deployed (tx: ${deployTx.hash})`);
    } else {
      console.log("  ❌ deployReserve() failed — reserve or recipient balance incorrect");
    }
  } else {
    console.log("  ⚠️  Cannot test deployReserve — deployer lacks MULTISIG_ROLE on LendingVault");
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
