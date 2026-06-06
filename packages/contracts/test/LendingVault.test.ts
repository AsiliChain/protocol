import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("LendingVault", function () {
    let vault: any;
    let batchToken: any;
    let farmerRegistry: any;
    let creditScore: any;
    let protocolFee: any;
    let mockUSDC: any;

    let admin: any, agent: any, coop: any, vaultSigner: any;
    let farmer: any, mfi: any, other: any;
    let adminAddr: string, agentAddr: string, coopAddr: string;
    let farmerAddr: string, mfiAddr: string;

    beforeEach(async function () {
        [, admin, agent, coop, mfi, vaultSigner, farmer, other] = await ethers.getSigners();
        adminAddr   = admin.address;
        agentAddr   = agent.address;
        coopAddr    = coop.address;
        farmerAddr  = farmer.address;
        mfiAddr     = mfi.address;

        // Deploy MockUSDC
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy("USDC", "USDC", 6);

        // Mint USDC to mfi for deposits
        await mockUSDC.connect(admin).mint(ethers.getAddress(mfi.address), 20000_000000n);
        // Mint USDC to admin (for transfers to vault in distribute tests)
        await mockUSDC.connect(admin).mint(ethers.getAddress(admin.address), 10000_000000n);

        // Deploy FarmerRegistry
        const FR = await ethers.getContractFactory("FarmerRegistry");
        farmerRegistry = await upgrades.deployProxy(FR, [ethers.getAddress(adminAddr)]);
        await farmerRegistry.connect(admin).setIndependentAggregator(ethers.getAddress(coopAddr));
        await farmerRegistry.connect(admin).grantRole(await farmerRegistry.COOP_ROLE(), ethers.getAddress(admin.address));
        await farmerRegistry.connect(admin).grantRole(await farmerRegistry.AGENT_ROLE(), ethers.getAddress(agentAddr));
        await farmerRegistry.connect(agent).registerFarmer(
            ethers.getAddress(farmerAddr), "MAAIF-LV", ethers.getAddress(coopAddr),
            ethers.encodeBytes32String("ipfs"), 250, true,
            "NIN-LV-001", "Test Farmer LV", "+256700000001"
        );

        // Deploy BatchToken
        const BT = await ethers.getContractFactory("BatchToken");
        batchToken = await upgrades.deployProxy(BT, [ethers.getAddress(adminAddr), farmerRegistry.target, ""]);
        await batchToken.connect(admin).grantRole(await batchToken.AGENT_ROLE(), ethers.getAddress(agentAddr));
        await batchToken.connect(admin).grantRole(await batchToken.VAULT_ROLE(), ethers.getAddress(vaultSigner.address));
        await batchToken.connect(admin).grantRole(await batchToken.VAULT_ROLE(), ethers.getAddress(adminAddr)); // admin can lock/unlock for tests

        // Mint a batch token for tests
        const tid = await batchToken.nextTokenId();
        await batchToken.connect(agent).mintBatch(
            "B-LV-1",
            ethers.getAddress(coopAddr),
            ethers.getAddress(farmerAddr),
            100, "screen18", 85,
            ethers.encodeBytes32String("h1"),
            ethers.encodeBytes32String("w1")
        );

        // Deploy CreditScore
        const CS = await ethers.getContractFactory("CreditScore");
        creditScore = await upgrades.deployProxy(CS, [ethers.getAddress(adminAddr), farmerRegistry.target]);
        await creditScore.connect(admin).grantRole(await creditScore.VAULT_ROLE(), ethers.getAddress(adminAddr));

        // Deploy ProtocolFee
        const PF = await ethers.getContractFactory("ProtocolFee");
        protocolFee = await upgrades.deployProxy(PF, [ethers.getAddress(adminAddr), mockUSDC.target]);

        // Deploy LendingVault
        const PYTH_ORACLE = "0x98046Bd286715D3B0BC227Dd7a956b83D8978603"; // Mantle Sepolia
        const USDC_USD_ID = "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a";
        const LV = await ethers.getContractFactory("LendingVault");
        vault = await upgrades.deployProxy(LV, [
            ethers.getAddress(adminAddr), batchToken.target, farmerRegistry.target,
            creditScore.target, protocolFee.target, mockUSDC.target,
            PYTH_ORACLE, USDC_USD_ID
        ]);

        // Grant roles
        await vault.connect(admin).grantRole(await vault.VAULT_ROLE(), ethers.getAddress(vaultSigner.address));
        await vault.connect(admin).grantRole(await vault.VAULT_ROLE(), ethers.getAddress(adminAddr));
        await protocolFee.connect(admin).grantRole(await protocolFee.VAULT_ROLE(), vault.target);
        await creditScore.connect(admin).grantRole(await creditScore.VAULT_ROLE(), vault.target);
        await batchToken.connect(admin).grantRole(await batchToken.VAULT_ROLE(), vault.target);
    });

    // ============================================
    // Deployment
    // ============================================
    describe("Deployment", function () {
        it("sets admin", async () => {
            expect(await vault.hasRole(await vault.DEFAULT_ADMIN_ROLE(), ethers.getAddress(adminAddr))).to.be.true;
        });
        it("sets default parameters", async () => {
            expect(await vault.pricePerKgBase()).to.equal(5_000000n);
            expect(await vault.maxLtvBps()).to.equal(8000n);
            expect(await vault.interestRateBps()).to.equal(1000n);
            expect(await vault.paused()).to.be.false;
        });
        it("stores all contract references", async () => {
            expect(await vault.batchToken()).to.equal(batchToken.target);
            expect(await vault.farmerRegistry()).to.equal(farmerRegistry.target);
            expect(await vault.creditScore()).to.equal(creditScore.target);
            expect(await vault.protocolFee()).to.equal(protocolFee.target);
            expect(await vault.usdc()).to.equal(mockUSDC.target);
        });
        it("prevents re-initialization", async () => {
            await expect(vault.initialize(ethers.getAddress(adminAddr), batchToken.target, farmerRegistry.target,
                creditScore.target, protocolFee.target, mockUSDC.target,
                "0x98046Bd286715D3B0BC227Dd7a956b83D8978603",
                "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"))
                .to.be.revertedWithCustomError(vault, "InvalidInitialization");
        });
    });

    // ============================================
    // Admin Functions
    // ============================================
    describe("setCoffeePrice", function () {
        it("updates price and emits event", async () => {
            await expect(vault.connect(admin).setCoffeePrice(300_000000n))
                .to.emit(vault, "CoffeePriceUpdated").withArgs(5_000000n, 300_000000n, ethers.getAddress(adminAddr));
            expect(await vault.pricePerKgBase()).to.equal(300_000000n);
        });
        it("reverts if zero", async () => {
            await expect(vault.connect(admin).setCoffeePrice(0)).to.be.revertedWith("LendingVault: zero price");
        });
        it("reverts if non-admin", async () => {
            await expect(vault.connect(other).setCoffeePrice(300_000000n)).to.be.reverted;
        });
    });

    describe("pause/unpause", function () {
        it("pauses and unpauses", async () => {
            await vault.connect(admin).pause();
            expect(await vault.paused()).to.be.true;
            await vault.connect(admin).unpause();
            expect(await vault.paused()).to.be.false;
        });
        it("reverts if non-admin", async () => {
            await expect(vault.connect(other).pause()).to.be.reverted;
        });
    });

    // ============================================
    // MFI Functions
    // ============================================
    describe("deposit/withdraw", function () {
        beforeEach(async () => {
            await mockUSDC.connect(mfi).approve(vault.target, 1000_000000n);
        });

        it("deposits USDC and updates totals", async () => {
            await expect(vault.connect(mfi).deposit(500_000000n))
                .to.emit(vault, "Deposit").withArgs(ethers.getAddress(mfiAddr), 500_000000n, 500_000000n);
            expect(await vault.totalDeposits()).to.equal(500_000000n);
            expect(await vault.mfiDeposits(mfiAddr)).to.equal(500_000000n);
        });

        it("withdraws USDC when liquidity available", async () => {
            await vault.connect(mfi).deposit(500_000000n);
            await expect(vault.connect(mfi).withdraw(200_000000n))
                .to.emit(vault, "Withdrawal").withArgs(ethers.getAddress(mfiAddr), 200_000000n, 300_000000n);
            expect(await vault.totalDeposits()).to.equal(300_000000n);
        });

        it("reverts withdrawal if insufficient liquidity", async () => {
            await vault.connect(mfi).deposit(500_000000n);
            await expect(vault.connect(mfi).withdraw(600_000000n))
                .to.be.revertedWith("LendingVault: insufficient deposit");
        });

        it("reverts deposit if zero", async () => {
            await expect(vault.connect(mfi).deposit(0)).to.be.revertedWith("LendingVault: zero deposit");
        });
    });

    // ============================================
    // Loan Origination
    // ============================================
    describe("originate", function () {
        beforeEach(async () => {
            await mockUSDC.connect(mfi).approve(vault.target, 20000_000000n);
            await vault.connect(mfi).deposit(20000_000000n);
        });

        it("originates loan, locks collateral, and transfers to farmer", async () => {
            const farmerBalBefore = await mockUSDC.balanceOf(farmerAddr);
            await expect(vault.connect(admin).originate(1n, ethers.getAddress(farmerAddr)))
                .to.emit(vault, "LoanOriginated");

            const farmerBalAfter = await mockUSDC.balanceOf(farmerAddr);
            expect(farmerBalAfter).to.be.gt(farmerBalBefore);

            const loan = await vault.getLoan(1n);
            expect(loan.status).to.equal(1n); // ACTIVE
            expect(loan.batchTokenId).to.equal(1n);
            expect(loan.farmerWallet).to.equal(ethers.getAddress(farmerAddr));
            expect(loan.principalUsdc).to.be.gt(0);

            expect(await batchToken.hasActiveLoan(1n)).to.be.true;
            expect(await vault.activeLoanBook()).to.equal(loan.principalUsdc);
        });

        it("reverts when paused", async () => {
            await vault.connect(admin).pause();
            await expect(vault.connect(admin).originate(1n, ethers.getAddress(farmerAddr)))
                .to.be.revertedWith("LendingVault: paused");
        });

        it("reverts if farmer not registered", async () => {
            await expect(vault.connect(admin).originate(1n, ethers.getAddress(other.address)))
                .to.be.revertedWith("LendingVault: farmer not registered");
        });

        it("reverts if batch already has loan", async () => {
            await vault.connect(admin).originate(1n, ethers.getAddress(farmerAddr));
            await expect(vault.connect(admin).originate(1n, ethers.getAddress(farmerAddr)))
                .to.be.revertedWith("LendingVault: batch has existing loan");
        });

        it("reverts if insufficient liquidity", async () => {
            // Set coffee price very high to create large loan request
            await vault.connect(admin).setCoffeePrice(10000_000000n); // $10,000/kg
            await expect(vault.connect(admin).originate(1n, ethers.getAddress(farmerAddr)))
                .to.be.revertedWith("LendingVault: insufficient liquidity");
        });
    });

    // ============================================
    // settle
    // ============================================
    describe("settle", function () {
        let principal: bigint, interest: bigint;

        beforeEach(async () => {
            await mockUSDC.connect(mfi).approve(vault.target, 20000_000000n);
            await vault.connect(mfi).deposit(20000_000000n);
            await vault.connect(admin).originate(1n, ethers.getAddress(farmerAddr));
            const loan = await vault.getLoan(1n);
            principal = loan.principalUsdc;
            interest = loan.interestUsdc;

            // Mint USDC to admin for settlement (simulating buyer payment)
            await mockUSDC.connect(admin).mint(ethers.getAddress(adminAddr), 20000_000000n);
            await mockUSDC.connect(admin).approve(vault.target, 20000_000000n);
        });

        it("settles loan, pays protocol fee, unlocks and burns batch", async () => {
            const totalDue = principal + interest;
            const protocolFeeAmount = (totalDue * 4n) / 100n;
            await expect(vault.connect(admin).settle(1n, totalDue + protocolFeeAmount))
                .to.emit(vault, "LoanSettled");

            expect((await vault.getLoan(1n)).status).to.equal(3n); // SETTLED
            expect(await batchToken.hasActiveLoan(1n)).to.be.false;
            expect(await protocolFee.totalCollected()).to.be.gt(0);
        });

        it("reverts if loan not active", async () => {
            await expect(vault.connect(admin).settle(999n, 1000_000000n))
                .to.be.revertedWith("LendingVault: loan not active");
        });

        it("reverts if insufficient repayment", async () => {
            await expect(vault.connect(admin).settle(1n, 1n))
                .to.be.revertedWith("LendingVault: insufficient repayment");
        });
    });

    // ============================================
    // markDefaulted
    // ============================================
    describe("markDefaulted", function () {
        beforeEach(async () => {
            await mockUSDC.connect(mfi).approve(vault.target, 20000_000000n);
            await vault.connect(mfi).deposit(20000_000000n);
            await vault.connect(admin).originate(1n, ethers.getAddress(farmerAddr));
        });

        it("marks default after expiry", async () => {
            // Advance time past loan term
            await ethers.provider.send("evm_increaseTime", [91 * 86400]); // 91 days
            await ethers.provider.send("evm_mine");

            await expect(vault.connect(admin).markDefaulted(1n))
                .to.emit(vault, "LoanDefaulted");
            expect((await vault.getLoan(1n)).status).to.equal(2n); // DEFAULTED
        });

        it("reverts if loan not active", async () => {
            await expect(vault.connect(admin).markDefaulted(999n))
                .to.be.revertedWith("LendingVault: loan not active");
        });

        it("reverts if not yet expired", async () => {
            await expect(vault.connect(admin).markDefaulted(1n))
                .to.be.revertedWith("LendingVault: loan not yet expired");
        });
    });

    // ============================================
    // getBatchValue & getGradeMultiplier
    // ============================================
    describe("valuation", function () {
        it("returns correct value for screen18", async () => {
            // $5.00/kg × 100kg × 1.00x = $500
            const value = await vault.getBatchValue(1n);
            expect(value).to.equal(500_000000n);
        });

        it("returns correct grade multipliers", async () => {
            expect(await vault.getGradeMultiplier("screen18")).to.equal(100n);
            expect(await vault.getGradeMultiplier("screen15")).to.equal(85n);
            expect(await vault.getGradeMultiplier("FAQ")).to.equal(60n);
            expect(await vault.getGradeMultiplier("unknown")).to.equal(50n);
        });
    });

    // ============================================
    // getFarmerLoans
    // ============================================
    describe("getFarmerLoans", function () {
        it("returns empty array for new farmer", async () => {
            const loans = await vault.getFarmerLoans(farmerAddr);
            expect(loans).to.deep.equal([]);
        });

        it("returns loan IDs after origination", async () => {
            await mockUSDC.connect(mfi).approve(vault.target, 20000_000000n);
            await vault.connect(mfi).deposit(20000_000000n);
            await vault.connect(admin).originate(1n, ethers.getAddress(farmerAddr));

            const loans = await vault.getFarmerLoans(farmerAddr);
            expect(loans).to.deep.equal([1n]);
        });
    });

    // ============================================
    // Upgrade
    // ============================================
    describe("upgradeability", function () {
        it("admin can upgrade", async () => {
            const V2 = await ethers.getContractFactory("LendingVault");
            const upgraded = await upgrades.upgradeProxy(vault.target, V2.connect(admin));
            expect(upgraded.target).to.equal(vault.target);
        });
        it("non-admin reverts", async () => {
            const V2 = await ethers.getContractFactory("LendingVault");
            await expect(upgrades.upgradeProxy(vault.target, V2.connect(other))).to.be.reverted;
        });
    });
});