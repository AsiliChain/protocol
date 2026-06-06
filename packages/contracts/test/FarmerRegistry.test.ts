import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Signer } from "ethers";

async function deployFarmerRegistry() {
  const [admin, agent, coopMember, stranger, farmer1, farmer2] =
    await ethers.getSigners();

  const FarmerRegistry = await ethers.getContractFactory("FarmerRegistry");
  const proxy = await upgrades.deployProxy(FarmerRegistry, [ethers.getAddress(admin.address)], {
    initializer: "initialize",
  });

  const registry = await ethers.getContractAt(
    "FarmerRegistry",
    await proxy.getAddress()
  );

  // Grant roles
  const AGENT_ROLE = await registry.AGENT_ROLE();
  const COOP_ROLE = await registry.COOP_ROLE();
  await registry.connect(admin).grantRole(COOP_ROLE, ethers.getAddress(admin.address));
  await registry.connect(admin).grantRole(COOP_ROLE, ethers.getAddress(admin.address));
  await registry.connect(admin).grantRole(AGENT_ROLE, ethers.getAddress(agent.address));
  await registry.connect(admin).grantRole(COOP_ROLE, ethers.getAddress(coopMember.address));

  // Set INDEPENDENT_AGGREGATOR
  const aggregator = ethers.getAddress(ethers.Wallet.createRandom().address);
  await registry.connect(admin).setIndependentAggregator(ethers.getAddress(aggregator));

  // A real cooperative wallet for cross-cooperative tests
  const realCoopWallet = ethers.getAddress(ethers.getAddress(ethers.Wallet.createRandom().address));

  // Helper: valid registration args (defaults to independent farmer)
  const validArgs = (
    wallet: string,
    maaifId = "MAAIF-001",
    cooperativeWallet?: string,
    cid?: string,
    area?: bigint,
    gfw?: boolean,
    nationalId?: string,
    farmerName?: string,
    phoneNumber?: string
  ) =>
    [
      wallet,
      maaifId,
      cooperativeWallet ?? aggregator,
      cid ?? ethers.encodeBytes32String("cid1"),
      area ?? 250n,
      gfw ?? true,
      nationalId ?? "NIN-001",
      farmerName ?? "Test Farmer",
      phoneNumber ?? "+256700000001",
    ] as const;

  return {
    registry,
    admin,
    agent,
    coopMember,
    stranger,
    farmer1,
    farmer2,
    aggregator,
    realCoopWallet,
    AGENT_ROLE,
    COOP_ROLE,
    validArgs,
  };
}

// ──────────────────────
// 1. initialize()
// ──────────────────────

describe("FarmerRegistry — initialize", () => {
  it("grants DEFAULT_ADMIN_ROLE to defaultAdmin", async () => {
    const { registry, admin } = await loadFixture(deployFarmerRegistry);
    const DEFAULT_ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();
    expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(
      true
    );
  });

  it("sets INDEPENDENT_AGGREGATOR to address(0) initially (before setIndependentAggregator)", async () => {
    // Deploy WITHOUT calling setIndependentAggregator
    const [admin] = await ethers.getSigners();
    const FarmerRegistry = await ethers.getContractFactory("FarmerRegistry");
    const proxy = await upgrades.deployProxy(FarmerRegistry, [ethers.getAddress(admin.address)], {
      initializer: "initialize",
    });
    const registry = await ethers.getContractAt(
      "FarmerRegistry",
      await proxy.getAddress()
    );

    expect(await registry.INDEPENDENT_AGGREGATOR()).to.equal(
      ethers.ZeroAddress
    );
  });

  it("reverts if defaultAdmin is address(0)", async () => {
    const FarmerRegistry = await ethers.getContractFactory("FarmerRegistry");
    await expect(
      upgrades.deployProxy(FarmerRegistry, [ethers.ZeroAddress], {
        initializer: "initialize",
      })
    ).to.be.revertedWith("FarmerRegistry: zero admin");
  });

  it("reverts if called a second time (initializer guard)", async () => {
    const { registry, admin } = await loadFixture(deployFarmerRegistry);
    await expect(
      registry.initialize(admin.address)
    ).to.be.revertedWithCustomError(registry, "InvalidInitialization");
  });
});

// ──────────────────────
// 2. registerFarmer()
// ──────────────────────

