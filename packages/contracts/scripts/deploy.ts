import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("▶️ Starting full deployment (7 contracts)...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address, "\n");

  // ──────────────────────────────────────────────
  // Phase 1: Deploy standalone contracts
  // ──────────────────────────────────────────────

  // 1. FarmerRegistry — no deps
  const FarmerRegistry = await ethers.getContractFactory("FarmerRegistry");
  const farmerRegistryProxy = await upgrades.deployProxy(
    FarmerRegistry,
    [ethers.getAddress(deployer.address)],
    { initializer: "initialize", kind: "uups" }
  );
  await farmerRegistryProxy.waitForDeployment();
  const farmerRegistryAddress = await farmerRegistryProxy.getAddress();
  console.log("1/7 ✅ FarmerRegistry proxy:", farmerRegistryAddress);

  // Set INDEPENDENT_AGGREGATOR (random wallet for local testing)
  const independentAggregatorWallet = ethers.Wallet.createRandom();
  const independentAggregatorAddress = independentAggregatorWallet.address;
  const farmerRegistry = await ethers.getContractAt(
    "FarmerRegistry",
    farmerRegistryAddress
  );
  await farmerRegistry.setIndependentAggregator(independentAggregatorAddress);
  console.log("   └─ INDEPENDENT_AGGREGATOR set to:", independentAggregatorAddress);

  // 2. CreditScore — needs FarmerRegistry
  const CreditScore = await ethers.getContractFactory("CreditScore");
  const creditScoreProxy = await upgrades.deployProxy(
    CreditScore,
    [ethers.getAddress(deployer.address), farmerRegistryAddress],
    { initializer: "initialize", kind: "uups" }
  );
  await creditScoreProxy.waitForDeployment();
  const creditScoreAddress = await creditScoreProxy.getAddress();
  console.log("2/7 ✅ CreditScore proxy:", creditScoreAddress);

  // 3. BatchToken — needs FarmerRegistry
  const BatchToken = await ethers.getContractFactory("BatchToken");
  const batchTokenProxy = await upgrades.deployProxy(
    BatchToken,
    [
      ethers.getAddress(deployer.address),
      farmerRegistryAddress,
      "", // uri_ — empty for local; set via setURI() post-deploy if needed
    ],
    { initializer: "initialize", kind: "uups" }
  );
  await batchTokenProxy.waitForDeployment();
  const batchTokenAddress = await batchTokenProxy.getAddress();
  console.log("3/7 ✅ BatchToken proxy:", batchTokenAddress);

  // 4. TraceLog — needs BatchToken
  const TraceLog = await ethers.getContractFactory("TraceLog");
  const traceLogProxy = await upgrades.deployProxy(
    TraceLog,
    [ethers.getAddress(deployer.address), batchTokenAddress],
    { initializer: "initialize", kind: "uups" }
  );
  await traceLogProxy.waitForDeployment();
  const traceLogAddress = await traceLogProxy.getAddress();
  console.log("4/7 ✅ TraceLog proxy:", traceLogAddress);

  // 5. PurchaseOrder — needs BatchToken + TraceLog
  const PurchaseOrder = await ethers.getContractFactory("PurchaseOrder");
  const purchaseOrderProxy = await upgrades.deployProxy(
    PurchaseOrder,
    [
      ethers.getAddress(deployer.address),
      batchTokenAddress,
      traceLogAddress,
    ],
    { initializer: "initialize", kind: "uups" }
  );
  await purchaseOrderProxy.waitForDeployment();
  const purchaseOrderAddress = await purchaseOrderProxy.getAddress();
  console.log("5/7 ✅ PurchaseOrder proxy:", purchaseOrderAddress);

  // ──────────────────────────────────────────────
  // Phase 2: Deploy mock infrastructure + dependent contracts
  // ──────────────────────────────────────────────

  // 6a. Deploy MockUSDC (local testing only)
  // On testnet/mainnet, use the real USDC address and skip this step.
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUsdc = await MockUSDC.deploy("USD Coin", "USDC", 6);
  await mockUsdc.waitForDeployment();
  const usdcAddress = await mockUsdc.getAddress();
  console.log("   └─ MockUSDC deployed:", usdcAddress);

  // Mint USDC to deployer for testing
  await mockUsdc.mint(ethers.getAddress(deployer.address), ethers.parseUnits("1000000", 6));
  console.log("   └─ 1,000,000 USDC minted to deployer");

  // 6. ProtocolFee — needs USDC
  const ProtocolFee = await ethers.getContractFactory("ProtocolFee");
  const protocolFeeProxy = await upgrades.deployProxy(
    ProtocolFee,
    [ethers.getAddress(deployer.address), usdcAddress],
    { initializer: "initialize", kind: "uups" }
  );
  await protocolFeeProxy.waitForDeployment();
  const protocolFeeAddress = await protocolFeeProxy.getAddress();
  console.log("6/7 ✅ ProtocolFee proxy:", protocolFeeAddress);

  // 7. LendingVault — needs ALL contracts + external addresses
  // Pyth oracle is Phase 2; use placeholder non-zero addresses for local deployment.
  const PYTH_PLACEHOLDER = "0x0000000000000000000000000000000000000001";
  const PRICE_FEED_PLACEHOLDER = "0x0000000000000000000000000000000000000000000000000000000000000001";

  const LendingVault = await ethers.getContractFactory("LendingVault");
  const lendingVaultProxy = await upgrades.deployProxy(
    LendingVault,
    [
      ethers.getAddress(deployer.address), // defaultAdmin
      batchTokenAddress,                   // batchToken
      farmerRegistryAddress,               // farmerRegistry
      creditScoreAddress,                  // creditScore
      protocolFeeAddress,                  // protocolFee
      usdcAddress,                         // usdc
      PYTH_PLACEHOLDER,                    // pythOracle (Phase 2)
      PRICE_FEED_PLACEHOLDER,              // usdcUsdPriceId (Phase 2)
    ],
    { initializer: "initialize", kind: "uups" }
  );
  await lendingVaultProxy.waitForDeployment();
  const lendingVaultAddress = await lendingVaultProxy.getAddress();
  console.log("7/7 ✅ LendingVault proxy:", lendingVaultAddress);

  // ──────────────────────────────────────────────
  // Phase 3: Post-deploy role grants (MANDATORY)
  // ──────────────────────────────────────────────
  console.log("\n▶️ Granting post-deploy roles...");

  const batchToken = await ethers.getContractAt("BatchToken", batchTokenAddress);
  const creditScore = await ethers.getContractAt("CreditScore", creditScoreAddress);
  const traceLog = await ethers.getContractAt("TraceLog", traceLogAddress);
  const protocolFee = await ethers.getContractAt("ProtocolFee", protocolFeeAddress);
  const purchaseOrder = await ethers.getContractAt("PurchaseOrder", purchaseOrderAddress);

  const VAULT_ROLE = ethers.id("VAULT_ROLE");
  const AGENT_ROLE = ethers.id("AGENT_ROLE");
  const COOP_ROLE = ethers.id("COOP_ROLE");
  const BUYER_ROLE = ethers.id("BUYER_ROLE");
  const MULTISIG_ROLE = ethers.id("MULTISIG_ROLE");

  // Grant VAULT_ROLE to LendingVault on dependent contracts
  await batchToken.grantRole(VAULT_ROLE, lendingVaultAddress);
  console.log("   └─ BatchToken: VAULT_ROLE → LendingVault");
  await creditScore.grantRole(VAULT_ROLE, lendingVaultAddress);
  console.log("   └─ CreditScore: VAULT_ROLE → LendingVault");
  await traceLog.grantRole(VAULT_ROLE, lendingVaultAddress);
  console.log("   └─ TraceLog: VAULT_ROLE → LendingVault");
  await protocolFee.grantRole(VAULT_ROLE, lendingVaultAddress);
  console.log("   └─ ProtocolFee: VAULT_ROLE → LendingVault");

  // Deployer retains DEFAULT_ADMIN on all contracts for local testing.
  // On mainnet, revoke DEFAULT_ADMIN from deployer and transfer to multisig.
  console.log("   └─ (deployer retains DEFAULT_ADMIN — revoke for production)");

  console.log("\n═══════════════════════════════════════════");
  console.log("  ✅ Deployment complete — all 7 contracts");
  console.log("═══════════════════════════════════════════\n");

  console.log("📋 Copy these into your .env:");
  console.log(`FARMER_REGISTRY_ADDRESS=${farmerRegistryAddress}`);
  console.log(`CREDIT_SCORE_ADDRESS=${creditScoreAddress}`);
  console.log(`BATCH_TOKEN_ADDRESS=${batchTokenAddress}`);
  console.log(`TRACE_LOG_ADDRESS=${traceLogAddress}`);
  console.log(`PURCHASE_ORDER_ADDRESS=${purchaseOrderAddress}`);
  console.log(`PROTOCOL_FEE_ADDRESS=${protocolFeeAddress}`);
  console.log(`LENDING_VAULT_ADDRESS=${lendingVaultAddress}`);
  console.log(`USDC_ADDRESS=${usdcAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
