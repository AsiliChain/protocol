// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IBatchToken} from "./interfaces/IBatchToken.sol";
import {ITraceLog} from "./interfaces/ITraceLog.sol";

/**
 * @title PurchaseOrder
 * @author AsiliChain
 * @notice Records a buyer's committed purchase of a specific BatchToken.
 * @dev Confirming a PO advances TraceLog to COMMITTED. Event-driven,
 *      no LendingVault dependency. UUPS-upgradeable.
 */
contract PurchaseOrder is Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    // =====================================
    //                              Roles
    // =====================================

    bytes32 public constant BUYER_ROLE = keccak256("BUYER_ROLE");
    bytes32 public constant COOP_ROLE  = keccak256("COOP_ROLE");

    // =====================================
    //                              Types
    // =====================================

    enum POStatus { PENDING, CONFIRMED, CANCELLED }

    struct PurchaseOrder {
        uint256  orderId;
        uint256  batchTokenId;
        address  buyerWallet;
        string   buyerOrganisation;
        uint256  agreedPriceUsdc;
        uint256  createdTimestamp;
        uint256  confirmedTimestamp;
        POStatus status;
    }

    // =====================================
    //                            Storage
    // =====================================

    /// @notice Monotonically increasing order counter. Starts at 1.
    uint256 public nextOrderId;

    /// @notice Maps an order ID to its order data.
    mapping(uint256 => PurchaseOrder) public orders;

    /// @notice Maps a batch token ID to its currently active (PENDING) order.
    /// @dev 0 means no active PO on that batch. Used as sentinel.
    mapping(uint256 => uint256) public batchToActiveOrder;

    /// @notice The BatchToken contract — minted batches are the subject of POs.
    IBatchToken public batchToken;

    /// @notice The TraceLog contract — PO confirmation advances stages.
    ITraceLog public traceLog;

    // =====================================
    //                            Events
    // =====================================

    event PurchaseOrderCreated(
        uint256 indexed orderId,
        uint256 indexed batchTokenId,
        address indexed buyerWallet
    );

    event PurchaseOrderConfirmed(
        uint256 indexed orderId,
        uint256 indexed batchTokenId,
        address indexed buyerWallet
    );

    event PurchaseOrderCancelled(
        uint256 indexed orderId,
        uint256 indexed batchTokenId,
        address indexed cancelledBy
    );

    // =====================================
    //                     Initialization & Upgrade
    // =====================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the PurchaseOrder contract.
     * @param defaultAdmin       Address to receive DEFAULT_ADMIN_ROLE.
     * @param batchTokenAddress  Address of the deployed BatchToken contract.
     * @param traceLogAddress    Address of the deployed TraceLog contract.
     */
    function initialize(
        address defaultAdmin,
        address batchTokenAddress,
        address traceLogAddress
    ) public initializer {
        require(defaultAdmin != address(0), "PurchaseOrder: zero admin");
        require(batchTokenAddress != address(0), "PurchaseOrder: zero batchToken");
        require(traceLogAddress != address(0), "PurchaseOrder: zero traceLog");

        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);

        batchToken = IBatchToken(batchTokenAddress);
        traceLog   = ITraceLog(traceLogAddress);
        nextOrderId = 1;
    }

    /**
     * @dev Authorizes an upgrade. Restricted to DEFAULT_ADMIN_ROLE per Invariant #6.
     * @param newImplementation Address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // =====================================
    //                      Public Functions
    // =====================================

    /**
     * @notice Creates a new pending PurchaseOrder for a batch.
     * @dev Guards: price > 0, batch exists, batch not locked, no existing active order.
     * @param batchTokenId      The ID of the batch token to purchase.
     * @param buyerWallet       The wallet address of the buyer.
     * @param buyerOrganisation The buyer's organisation name (e.g. "Sucafina SA").
     * @param agreedPriceUsdc   The total agreed price in USDC.
     * @return orderId The newly created order ID.
     */
    function createPurchaseOrder(
        uint256 batchTokenId,
        address buyerWallet,
        string calldata buyerOrganisation,
        uint256 agreedPriceUsdc
    ) external onlyRole(BUYER_ROLE) returns (uint256 orderId) {
        require(buyerWallet != address(0), "PurchaseOrder: zero buyer wallet");
        require(bytes(buyerOrganisation).length > 0, "PurchaseOrder: empty buyer organisation");
        require(agreedPriceUsdc > 0, "PurchaseOrder: price must be greater than zero");
        batchToken.checkExists(batchTokenId);
        require(!batchToken.hasActiveLoan(batchTokenId), "PurchaseOrder: batch is locked as collateral");
        require(batchToActiveOrder[batchTokenId] == 0, "PurchaseOrder: batch already has an active order");

        orderId = nextOrderId;
        nextOrderId = orderId + 1;

        orders[orderId] = PurchaseOrder({
            orderId:           orderId,
            batchTokenId:      batchTokenId,
            buyerWallet:       buyerWallet,
            buyerOrganisation: buyerOrganisation,
            agreedPriceUsdc:   agreedPriceUsdc,
            createdTimestamp:  block.timestamp,
            confirmedTimestamp: 0,
            status:            POStatus.PENDING
        });

        batchToActiveOrder[batchTokenId] = orderId;

        emit PurchaseOrderCreated(orderId, batchTokenId, buyerWallet);
    }

    /**
     * @notice Confirms a pending PurchaseOrder.
     * @dev Advances TraceLog to COMMITTED (4). Callable by COOP_ROLE.
     * @param orderId The ID of the order to confirm.
     */
    function confirmPurchaseOrder(uint256 orderId) external onlyRole(COOP_ROLE) {
        PurchaseOrder storage po = orders[orderId];
        require(po.status == POStatus.PENDING, "PurchaseOrder: order is not pending");

        po.status = POStatus.CONFIRMED;
        po.confirmedTimestamp = block.timestamp;

        delete batchToActiveOrder[po.batchTokenId];

        // 4 = Stage.COMMITTED — see TraceLog.sol Stage enum
        traceLog.updateStage(po.batchTokenId, 4);

        emit PurchaseOrderConfirmed(orderId, po.batchTokenId, po.buyerWallet);
    }

    /**
     * @notice Cancels a pending PurchaseOrder.
     * @dev Callable by BUYER_ROLE or COOP_ROLE within 48 hours of creation.
     * @param orderId The ID of the order to cancel.
     */
    function cancelPurchaseOrder(uint256 orderId) external {
        require(
            hasRole(BUYER_ROLE, msg.sender) || hasRole(COOP_ROLE, msg.sender),
            "PurchaseOrder: caller does not have BUYER_ROLE or COOP_ROLE"
        );

        PurchaseOrder storage po = orders[orderId];
        require(po.status == POStatus.PENDING, "PurchaseOrder: only pending orders can be cancelled");
        require(
            block.timestamp <= po.createdTimestamp + 48 hours,
            "PurchaseOrder: cancellation window has expired"
        );

        po.status = POStatus.CANCELLED;
        delete batchToActiveOrder[po.batchTokenId];

        emit PurchaseOrderCancelled(orderId, po.batchTokenId, msg.sender);
    }

    /**
     * @notice Returns the PurchaseOrder data for a given order ID.
     * @dev Returns zero struct if orderId doesn't exist. Callers check status.
     * @param orderId The ID of the order to retrieve.
     * @return The PurchaseOrder struct.
     */
    function getOrder(uint256 orderId) external view returns (PurchaseOrder memory) {
        return orders[orderId];
    }

    // =====================================
    //                       Boilerplate
    // =====================================

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}