describe("FarmerRegistry — registerFarmer", () => {
  // ── Happy paths ──

  it("registers a cooperative farmer and emits FarmerRegistered", async () => {
    const { registry, agent, farmer1, validArgs, realCoopWallet } =
      await loadFixture(deployFarmerRegistry);

    await expect(
      registry
        .connect(agent)
        .registerFarmer(
          ...validArgs(farmer1.address, "MAAIF-001", realCoopWallet)
        )
    )
      .to.emit(registry, "FarmerRegistered")
      .withArgs(farmer1.address, "MAAIF-001", realCoopWallet, "NIN-001");
  });

  it("registers an independent farmer (cooperativeWallet = INDEPENDENT_AGGREGATOR)", async () => {
    const { registry, agent, farmer1, validArgs, aggregator } =
      await loadFixture(deployFarmerRegistry);

    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-IND", aggregator));

    expect(await registry.isIndependent(farmer1.address)).to.equal(true);
  });

  it("sets registrationTimestamp to block.timestamp", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);

    const tx = await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-002"));
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber);

    const record = await registry.getFarmer(farmer1.address);
    expect(record.registrationTimestamp).to.equal(block!.timestamp);
  });

  it("writes correct maaifToWallet reverse lookup", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);

    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-REV"));

    expect(await registry.maaifToWallet("MAAIF-REV")).to.equal(
      farmer1.address
    );
  });

  // ── Guard: access control ──

  it("reverts when caller lacks AGENT_ROLE", async () => {
    const { registry, stranger, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);

    await expect(
      registry.connect(stranger).registerFarmer(...validArgs(farmer1.address))
    ).to.be.reverted;
  });

  // ── Guard: zero inputs ──

  it("reverts on zero farmerWallet", async () => {
    const { registry, agent, validArgs } =
      await loadFixture(deployFarmerRegistry);

    await expect(
      registry
        .connect(agent)
        .registerFarmer(...validArgs(ethers.ZeroAddress, "MAAIF-ZW"))
    ).to.be.revertedWith("FarmerRegistry: zero farmer wallet");
  });

  it("reverts on empty maaifFarmerId", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);

    await expect(
      registry.connect(agent).registerFarmer(...validArgs(farmer1.address, ""))
    ).to.be.revertedWith("FarmerRegistry: empty MAAIF ID");
  });

  it("reverts on zero cooperativeWallet", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);

    await expect(
      registry
        .connect(agent)
        .registerFarmer(
          farmer1.address,
          "MAAIF-ZC",
          ethers.ZeroAddress,
          ethers.encodeBytes32String("cid1"),
          250n,
          true,
          "NIN-ZC",
          "Test Farmer ZC",
          "+256700000001"
        )
    ).to.be.revertedWith("FarmerRegistry: invalid coop wallet");
  });

  it("reverts on zero farmBoundaryIpfsCid (bytes32(0))", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);

    await expect(
      registry
        .connect(agent)
        .registerFarmer(
          farmer1.address,
          "MAAIF-ZCID",
          await registry.INDEPENDENT_AGGREGATOR(),
          ethers.ZeroHash,
          250n,
          true,
          "NIN-ZCID",
          "Test Farmer ZCID",
          "+256700000001"
        )
    ).to.be.revertedWith("FarmerRegistry: empty IPFS CID");
  });

  it("reverts on zero farmAreaHectares", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);

    await expect(
      registry
        .connect(agent)
        .registerFarmer(
          farmer1.address,
          "MAAIF-ZA",
          await registry.INDEPENDENT_AGGREGATOR(),
          ethers.encodeBytes32String("cid1"),
          0n,
          true,
          "NIN-ZA",
          "Test Farmer ZA",
          "+256700000001"
        )
    ).to.be.revertedWith("FarmerRegistry: zero farm area");
  });

  // ── Guard: uniqueness ──

  it("reverts if wallet already registered", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);

    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-DUP1"));

    await expect(
      registry
        .connect(agent)
        .registerFarmer(...validArgs(farmer1.address, "MAAIF-DUP2"))
    ).to.be.revertedWith("FarmerRegistry: already registered");
  });

  it("reverts if maaifId already registered under a different wallet", async () => {
    const { registry, agent, farmer1, farmer2, validArgs } =
      await loadFixture(deployFarmerRegistry);

    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-SHARED"));

    await expect(
      registry
        .connect(agent)
        .registerFarmer(...validArgs(farmer2.address, "MAAIF-SHARED"))
    ).to.be.revertedWith("FarmerRegistry: MAAIF ID already registered");
  });

  // ── Event args ──

  it("emits FarmerRegistered with correct indexed args", async () => {
    const { registry, agent, farmer1, validArgs, aggregator } =
      await loadFixture(deployFarmerRegistry);

    await expect(
      registry
        .connect(agent)
        .registerFarmer(...validArgs(farmer1.address, "MAAIF-EVT"))
    )
      .to.emit(registry, "FarmerRegistered")
      .withArgs(farmer1.address, "MAAIF-EVT", aggregator, "NIN-001");
  });
});

