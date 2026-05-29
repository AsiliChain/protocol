import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("ProtocolFee", function () {
    let fee: any;
    let usdc: any;
    let admin: any, vault: any, multisig: any, recipient: any, other: any;
    let adminAddr: string, vaultAddr: string, multisigAddr: string, recipientAddr: string;

    beforeEach(async function () {
        [, admin, vault, multisig, recipient, other] = await ethers.getSigners();
        adminAddr   = admin.address;
        vaultAddr   = vault.address;
        multisigAddr = multisig.address;
        recipientAddr = recipient.address;

        // Deploy mock USDC
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        usdc = await MockUSDC.deploy("USDC", "USDC", 6);
        await usdc.connect(admin).mint(ethers.getAddress(admin.address), 10000_000000n); // 10,000 USDC

        // Deploy ProtocolFee
        const PF = await ethers.getContractFactory("ProtocolFee");
        fee = await upgrades.deployProxy(PF, [admin.address, usdc.target]);

        // Grant roles
        await fee.connect(admin).grantRole(await fee.VAULT_ROLE(), ethers.getAddress(vaultAddr));
        await fee.connect(admin).grantRole(await fee.MULTISIG_ROLE(), ethers.getAddress(multisigAddr));
    });

    // ============================================
    // Deployment
    // ============================================
    describe("Deployment", function () {
        it("sets admin", async () => {
            const role = await fee.DEFAULT_ADMIN_ROLE();
            expect(await fee.hasRole(role, ethers.getAddress(admin.address))).to.be.true;
        });
        it("sets usdcToken address", async () => {
            expect(await fee.usdcToken()).to.equal(usdc.target);
        });
        it("starts with zero totals", async () => {
            expect(await fee.totalCollected()).to.equal(0n);
            expect(await fee.totalDistributed()).to.equal(0n);
        });
        it("prevents re-initialization", async () => {
            await expect(fee.initialize(ethers.getAddress(admin.address), usdc.target))
                .to.be.revertedWithCustomError(fee, "InvalidInitialization");
        });
    });

    // ============================================
    // collect
    // ============================================
    describe("collect", function () {
        it("records collection and emits event", async () => {
            await expect(fee.connect(vault).collect(400_000000n))
                .to.emit(fee, "FeeCollected");
            expect(await fee.totalCollected()).to.equal(400_000000n);
            expect(await fee.pendingDistribution()).to.equal(400_000000n);
        });

        it("accumulates multiple collections", async () => {
            await fee.connect(vault).collect(100_000000n);
            await fee.connect(vault).collect(200_000000n);
            expect(await fee.totalCollected()).to.equal(300_000000n);
            expect(await fee.pendingDistribution()).to.equal(300_000000n);
        });

        it("reverts if amount is zero", async () => {
            await expect(fee.connect(vault).collect(0))
                .to.be.revertedWith("ProtocolFee: zero amount");
        });

        it("reverts if caller lacks VAULT_ROLE", async () => {
            await expect(fee.connect(other).collect(100_000000n)).to.be.reverted;
        });
    });

    // ============================================
    // distribute
    // ============================================
    describe("distribute", function () {
        beforeEach(async function () {
            // Seed USDC: transfer 500 USDC to ProtocolFee contract, then collect
            await usdc.connect(admin).transfer(await fee.getAddress(), 500_000000n);
            await fee.connect(vault).collect(500_000000n);
        });

        it("distributes USDC and emits event", async () => {
            await expect(fee.connect(multisig).distribute(recipientAddr, 200_000000n, "Operations Q3"))
                .to.emit(fee, "FeeDistributed");

            expect(await fee.totalDistributed()).to.equal(200_000000n);
            expect(await fee.pendingDistribution()).to.equal(300_000000n);
            expect(await usdc.balanceOf(recipientAddr)).to.equal(200_000000n);
        });

        it("allows multiple distributions up to total collected", async () => {
            await fee.connect(multisig).distribute(recipientAddr, 200_000000n, "A");
            await fee.connect(multisig).distribute(recipientAddr, 300_000000n, "B");
            expect(await fee.totalDistributed()).to.equal(500_000000n);
            expect(await fee.pendingDistribution()).to.equal(0n);
        });

        it("reverts if recipient is zero", async () => {
            await expect(fee.connect(multisig).distribute("0x0000000000000000000000000000000000000000", 100_000000n, "A"))
                .to.be.revertedWith("ProtocolFee: zero recipient");
        });

        it("reverts if amount is zero", async () => {
            await expect(fee.connect(multisig).distribute(recipientAddr, 0, "A"))
                .to.be.revertedWith("ProtocolFee: zero amount");
        });

        it("reverts if purpose is empty", async () => {
            await expect(fee.connect(multisig).distribute(recipientAddr, 100_000000n, ""))
                .to.be.revertedWith("ProtocolFee: empty purpose");
        });

        it("reverts if amount exceeds pending distribution", async () => {
            await expect(fee.connect(multisig).distribute(recipientAddr, 600_000000n, "A"))
                .to.be.revertedWith("ProtocolFee: insufficient balance");
        });

        it("reverts if caller lacks MULTISIG_ROLE", async () => {
            await expect(fee.connect(other).distribute(recipientAddr, 100_000000n, "A")).to.be.reverted;
        });
    });

    // ============================================
    // pendingDistribution
    // ============================================
    describe("pendingDistribution", function () {
        it("reflects collected minus distributed", async () => {
            await usdc.connect(admin).transfer(await fee.getAddress(), 500_000000n);
            await fee.connect(vault).collect(500_000000n);
            await fee.connect(multisig).distribute(recipientAddr, 150_000000n, "A");
            expect(await fee.pendingDistribution()).to.equal(350_000000n);
        });
    });

    // ============================================
    // Upgrade
    // ============================================
    describe("upgradeability", function () {
        it("admin can upgrade", async () => {
            const V2 = await ethers.getContractFactory("ProtocolFee");
            const upgraded = await upgrades.upgradeProxy(fee.target, V2.connect(admin));
            expect(upgraded.target).to.equal(fee.target);
        });

        it("non-admin reverts", async () => {
            const V2 = await ethers.getContractFactory("ProtocolFee");
            await expect(upgrades.upgradeProxy(fee.target, V2.connect(other))).to.be.reverted;
        });
    });
});