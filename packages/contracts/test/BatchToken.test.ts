import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";

describe("BatchToken", function () {
    let BatchToken: any;
    let FarmerRegistry: any;
    let farmerRegistry: Contract;
    let batchToken: Contract;
    let deployer: SignerWithAddress,
        admin: SignerWithAddress,
        vault: SignerWithAddress,
        agent: SignerWithAddress,
        farmer1: SignerWithAddress,
        farmer2: SignerWithAddress,
        cooperative: SignerWithAddress,
        other: SignerWithAddress;

    const MAAIF_ID_1 = "MAAIF-001";
    const BATCH_ID_1 = "BATCH-2026-0001";
    const IPFS_CID = "0x" + "a".repeat(64);
    const GPS_HASH = "0x" + "b".repeat(64);

    beforeEach(async function () {
        [deployer, admin, vault, agent, farmer1, farmer2, cooperative, other] = await ethers.getSigners();

        // Deploy Mock FarmerRegistry
        const FarmerRegistryFactory = await ethers.getContractFactory("FarmerRegistry");
        farmerRegistry = await upgrades.deployProxy(FarmerRegistryFactory, [admin.address]);
        await farmerRegistry.connect(admin).setIndependentAggregator(other.address);

        const REGISTRY_COOP_ROLE = await farmerRegistry.COOP_ROLE();
        const REGISTRY_AGENT_ROLE = await farmerRegistry.AGENT_ROLE();
        await farmerRegistry.connect(admin).grantRole(REGISTRY_COOP_ROLE, admin.address);
        await farmerRegistry.connect(admin).grantRole(REGISTRY_AGENT_ROLE, agent.address);

        // Register farmer1
        await farmerRegistry.connect(agent).registerFarmer(
            farmer1.address,
            MAAIF_ID_1,
            cooperative.address,
            IPFS_CID,
            250,
            true,
            "NIN-BT-001",
            "Test Farmer 1",
            "+256700000001"
        );

        // Deploy BatchToken
        BatchToken = await ethers.getContractFactory("BatchToken");
        batchToken = await upgrades.deployProxy(BatchToken, [
            admin.address,
            farmerRegistry.target, // using .target in ethers v6 context, similar to test fix
            "ipfs://base-uri/"
        ]);

        // Grant necessary roles
        const VAULT_ROLE = await batchToken.VAULT_ROLE();
        const AGENT_ROLE = await batchToken.AGENT_ROLE();
        await batchToken.connect(admin).grantRole(VAULT_ROLE, vault.address);
        await batchToken.connect(admin).grantRole(AGENT_ROLE, agent.address);
    });

    describe("Deployment and Initialization", function () {
        it("should set the correct admin and FarmerRegistry address", async function () {
            const DEFAULT_ADMIN_ROLE = await batchToken.DEFAULT_ADMIN_ROLE();
            expect(await batchToken.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
            expect(await batchToken.farmerRegistry()).to.equal(farmerRegistry.target);
        });

        it("nextTokenId starts at 1, not 0", async function () {
            expect(await batchToken.nextTokenId()).to.equal(1);
        });
    });

    describe("mintBatch", function () {
        it("mints successfully for a registered active farmer", async function () {
            const tx = await batchToken.connect(agent).mintBatch(
                BATCH_ID_1,
                cooperative.address,
                farmer1.address,
                675, // 67.5 kg
                "screen18",
                112, // 11.2%
                GPS_HASH,
                IPFS_CID
            );
            
            // Check balance
            expect(await batchToken.balanceOf(cooperative.address, 1)).to.equal(1);
            
            // Check Event
            await expect(tx).to.emit(batchToken, "BatchMinted")
                .withArgs(1, BATCH_ID_1, farmer1.address, cooperative.address, 675, "screen18", await time.latest());
        });

        it("mints successfully for a registered but DEACTIVATED farmer", async function () {
            // Deactivate farmer
            const COOP_ROLE = await farmerRegistry.COOP_ROLE();
            await farmerRegistry.connect(admin).grantRole(COOP_ROLE, cooperative.address);
            await farmerRegistry.connect(cooperative).deactivateFarmer(farmer1.address);
            
            // Should still mint
            await expect(batchToken.connect(agent).mintBatch(
                BATCH_ID_1, cooperative.address, farmer1.address, 675, "screen18", 112, GPS_HASH, IPFS_CID
            )).to.not.be.reverted;
        });

        it("reverts for an address never registered in FarmerRegistry", async function () {
            await expect(batchToken.connect(agent).mintBatch(
                BATCH_ID_1, cooperative.address, farmer2.address, 675, "screen18", 112, GPS_HASH, IPFS_CID
            )).to.be.revertedWith("BatchToken: farmer not registered");
        });

        it("increments nextTokenId after each mint", async function () {
            await batchToken.connect(agent).mintBatch(BATCH_ID_1, cooperative.address, farmer1.address, 675, "screen18", 112, GPS_HASH, IPFS_CID);
            expect(await batchToken.nextTokenId()).to.equal(2);

            await batchToken.connect(agent).mintBatch("BATCH-2", cooperative.address, farmer1.address, 675, "screen18", 112, GPS_HASH, IPFS_CID);
            expect(await batchToken.nextTokenId()).to.equal(3);
        });

        it("stores BatchData correctly — verify every field", async function () {
            await batchToken.connect(agent).mintBatch(
                BATCH_ID_1,
                cooperative.address,
                farmer1.address,
                675,
                "screen18",
                112,
                GPS_HASH,
                IPFS_CID
            );

            const batch = await batchToken.getBatchData(1);
            expect(batch.batchId).to.equal(BATCH_ID_1);
            expect(batch.farmerWallet).to.equal(farmer1.address);
            expect(batch.cooperativeWallet).to.equal(cooperative.address);
            expect(batch.weightKg).to.equal(675);
            expect(batch.grade).to.equal("screen18");
            expect(batch.moisturePct).to.equal(112);
            expect(batch.collectionPointHash).to.equal(GPS_HASH);
            expect(batch.weightSlipIpfsCid).to.equal(IPFS_CID);
            expect(batch.loanActive).to.be.false;
            expect(batch.mintTimestamp).to.be.gt(0);
        });

        it("reverts if caller lacks AGENT_ROLE", async function () {
            await expect(batchToken.connect(other).mintBatch(
                BATCH_ID_1, cooperative.address, farmer1.address, 675, "screen18", 112, GPS_HASH, IPFS_CID
            )).to.be.reverted; // AccessControl error
        });
        
        it("reverts if weight is zero", async function () {
            await expect(batchToken.connect(agent).mintBatch(
                BATCH_ID_1, cooperative.address, farmer1.address, 0, "screen18", 112, GPS_HASH, IPFS_CID
            )).to.be.revertedWith("BatchToken: Weight must be > 0");
        });
    });

    describe("collateral locking", function () {
        beforeEach(async function () {
            await batchToken.connect(agent).mintBatch(BATCH_ID_1, cooperative.address, farmer1.address, 675, "screen18", 112, GPS_HASH, IPFS_CID);
        });

        it("lockAsCollateral sets loanActive = true", async function () {
            const tx = await batchToken.connect(vault).lockAsCollateral(1);
            expect(await batchToken.hasActiveLoan(1)).to.be.true;
            
            await expect(tx).to.emit(batchToken, "CollateralLocked").withArgs(1, vault.address);
        });

        it("unlockCollateral sets loanActive = false", async function () {
            await batchToken.connect(vault).lockAsCollateral(1);
            const tx = await batchToken.connect(vault).unlockCollateral(1);
            expect(await batchToken.hasActiveLoan(1)).to.be.false;

            await expect(tx).to.emit(batchToken, "CollateralUnlocked").withArgs(1);
        });

        it("lockAsCollateral reverts if already locked", async function () {
            await batchToken.connect(vault).lockAsCollateral(1);
            await expect(batchToken.connect(vault).lockAsCollateral(1)).to.be.revertedWith("BatchToken: Already locked");
        });

        it("unlockCollateral reverts if not locked", async function () {
            await expect(batchToken.connect(vault).unlockCollateral(1)).to.be.revertedWith("BatchToken: Not locked");
        });

        it("reverts if caller lacks VAULT_ROLE on both functions", async function () {
            await expect(batchToken.connect(agent).lockAsCollateral(1)).to.be.reverted;
            
            await batchToken.connect(vault).lockAsCollateral(1);
            await expect(batchToken.connect(agent).unlockCollateral(1)).to.be.reverted;
        });
    });

    describe("safeTransferFrom — Invariant #7", function () {
        beforeEach(async function () {
            await batchToken.connect(agent).mintBatch(BATCH_ID_1, cooperative.address, farmer1.address, 675, "screen18", 112, GPS_HASH, IPFS_CID);
        });

        it("allows transfer when loanActive == false", async function () {
            await expect(batchToken.connect(cooperative).safeTransferFrom(cooperative.address, other.address, 1, 1, "0x"))
                .to.not.be.reverted;
            expect(await batchToken.balanceOf(other.address, 1)).to.equal(1);
        });

        it("reverts transfer when loanActive == true", async function () {
            await batchToken.connect(vault).lockAsCollateral(1);
            await expect(batchToken.connect(cooperative).safeTransferFrom(cooperative.address, other.address, 1, 1, "0x"))
                .to.be.revertedWith("BatchToken: token locked as collateral");
        });

        it("allows mint (from == address(0)) regardless of state", async function () {
            // Already minted in beforeEach successfully. Let's just lock one and mint another.
            await batchToken.connect(vault).lockAsCollateral(1);
            await expect(batchToken.connect(agent).mintBatch("BATCH-2", cooperative.address, farmer1.address, 675, "screen18", 112, GPS_HASH, IPFS_CID))
                .to.not.be.reverted;
        });

        it("allows burn (to == address(0)) when loanActive == true", async function () {
            await batchToken.connect(vault).lockAsCollateral(1);
            // This relies on burnSettled internally doing a burn which calls _update
            await expect(batchToken.connect(vault).burnSettled(1)).to.not.be.reverted;
        });
    });

    describe("burnSettled", function () {
        beforeEach(async function () {
            await batchToken.connect(agent).mintBatch(BATCH_ID_1, cooperative.address, farmer1.address, 675, "screen18", 112, GPS_HASH, IPFS_CID);
            await batchToken.connect(vault).lockAsCollateral(1);
        });

        it("burns the token — balance becomes 0", async function () {
            await batchToken.connect(vault).burnSettled(1);
            expect(await batchToken.balanceOf(cooperative.address, 1)).to.equal(0);
        });

        it("deletes batchData — getBatchData returns empty struct after burn", async function () {
            await batchToken.connect(vault).burnSettled(1);
            // Should revert because mintTimestamp will be 0 after delete
            await expect(batchToken.getBatchData(1)).to.be.revertedWith("BatchToken: Token does not exist");
        });

        it("emits BatchSettled", async function () {
            const tx = await batchToken.connect(vault).burnSettled(1);
            await expect(tx).to.emit(batchToken, "BatchSettled").withArgs(1, await time.latest());
        });

        it("reverts if caller lacks VAULT_ROLE", async function () {
            await expect(batchToken.connect(agent).burnSettled(1)).to.be.reverted;
        });

        it("reverts if tokenId does not exist", async function () {
            await expect(batchToken.connect(vault).burnSettled(999)).to.be.revertedWith("BatchToken: Token does not exist");
        });
    });

    describe("UUPS Upgradeability", function () {
        it("should only allow admin to upgrade", async function () {
            const BatchTokenV2 = await ethers.getContractFactory("BatchToken"); 
            await expect(upgrades.upgradeProxy(batchToken.target, BatchTokenV2.connect(other)))
                .to.be.reverted;
        });

        it("should allow admin to upgrade", async function () {
            const BatchTokenV2 = await ethers.getContractFactory("BatchToken");
            const batchToken2 = await upgrades.upgradeProxy(batchToken.target, BatchTokenV2.connect(admin));
            expect(batchToken2.target).to.equal(batchToken.target);
        });
    });
});