// ──────────────────────
// 3. isRegistered() and getFarmer()
// ──────────────────────

describe("FarmerRegistry — isRegistered", () => {
  it("returns true for an active farmer", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));
    expect(await registry.isRegistered(farmer1.address)).to.equal(true);
  });

  it("returns false for an unregistered address", async () => {
    const { registry, farmer1 } = await loadFixture(deployFarmerRegistry);
    expect(await registry.isRegistered(farmer1.address)).to.equal(false);
  });

  it("returns false for a deactivated farmer", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));
    await registry.connect(agent).deactivateFarmer(farmer1.address);
    expect(await registry.isRegistered(farmer1.address)).to.equal(false);
  });
});

describe("FarmerRegistry — getFarmer", () => {
  it("returns the full Farmer struct for an active farmer", async () => {
    const { registry, agent, farmer1, validArgs, aggregator } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-FULL"));

    const record = await registry.getFarmer(farmer1.address);
    expect(record.maaifFarmerId).to.equal("MAAIF-FULL");
    expect(record.cooperativeWallet).to.equal(aggregator);
    expect(record.active).to.equal(true);
    expect(record.registrationTimestamp).to.be.gt(0n);
  });

  it("returns the full Farmer struct for a DEACTIVATED farmer", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-DEAD"));
    await registry.connect(agent).deactivateFarmer(farmer1.address);

    // Must not revert — this is the fix for the getFarmer guard
    const record = await registry.getFarmer(farmer1.address);
    expect(record.maaifFarmerId).to.equal("MAAIF-DEAD");
    expect(record.active).to.equal(false);
  });

  it("does NOT revert for a deactivated farmer", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));
    await registry.connect(agent).deactivateFarmer(farmer1.address);

    // Explicit negative test — proves registrationTimestamp guard, not .active
    await expect(registry.getFarmer(farmer1.address)).to.not.be.reverted;
  });

  it("getFarmer guard uses registrationTimestamp, not active", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));
    await registry.connect(agent).deactivateFarmer(farmer1.address);

    const record = await registry.getFarmer(farmer1.address);

    // Dual assertion: proves record IS readable AND active is correctly false
    expect(record.active).to.equal(false);
    expect(record.registrationTimestamp).to.be.gt(0n);
  });

  it("reverts for a wallet that was never registered", async () => {
    const { registry, farmer1 } = await loadFixture(deployFarmerRegistry);
    await expect(registry.getFarmer(farmer1.address)).to.be.revertedWith(
      "FarmerRegistry: not registered"
    );
  });
});

// ──────────────────────
// 4. isIndependent()
// ──────────────────────

