import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

let buyerAddr: string;
let coopAddr: string;
let agentAddr: string;
let farmerAddr: string;
let adminAddr: string;
let otherAddr: string;

describe("PurchaseOrder", function () {
    let po: any, batchToken: any, traceLog: any, farmerRegistry: any;
    let admin: any, buyer: any, coop: any, agent: any, farmer: any, poAgent: any, vault: any, other: any;

    beforeEach(async function () {
        [, admin, buyer, coop, agent, farmer, poAgent, vault, other] = await ethers.getSigners();
        adminAddr  = admin.address;
        agentAddr  = agent.address;
        buyerAddr  = buyer.address;
        coopAddr   = coop.address;
        farmerAddr = farmer.address;
        otherAddr  = other.address;

        // Deploy FarmerRegistry
        const FR = await ethers.getContractFactory("FarmerRegistry");
        farmerRegistry = await upgrades.deployProxy(FR, [ethers.getAddress(admin.address)]);
        await farmerRegistry.connect(admin).setIndependentAggregator(ethers.getAddress(coopAddr));
        await farmerRegistry.connect(admin).grantRole(await farmerRegistry.AGENT_ROLE(), ethers.getAddress(agentAddr));
        await farmerRegistry.connect(agent).registerFarmer(
            ethers.getAddress(farmerAddr), "MAAIF-PO", ethers.getAddress(coopAddr),
            ethers.encodeBytes32String("ipfs"), 250, true
        );

        // Deploy BatchToken
        const BT = await ethers.getContractFactory("BatchToken");
        batchToken = await upgrades.deployProxy(BT, [ethers.getAddress(admin.address), farmerRegistry.target, ""]);
        await batchToken.connect(admin).grantRole(await batchToken.AGENT_ROLE(), ethers.getAddress(agentAddr));

        // Mint a batch
        const tid = await batchToken.nextTokenId();
        await batchToken.connect(agent).mintBatch(
            "B-1",
            ethers.getAddress(coopAddr),
            ethers.getAddress(farmerAddr),
            100, "screen18", 85,
            ethers.encodeBytes32String("h1"),
            ethers.encodeBytes32String("w1")
        );

        // Deploy TraceLog
        const TL = await ethers.getContractFactory("TraceLog");
        traceLog = await upgrades.deployProxy(TL, [ethers.getAddress(admin.address), batchToken.target]);
        await traceLog.connect(admin).grantRole(await traceLog.AGENT_ROLE(), ethers.getAddress(agentAddr));
        await traceLog.connect(admin).grantRole(await traceLog.COOP_ROLE(), ethers.getAddress(coopAddr));

        // Deploy PurchaseOrder
        const PO = await ethers.getContractFactory("PurchaseOrder");
        po = await upgrades.deployProxy(PO, [ethers.getAddress(admin.address), batchToken.target, traceLog.target]);

        // Grant roles
        await po.connect(admin).grantRole(await po.BUYER_ROLE(), ethers.getAddress(buyerAddr));
        await po.connect(admin).grantRole(await po.COOP_ROLE(), ethers.getAddress(coopAddr));
        await traceLog.connect(admin).grantRole(await traceLog.PURCHASE_ORDER_ROLE(), po.target);

        // Walk TraceLog to WAREHOUSED (3) so PO can be confirmed to COMMITTED (4)
        await traceLog.connect(agent).updateStage(tid, 0);
        await traceLog.connect(coop).updateStage(tid, 1);
        await traceLog.connect(coop).updateStage(tid, 2);
        await traceLog.connect(coop).updateStage(tid, 3);
    });

    async function getId(): Promise<bigint> {
        return await po.nextOrderId();
    }

    describe("Deployment", function () {
        it("sets admin", async () => {
            const role = await po.DEFAULT_ADMIN_ROLE();
            expect(await po.hasRole(role, ethers.getAddress(admin.address))).to.be.true;
        });
        it("sets nextOrderId to 1", async () => {
            expect(await po.nextOrderId()).to.equal(1n);
        });
        it("stores batchToken and traceLog addresses", async () => {
            expect(await po.batchToken()).to.equal(batchToken.target);
            expect(await po.traceLog()).to.equal(traceLog.target);
        });
    });

    describe("createPurchaseOrder", function () {
        it("creates a pending PO and emits event", async () => {
            const orderId = await getId();
            const tx = po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "Sucafina SA", 5000_000000n);
            await expect(tx).to.emit(po, "PurchaseOrderCreated").withArgs(orderId, 1n, ethers.getAddress(buyerAddr));
            expect(await po.nextOrderId()).to.equal(orderId + 1n);

            const order = await po.getOrder(orderId);
            expect(order.status).to.equal(0n);
            expect(order.batchTokenId).to.equal(1n);
            expect(order.buyerWallet).to.equal(ethers.getAddress(buyerAddr));
            expect(order.buyerOrganisation).to.equal("Sucafina SA");
            expect(order.agreedPriceUsdc).to.equal(5000_000000n);
            expect(order.createdTimestamp).to.be.gt(0);
            expect(order.confirmedTimestamp).to.equal(0n);
        });

        it("increments nextOrderId across multiple POs", async () => {
            const tid2 = await batchToken.nextTokenId();
            await batchToken.connect(agent).mintBatch(
                "B-2",
                ethers.getAddress(coopAddr),
                ethers.getAddress(farmerAddr), 100, "screen18", 85,
                ethers.encodeBytes32String("h2"),
                ethers.encodeBytes32String("w2")
            );
            await traceLog.connect(agent).updateStage(tid2, 0);
            await traceLog.connect(coop).updateStage(tid2, 1);
            await traceLog.connect(coop).updateStage(tid2, 2);
            await traceLog.connect(coop).updateStage(tid2, 3);

            const id1 = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);
            const id2 = await getId();
            await po.connect(buyer).createPurchaseOrder(tid2, ethers.getAddress(buyerAddr), "B", 2000_000000n);

            expect(id2).to.equal(id1 + 1n);
            expect(await po.nextOrderId()).to.equal(id2 + 1n);
        });

        it("blocks active order on same batch", async () => {
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);
            await expect(po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "B", 2000_000000n))
                .to.be.revertedWith("PurchaseOrder: batch already has an active order");
        });

        it("reverts if price is zero", async () => {
            await expect(po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 0))
                .to.be.revertedWith("PurchaseOrder: price must be greater than zero");
        });

        it("reverts if buyerWallet is zero", async () => {
            await expect(po.connect(buyer).createPurchaseOrder(1n, "0x0000000000000000000000000000000000000000", "A", 1000_000000n))
                .to.be.revertedWith("PurchaseOrder: zero buyer wallet");
        });

        it("reverts if buyerOrganisation is empty", async () => {
            await expect(po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "", 1000_000000n))
                .to.be.revertedWith("PurchaseOrder: empty buyer organisation");
        });

        it("reverts if batch does not exist", async () => {
            await expect(po.connect(buyer).createPurchaseOrder(999_000n, ethers.getAddress(buyerAddr), "A", 1000_000000n))
                .to.be.revertedWith("BatchToken: Token does not exist");
        });

        it("reverts if caller lacks BUYER_ROLE", async () => {
            await expect(po.connect(other).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n))
                .to.be.reverted;
        });
    });

    describe("confirmPurchaseOrder", function () {
        it("confirms a pending PO and advances TraceLog to COMMITTED", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "Sucafina SA", 5000_000000n);
            await expect(po.connect(coop).confirmPurchaseOrder(orderId))
                .to.emit(po, "PurchaseOrderConfirmed");

            const order = await po.getOrder(orderId);
            expect(order.status).to.equal(1n);
            expect(order.confirmedTimestamp).to.be.gt(0);
            expect(await traceLog.stages(1n)).to.equal(4);
        });

        it("allows new PO on same batch after confirmation", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);
            await po.connect(coop).confirmPurchaseOrder(orderId);

            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "B", 2000_000000n);
            const newId = orderId + 1n;
            expect((await po.getOrder(newId)).status).to.equal(0);
        });

        it("reverts if order is not PENDING", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);
            await po.connect(coop).confirmPurchaseOrder(orderId);
            await expect(po.connect(coop).confirmPurchaseOrder(orderId))
                .to.be.revertedWith("PurchaseOrder: order is not pending");
        });

        it("reverts on cancelled order", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);
            await po.connect(buyer).cancelPurchaseOrder(orderId);
            await expect(po.connect(coop).confirmPurchaseOrder(orderId))
                .to.be.revertedWith("PurchaseOrder: order is not pending");
        });

        it("reverts if caller lacks COOP_ROLE", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);
            await expect(po.connect(other).confirmPurchaseOrder(orderId)).to.be.reverted;
        });
    });

    describe("cancelPurchaseOrder", function () {
        it("cancels a pending PO as BUYER_ROLE and clears active order", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);
            await expect(po.connect(buyer).cancelPurchaseOrder(orderId))
                .to.emit(po, "PurchaseOrderCancelled");

            expect((await po.getOrder(orderId)).status).to.equal(2);
            expect(await po.batchToActiveOrder(1n)).to.equal(0n);
        });

        it("cancels a pending PO as COOP_ROLE", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);
            await expect(po.connect(coop).cancelPurchaseOrder(orderId))
                .to.emit(po, "PurchaseOrderCancelled");
        });

        it("allows new PO after cancellation", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);
            await po.connect(buyer).cancelPurchaseOrder(orderId);

            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "B", 2000_000000n);
            expect((await po.getOrder(orderId + 1n)).status).to.equal(0);
        });

        it("reverts if order is not PENDING", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);
            await po.connect(coop).confirmPurchaseOrder(orderId);
            await expect(po.connect(buyer).cancelPurchaseOrder(orderId))
                .to.be.revertedWith("PurchaseOrder: only pending orders can be cancelled");
        });

        it("reverts after 48-hour cancellation window", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);

            await ethers.provider.send("evm_increaseTime", [48 * 3600 + 1]);
            await ethers.provider.send("evm_mine");

            await expect(po.connect(buyer).cancelPurchaseOrder(orderId))
                .to.be.revertedWith("PurchaseOrder: cancellation window has expired");
        });

        it("reverts if caller lacks both BUYER_ROLE and COOP_ROLE", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);
            await expect(po.connect(other).cancelPurchaseOrder(orderId)).to.be.reverted;
        });
    });

    describe("getOrder", function () {
        it("returns zero struct for nonexistent order", async () => {
            const order = await po.getOrder(999_000n);
            expect(order.orderId).to.equal(0n);
            expect(order.status).to.equal(0n);
        });

        it("returns full order data for existing order", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "Sucafina SA", 5000_000000n);

            const order = await po.getOrder(orderId);
            expect(order.orderId).to.equal(orderId);
            expect(order.batchTokenId).to.equal(1n);
            expect(order.buyerWallet).to.equal(ethers.getAddress(buyerAddr));
            expect(order.buyerOrganisation).to.equal("Sucafina SA");
            expect(order.agreedPriceUsdc).to.equal(5000_000000n);
        });
    });

    describe("upgradeability", function () {
        it("admin can upgrade", async () => {
            const PO2 = await ethers.getContractFactory("PurchaseOrder");
            const upgraded = await upgrades.upgradeProxy(po.target, PO2.connect(admin));
            expect(upgraded.target).to.equal(po.target);
        });

        it("non-admin reverts", async () => {
            const PO2 = await ethers.getContractFactory("PurchaseOrder");
            await expect(upgrades.upgradeProxy(po.target, PO2.connect(other))).to.be.reverted;
        });

        it("data persists across upgrade", async () => {
            const orderId = await getId();
            await po.connect(buyer).createPurchaseOrder(1n, ethers.getAddress(buyerAddr), "A", 1000_000000n);
            expect((await po.getOrder(orderId)).status).to.equal(0);

            const PO2 = await ethers.getContractFactory("PurchaseOrder");
            await upgrades.upgradeProxy(po.target, PO2.connect(admin));

            const order = await po.getOrder(orderId);
            expect(order.status).to.equal(0n);
            expect(order.buyerOrganisation).to.equal("A");

            await po.connect(coop).confirmPurchaseOrder(orderId);
            expect((await po.getOrder(orderId)).status).to.equal(1);
        });
    });
});