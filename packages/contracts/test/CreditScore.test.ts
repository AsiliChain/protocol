import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";

const USDC = (n: number) => BigInt(n) * 10n**6n;

describe("CreditScore", function () {
    let CreditScore: any;
    let FarmerRegistry: any;
    let farmerRegistry: Contract;
    let creditScore: Contract;
    let admin: SignerWithAddress,
        vault: SignerWithAddress,
        agent: SignerWithAddress,
        farmer1: SignerWithAddress,
        farmer2: SignerWithAddress,
        cooperative: SignerWithAddress,
        other: SignerWithAddress;

    const STARTING_SCORE = 500;
    const SCORE_CEILING = 850;
    const SCORE_FLOOR = 0;
    const REPAYMENT_BONUS = 40;
    const DELIVERY_BONUS = 15;
    const DEFAULT_PENALTY = 100;

    beforeEach(async function () {
        [, admin, vault, agent, farmer1, farmer2, cooperative, other] = await ethers.getSigners();

        // Deploy FarmerRegistry
        FarmerRegistry = await ethers.getContractFactory("FarmerRegistry");
        farmerRegistry = await upgrades.deployProxy(FarmerRegistry, [admin.address]);
        await farmerRegistry.connect(admin).setIndependentAggregator(cooperative.address);
        await farmerRegistry.connect(admin).grantRole(await farmerRegistry.AGENT_ROLE(), agent.address);

        // Deploy CreditScore
        CreditScore = await ethers.getContractFactory("CreditScore");
        creditScore = await upgrades.deployProxy(CreditScore, [admin.address, farmerRegistry.target]);

        // Grant roles
        await creditScore.connect(admin).grantRole(await creditScore.VAULT_ROLE(), vault.address);
        await creditScore.connect(admin).grantRole(await creditScore.AGENT_ROLE(), agent.address);

        // Register farmer1
        await farmerRegistry.connect(agent).registerFarmer(
            farmer1.address, "MAAIF-001", cooperative.address,
            ethers.encodeBytes32String("ipfs-cid"), 250, true
        );
    });

    describe("Deployment and Initialization", function () {
        it("should set the correct admin and FarmerRegistry address", async function () {
            const DEFAULT_ADMIN_ROLE = await creditScore.DEFAULT_ADMIN_ROLE();
            expect(await creditScore.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
            expect(await creditScore.farmerRegistry()).to.equal(farmerRegistry.target);
        });

        it("should prevent re-initialization", async function () {
            await expect(creditScore.initialize(admin.address, farmerRegistry.target))
                .to.be.revertedWithCustomError(creditScore, "InvalidInitialization");
        });

        it("should allow admin to grant roles", async function () {
            const VAULT_ROLE = await creditScore.VAULT_ROLE();
            await creditScore.connect(admin).grantRole(VAULT_ROLE, other.address);
            expect(await creditScore.hasRole(VAULT_ROLE, other.address)).to.be.true;
        });

        it("should prevent non-admin from granting roles", async function () {
            const VAULT_ROLE = await creditScore.VAULT_ROLE();
            await expect(creditScore.connect(other).grantRole(VAULT_ROLE, other.address))
                .to.be.reverted;
        });
    });

    describe("getScore", function () {
        it("should return the STARTING_SCORE for an uninitialized farmer", async function () {
            expect(await creditScore.getScore(farmer1.address)).to.equal(STARTING_SCORE);
        });

        it("should return the correct score for an initialized farmer", async function () {
            await creditScore.connect(agent).recordDelivery(farmer1.address);
            expect(await creditScore.getScore(farmer1.address)).to.equal(STARTING_SCORE + DELIVERY_BONUS);
        });
    });

    describe("Lazy Initialization and Score Updates", function () {
        it("should lazily initialize score on first recordDelivery", async function () {
            await expect(creditScore.connect(agent).recordDelivery(farmer1.address))
                .to.emit(creditScore, "ScoreInitialised")
                .withArgs(farmer1.address, STARTING_SCORE)
                .and.to.emit(creditScore, "ScoreUpdated")
                .withArgs(farmer1.address, STARTING_SCORE, STARTING_SCORE + DELIVERY_BONUS, "On-time delivery");

            expect(await creditScore.scores(farmer1.address)).to.equal(STARTING_SCORE + DELIVERY_BONUS);
        });

        it("should lazily initialize score on first recordRepayment", async function () {
            await expect(creditScore.connect(vault).recordRepayment(farmer1.address))
                .to.emit(creditScore, "ScoreInitialised")
                .withArgs(farmer1.address, STARTING_SCORE)
                .and.to.emit(creditScore, "ScoreUpdated")
                .withArgs(farmer1.address, STARTING_SCORE, STARTING_SCORE + REPAYMENT_BONUS, "On-time repayment");

            expect(await creditScore.scores(farmer1.address)).to.equal(STARTING_SCORE + REPAYMENT_BONUS);
        });

        it("should lazily initialize score on first recordDefault", async function () {
            await expect(creditScore.connect(vault).recordDefault(farmer1.address))
                .to.emit(creditScore, "ScoreInitialised")
                .withArgs(farmer1.address, STARTING_SCORE)
                .and.to.emit(creditScore, "ScoreUpdated")
                .withArgs(farmer1.address, STARTING_SCORE, STARTING_SCORE - DEFAULT_PENALTY, "Loan default");

            expect(await creditScore.scores(farmer1.address)).to.equal(STARTING_SCORE - DEFAULT_PENALTY);
        });

        it("should not emit ScoreInitialised on subsequent updates", async function () {
            // First update — emits ScoreInitialised
            await expect(creditScore.connect(agent).recordDelivery(farmer1.address))
                .to.emit(creditScore, "ScoreInitialised");

            // Second update — MUST NOT emit ScoreInitialised
            await expect(creditScore.connect(vault).recordRepayment(farmer1.address))
                .to.not.emit(creditScore, "ScoreInitialised");

            // ScoreUpdated should still emit on second call
            await expect(creditScore.connect(vault).recordRepayment(farmer1.address))
                .to.emit(creditScore, "ScoreUpdated");
        });
    });

    describe("Scoring Logic and Clamping", function () {
        it("should not allow score to exceed SCORE_CEILING", async function () {
            // 500 + 9×40 = 860. Contract clamps at 850.
            for(let i = 0; i < 9; i++) {
                await creditScore.connect(vault).recordRepayment(farmer1.address);
            }
            expect(await creditScore.getScore(farmer1.address)).to.equal(SCORE_CEILING);

            // Further repayments should have no effect
            await creditScore.connect(vault).recordRepayment(farmer1.address);
            expect(await creditScore.getScore(farmer1.address)).to.equal(SCORE_CEILING);
        });

        it("should not allow score to go below SCORE_FLOOR", async function () {
            await farmerRegistry.connect(agent).registerFarmer(
                farmer2.address, "MAAIF-FLOOR-004",
                cooperative.address, ethers.encodeBytes32String("ipfs-fl4"), 300, true
            );
            const f = await farmerRegistry.getFarmer(farmer2.address);
            expect(f.active).to.be.true;

            // Check initialized and scores before starting
            // Verify nothing is initialized yet
            const initBefore = await creditScore.initialized(farmer2.address);
            
            // First recordDefault — should init
            const tx1 = await creditScore.connect(vault).recordDefault(farmer2.address);
            const initAfter = await creditScore.initialized(farmer2.address);
            const s1 = await creditScore.getScore(farmer2.address);
            
            // Second
            await creditScore.connect(vault).recordDefault(farmer2.address);
            const s2 = await creditScore.getScore(farmer2.address);
            
            // Third
            await creditScore.connect(vault).recordDefault(farmer2.address);
            const s3 = await creditScore.getScore(farmer2.address);
            
            // Fourth
            await creditScore.connect(vault).recordDefault(farmer2.address);
            const s4 = await creditScore.getScore(farmer2.address);
            
            // Fifth
            await creditScore.connect(vault).recordDefault(farmer2.address);
            const s5 = await creditScore.getScore(farmer2.address);
            
            // Sixth
            await creditScore.connect(vault).recordDefault(farmer2.address);
            const s6 = await creditScore.getScore(farmer2.address);

            // All should be 400, 300, 200, 100, 0, 0
            expect(s1).to.equal(400);
            expect(s2).to.equal(300);
            expect(s3).to.equal(200);
            expect(s4).to.equal(100);
            expect(s5).to.equal(0);
            expect(s6).to.equal(0);
        });
    });

    describe("Role-based Access Control", function () {
        it("should only allow VAULT_ROLE to call recordRepayment", async function () {
            await expect(creditScore.connect(agent).recordRepayment(farmer1.address)).to.be.reverted;
            await expect(creditScore.connect(vault).recordRepayment(farmer1.address)).to.not.be.reverted;
        });

        it("should only allow VAULT_ROLE to call recordDefault", async function () {
            await expect(creditScore.connect(agent).recordDefault(farmer1.address)).to.be.reverted;
            await expect(creditScore.connect(vault).recordDefault(farmer1.address)).to.not.be.reverted;
        });

        it("should only allow AGENT_ROLE to call recordDelivery", async function () {
            await expect(creditScore.connect(vault).recordDelivery(farmer1.address)).to.be.reverted;
            await expect(creditScore.connect(agent).recordDelivery(farmer1.address)).to.not.be.reverted;
        });

        it("should only allow DEFAULT_ADMIN_ROLE to call recordPenalty", async function () {
            await expect(creditScore.connect(vault).recordPenalty(farmer1.address, 50)).to.be.reverted;
            await expect(creditScore.connect(admin).recordPenalty(farmer1.address, 50)).to.not.be.reverted;
        });
    });

    describe("Farmer Existence Check", function () {
        it("should revert recordDelivery for an unregistered farmer", async function () {
            await expect(creditScore.connect(agent).recordDelivery(farmer2.address))
                .to.be.revertedWith("CreditScore: farmer not registered");
        });

        it("should revert recordRepayment for an unregistered farmer", async function () {
            await expect(creditScore.connect(vault).recordRepayment(farmer2.address))
                .to.be.revertedWith("CreditScore: farmer not registered");
        });

        it("should revert recordDefault for an unregistered farmer", async function () {
            await expect(creditScore.connect(vault).recordDefault(farmer2.address))
                .to.be.revertedWith("CreditScore: farmer not registered");
        });

        it("should allow score updates for a deactivated farmer", async function () {
            const COOP_ROLE = await farmerRegistry.COOP_ROLE();
            await farmerRegistry.connect(admin).grantRole(COOP_ROLE, cooperative.address);
            await farmerRegistry.connect(cooperative).deactivateFarmer(farmer1.address);
            
            await expect(creditScore.connect(agent).recordDelivery(farmer1.address))
                .to.not.be.reverted;
        });
    });

    describe("getLtvTier", function () {
        it("should return the Standard tier for default score (200 USDC, 50% LTV)", async function () {
            const [maxLoan, ltvBps] = await creditScore.getLtvTier(farmer1.address);
            expect(maxLoan).to.equal(USDC(200));
            expect(ltvBps).to.equal(5000);
        });

        it("should return the Enhanced tier at score 580 (500 USDC, 55% LTV)", async function () {
            // 500 + 2×40 = 580
            for(let i = 0; i < 2; i++) {
                await creditScore.connect(vault).recordRepayment(farmer1.address);
            }
            const [maxLoan, ltvBps] = await creditScore.getLtvTier(farmer1.address);
            expect(maxLoan).to.equal(USDC(500));
            expect(ltvBps).to.equal(5500);
        });

        it("should return the Premium tier at score 660 (1,500 USDC, 65% LTV)", async function () {
            // 500 + 4×40 = 660
            for(let i = 0; i < 4; i++) {
                await creditScore.connect(vault).recordRepayment(farmer1.address);
            }
            const [maxLoan, ltvBps] = await creditScore.getLtvTier(farmer1.address);
            expect(maxLoan).to.equal(USDC(1500));
            expect(ltvBps).to.equal(6500);
        });

        it("should return the Institutional tier at score 780 (5,000 USDC, 75% LTV)", async function () {
            // 500 + 7×40 = 780
            for(let i = 0; i < 7; i++) {
                await creditScore.connect(vault).recordRepayment(farmer1.address);
            }
            const [maxLoan, ltvBps] = await creditScore.getLtvTier(farmer1.address);
            expect(maxLoan).to.equal(USDC(5000));
            expect(ltvBps).to.equal(7500);
        });
    });

    describe("UUPS Upgradeability", function () {
        it("should only allow admin to upgrade", async function () {
            const CreditScoreV2 = await ethers.getContractFactory("CreditScore");
            await expect(upgrades.upgradeProxy(creditScore.target, CreditScoreV2.connect(other)))
                .to.be.reverted;
        });

        it("should allow admin to upgrade", async function () {
            const CreditScoreV2 = await ethers.getContractFactory("CreditScore");
            const upgraded = await upgrades.upgradeProxy(creditScore.target, CreditScoreV2.connect(admin));
            expect(upgraded.target).to.equal(creditScore.target);
        });
    });
});