describe("FarmerRegistry — isIndependent", () => {
  it("returns true for a farmer registered with INDEPENDENT_AGGREGATOR", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));
    expect(await registry.isIndependent(farmer1.address)).to.equal(true);
  });

  it("returns false for a farmer registered with a real cooperative wallet", async () => {
    const { registry, agent, farmer1, validArgs, realCoopWallet } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(
        ...validArgs(farmer1.address, "MAAIF-COOP", realCoopWallet)
      );
    expect(await registry.isIndependent(farmer1.address)).to.equal(false);
  });

  it("returns false when INDEPENDENT_AGGREGATOR is address(0) (not yet set)", async () => {
    // Deploy fresh without calling setIndependentAggregator
    const [admin, agent] = await ethers.getSigners();
    const FarmerRegistry = await ethers.getContractFactory("FarmerRegistry");
    const proxy = await upgrades.deployProxy(FarmerRegistry, [ethers.getAddress(admin.address)], {
      initializer: "initialize",
    });
    const registry = await ethers.getContractAt(
      "FarmerRegistry",
      await proxy.getAddress()
    );
    await registry
      .connect(admin)
      .grantRole(await registry.COOP_ROLE(), ethers.getAddress(admin.address));
    await registry
      .connect(admin)
      .grantRole(await registry.AGENT_ROLE(), ethers.getAddress(agent.address));

    // Register with INDEPENDENT_AGGREGATOR still at address(0)
    // Must use a real cooperative wallet since zero is blocked by registerFarmer
    const realCoopWallet = ethers.getAddress(ethers.getAddress(ethers.Wallet.createRandom().address));
    await registry
      .connect(agent)
      .registerFarmer(
        (await ethers.getSigners())[5].address,
        "MAAIF-ZEROAGG",
        realCoopWallet,
        ethers.encodeBytes32String("cid1"),
        250n,
        true,
        "NIN-ZEROAGG",
        "Test Farmer ZEROAGG",
        "+256700000001"
      );

    expect(
      await registry.isIndependent(
        (await ethers.getSigners())[5].address
      )
    ).to.equal(false);
  });

  it("returns false for an address that was never registered", async () => {
    const { registry, farmer1 } = await loadFixture(deployFarmerRegistry);
    expect(await registry.isIndependent(farmer1.address)).to.equal(false);
  });
});

// ──────────────────────
// 5. verifyFarmer()
// ──────────────────────

describe("FarmerRegistry — verifyFarmer", () => {
  it("updates gfwDeforestationFree to true", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    // Register with gfw = false
    await registry
      .connect(agent)
      .registerFarmer(
        farmer1.address,
        "MAAIF-VFY",
        await registry.INDEPENDENT_AGGREGATOR(),
        ethers.encodeBytes32String("cid1"),
        250n,
        false,
        "NIN-VFY",
        "Test Farmer VFY",
        "+256700000001"
      );

    await registry.connect(agent).verifyFarmer(farmer1.address, true);
    const record = await registry.getFarmer(farmer1.address);
    expect(record.gfwDeforestationFree).to.equal(true);
  });

  it("updates gfwDeforestationFree to false (re-verification can be negative)", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-VFY2"));

    await registry.connect(agent).verifyFarmer(farmer1.address, false);
    const record = await registry.getFarmer(farmer1.address);
    expect(record.gfwDeforestationFree).to.equal(false);
  });

  it("emits FarmerVerified with correct args", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));

    await expect(
      registry.connect(agent).verifyFarmer(farmer1.address, true)
    )
      .to.emit(registry, "FarmerVerified")
      .withArgs(farmer1.address, true);
  });

  it("reverts when caller lacks AGENT_ROLE", async () => {
    const { registry, agent, coopMember, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));

    await expect(
      registry.connect(coopMember).verifyFarmer(farmer1.address, true)
    ).to.be.reverted;
  });

  it("reverts for an inactive (deactivated) farmer", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));
    await registry.connect(agent).deactivateFarmer(farmer1.address);

    await expect(
      registry.connect(agent).verifyFarmer(farmer1.address, true)
    ).to.be.revertedWith("FarmerRegistry: not registered");
  });

  it("reverts for an unregistered farmer", async () => {
    const { registry, agent, farmer1 } = await loadFixture(deployFarmerRegistry);
    await expect(
      registry.connect(agent).verifyFarmer(farmer1.address, true)
    ).to.be.revertedWith("FarmerRegistry: not registered");
  });
});

// ──────────────────────
// 6. deactivateFarmer()
// ──────────────────────

describe("FarmerRegistry — deactivateFarmer", () => {
  it("AGENT_ROLE can deactivate an active farmer", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));

    await registry.connect(agent).deactivateFarmer(farmer1.address);
    expect(await registry.isRegistered(farmer1.address)).to.equal(false);
  });

  it("COOP_ROLE can deactivate an active farmer", async () => {
    const { registry, agent, coopMember, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));

    await registry.connect(coopMember).deactivateFarmer(farmer1.address);
    expect(await registry.isRegistered(farmer1.address)).to.equal(false);
  });

  it("COOP_ROLE can deactivate any farmer regardless of cooperative — Phase 1 behaviour", async () => {
    const { registry, agent, coopMember, farmer2, realCoopWallet } =
      await loadFixture(deployFarmerRegistry);

    // farmer2 belongs to realCoopWallet, not INDEPENDENT_AGGREGATOR
    await registry
      .connect(agent)
      .registerFarmer(
        farmer2.address,
        "MAAIF-CROSS",
        realCoopWallet,
        ethers.encodeBytes32String("cidX"),
        300n,
        true,
        "NIN-CROSS",
        "Test Farmer CROSS",
        "+256700000002"
      );

    // coopMember's cooperative is INDEPENDENT_AGGREGATOR
    // Cross-cooperative deactivation should succeed in Phase 1
    await expect(
      registry.connect(coopMember).deactivateFarmer(farmer2.address)
    )
      .to.emit(registry, "FarmerDeactivated")
      .withArgs(farmer2.address);

    expect(await registry.isRegistered(farmer2.address)).to.equal(false);
  });

  it("sets active = false", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));

    await registry.connect(agent).deactivateFarmer(farmer1.address);
    const record = await registry.getFarmer(farmer1.address);
    expect(record.active).to.equal(false);
  });

  it("preserves maaifToWallet reverse lookup after deactivation", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-KEEP"));

    await registry.connect(agent).deactivateFarmer(farmer1.address);
    expect(await registry.maaifToWallet("MAAIF-KEEP")).to.equal(
      farmer1.address
    );
  });

  it("emits FarmerDeactivated", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));

    await expect(registry.connect(agent).deactivateFarmer(farmer1.address))
      .to.emit(registry, "FarmerDeactivated")
      .withArgs(farmer1.address);
  });

  it("reverts if caller has neither AGENT_ROLE nor COOP_ROLE", async () => {
    const { registry, agent, stranger, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));

    await expect(
      registry.connect(stranger).deactivateFarmer(farmer1.address)
    ).to.be.revertedWith("FarmerRegistry: access denied");
  });

  it("reverts if farmer is already inactive", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));
    await registry.connect(agent).deactivateFarmer(farmer1.address);

    await expect(
      registry.connect(agent).deactivateFarmer(farmer1.address)
    ).to.be.revertedWith("FarmerRegistry: not registered");
  });

  it("reverts if farmer was never registered", async () => {
    const { registry, agent, farmer1 } = await loadFixture(deployFarmerRegistry);
    await expect(
      registry.connect(agent).deactivateFarmer(farmer1.address)
    ).to.be.revertedWith("FarmerRegistry: not registered");
  });

  it("reverts if agent tries to re-register the same maaifId after deactivation", async () => {
    const { registry, agent, farmer1, farmer2, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-REUSE"));

    await registry.connect(agent).deactivateFarmer(farmer1.address);

    // Different wallet, same MAAIF ID — should revert
    await expect(
      registry
        .connect(agent)
        .registerFarmer(...validArgs(farmer2.address, "MAAIF-REUSE"))
    ).to.be.revertedWith("FarmerRegistry: MAAIF ID already registered");
  });

  it("reverts if agent tries to re-register same wallet after deactivation", async () => {
    const { registry, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-REUSE2"));
    await registry.connect(agent).deactivateFarmer(farmer1.address);

    // Same wallet, new MAAIF ID — should revert
    await expect(
      registry
        .connect(agent)
        .registerFarmer(...validArgs(farmer1.address, "MAAIF-NEW"))
    ).to.be.revertedWith("FarmerRegistry: already registered");
  });
});

// ──────────────────────
// 7. setIndependentAggregator()
// ──────────────────────

describe("FarmerRegistry — setIndependentAggregator", () => {
  it("sets INDEPENDENT_AGGREGATOR to the given address", async () => {
    const { registry, admin } = await loadFixture(deployFarmerRegistry);
    const newAggregator = ethers.getAddress(ethers.Wallet.createRandom().address);

    await registry.connect(admin).setIndependentAggregator(newAggregator);
    expect(await registry.INDEPENDENT_AGGREGATOR()).to.equal(newAggregator);
  });

  it("emits IndependentAggregatorSet", async () => {
    const { registry, admin } = await loadFixture(deployFarmerRegistry);
    const newAggregator = ethers.getAddress(ethers.Wallet.createRandom().address);

    await expect(
      registry.connect(admin).setIndependentAggregator(newAggregator)
    )
      .to.emit(registry, "IndependentAggregatorSet")
      .withArgs(newAggregator);
  });

  it("can be called again to rotate the aggregator address", async () => {
    const { registry, admin } = await loadFixture(deployFarmerRegistry);
    const first = ethers.getAddress(ethers.Wallet.createRandom().address);
    const second = ethers.getAddress(ethers.Wallet.createRandom().address);

    await registry.connect(admin).setIndependentAggregator(first);
    expect(await registry.INDEPENDENT_AGGREGATOR()).to.equal(first);

    await registry.connect(admin).setIndependentAggregator(second);
    expect(await registry.INDEPENDENT_AGGREGATOR()).to.equal(second);
  });

  it("reverts on zero address", async () => {
    const { registry, admin } = await loadFixture(deployFarmerRegistry);
    await expect(
      registry.connect(admin).setIndependentAggregator(ethers.ZeroAddress)
    ).to.be.revertedWith("FarmerRegistry: zero aggregator");
  });

  it("reverts when caller lacks DEFAULT_ADMIN_ROLE", async () => {
    const { registry, agent } = await loadFixture(deployFarmerRegistry);
    const newAggregator = ethers.getAddress(ethers.Wallet.createRandom().address);

    await expect(
      registry.connect(agent).setIndependentAggregator(newAggregator)
    ).to.be.reverted;
  });
});

// ──────────────────────
// 8. migrateFarmer()
// ──────────────────────

describe("FarmerRegistry — migrateFarmer", () => {
  it("updates cooperativeWallet to the new cooperative", async () => {
    const { registry, admin, agent, farmer1, validArgs, realCoopWallet } =
      await loadFixture(deployFarmerRegistry);

    // Register as independent
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-MIG1"));
    expect(await registry.isIndependent(farmer1.address)).to.equal(true);

    // Migrate to a real cooperative
    await registry
      .connect(admin)
      .migrateFarmer(farmer1.address, realCoopWallet);

    const record = await registry.getFarmer(farmer1.address);
    expect(record.cooperativeWallet).to.equal(realCoopWallet);
  });

  it("emits FarmerMigrated with correct from/to addresses", async () => {
    const { registry, admin, agent, farmer1, validArgs, aggregator, realCoopWallet } =
      await loadFixture(deployFarmerRegistry);

    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-MIG2"));

    await expect(
      registry.connect(admin).migrateFarmer(farmer1.address, realCoopWallet)
    )
      .to.emit(registry, "FarmerMigrated")
      .withArgs(farmer1.address, aggregator, realCoopWallet);
  });

  it("isIndependent() returns false after migration", async () => {
    const { registry, admin, agent, farmer1, validArgs, realCoopWallet } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));
    await registry
      .connect(admin)
      .migrateFarmer(farmer1.address, realCoopWallet);

    expect(await registry.isIndependent(farmer1.address)).to.equal(false);
  });

  it("isRegistered() still returns true after migration", async () => {
    const { registry, admin, agent, farmer1, validArgs, realCoopWallet } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));
    await registry
      .connect(admin)
      .migrateFarmer(farmer1.address, realCoopWallet);

    expect(await registry.isRegistered(farmer1.address)).to.equal(true);
  });

  // ── Guards ──

  it("reverts when caller lacks DEFAULT_ADMIN_ROLE", async () => {
    const { registry, agent, farmer1, validArgs, realCoopWallet } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));

    await expect(
      registry.connect(agent).migrateFarmer(farmer1.address, realCoopWallet)
    ).to.be.reverted;
  });

  it("reverts if farmer is not independent", async () => {
    const { registry, admin, agent, farmer1, realCoopWallet } =
      await loadFixture(deployFarmerRegistry);

    // Register as a cooperative farmer (not independent)
    await registry
      .connect(agent)
      .registerFarmer(
        farmer1.address,
        "MAAIF-NOTIND",
        realCoopWallet,
        ethers.encodeBytes32String("cidN"),
        250n,
        true,
        "NIN-NOTIND",
        "Test Farmer NOTIND",
        "+256700000001"
      );

    await expect(
      registry
        .connect(admin)
        .migrateFarmer(farmer1.address, ethers.getAddress(ethers.Wallet.createRandom().address))
    ).to.be.revertedWith("FarmerRegistry: not independent");
  });

  it("reverts if farmer is inactive", async () => {
    const { registry, admin, agent, farmer1, validArgs, realCoopWallet } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));
    await registry.connect(agent).deactivateFarmer(farmer1.address);

    await expect(
      registry
        .connect(admin)
        .migrateFarmer(farmer1.address, realCoopWallet)
    ).to.be.revertedWith("FarmerRegistry: not registered");
  });

  it("reverts on zero newCooperativeWallet", async () => {
    const { registry, admin, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));

    await expect(
      registry
        .connect(admin)
        .migrateFarmer(farmer1.address, ethers.ZeroAddress)
    ).to.be.revertedWith("FarmerRegistry: zero coop");
  });

  it("reverts if newCooperativeWallet == INDEPENDENT_AGGREGATOR", async () => {
    const { registry, admin, agent, farmer1, validArgs, aggregator } =
      await loadFixture(deployFarmerRegistry);
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));

    await expect(
      registry.connect(admin).migrateFarmer(farmer1.address, aggregator)
    ).to.be.revertedWith("FarmerRegistry: already independent");
  });
});

// ──────────────────────
// 9. _authorizeUpgrade() — Invariant #6
// ──────────────────────

describe("FarmerRegistry — _authorizeUpgrade / UUPS", () => {
  it("DEFAULT_ADMIN_ROLE can upgrade the implementation", async () => {
    const { registry, admin, farmer1, agent, validArgs } =
      await loadFixture(deployFarmerRegistry);

    // Register a farmer before upgrade
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address));

    const proxyAddress = await registry.getAddress();

    // Deploy V2 implementation and upgrade through proxy
    const FarmerRegistryV2Factory = await ethers.getContractFactory(
      "FarmerRegistryV2"
    );
    const upgraded = await upgrades.upgradeProxy(
      proxyAddress,
      FarmerRegistryV2Factory
    );

    // Should not revert — admin (proxy owner) succeeds
    const v2 = await ethers.getContractAt("FarmerRegistryV2", proxyAddress);
    expect(await v2.version()).to.equal("2.0.0");
  });

  it("reverts if non-admin attempts upgrade", async () => {
    const { registry, agent } = await loadFixture(deployFarmerRegistry);
    const proxyAddress = await registry.getAddress();

    // Deploy a new implementation
    const FarmerRegistryV2Factory = await ethers.getContractFactory(
      "FarmerRegistryV2"
    );
    const newImpl = await FarmerRegistryV2Factory.deploy();
    await newImpl.waitForDeployment();

    // agent tries to upgrade — should fail
    await expect(
      registry.connect(agent).upgradeToAndCall(await newImpl.getAddress(), "0x")
    ).to.be.reverted;
  });

  it("storage is preserved across upgrade", async () => {
    const { registry, admin, agent, farmer1, validArgs } =
      await loadFixture(deployFarmerRegistry);

    // Register a farmer before upgrade
    await registry
      .connect(agent)
      .registerFarmer(...validArgs(farmer1.address, "MAAIF-PRESERVE"));

    // Upgrade to V2
    const FarmerRegistryV2Factory = await ethers.getContractFactory(
      "FarmerRegistryV2"
    );
    const proxyAddress = await registry.getAddress();
    await upgrades.upgradeProxy(proxyAddress, FarmerRegistryV2Factory);

    const v2 = await ethers.getContractAt("FarmerRegistryV2", proxyAddress);

    // Verify farmer record survived upgrade
    const record = await v2.getFarmer(farmer1.address);
    expect(record.maaifFarmerId).to.equal("MAAIF-PRESERVE");
    expect(record.active).to.equal(true);
    expect(record.registrationTimestamp).to.be.gt(0n);

    // Verify INDEPENDENT_AGGREGATOR survived
    const aggregatorAfter = await v2.INDEPENDENT_AGGREGATOR();
    expect(aggregatorAfter).to.not.equal(ethers.ZeroAddress);

    // V2 version getter works
    expect(await v2.version()).to.equal("2.0.0");
  });
});
