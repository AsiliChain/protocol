import { getAddress } from "viem";

function envAddress(key: string): `0x${string}` {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return getAddress(val);
}

export const addresses = {
  farmerRegistry: envAddress("CONTRACT_FARMER_REGISTRY"),
  creditScore: envAddress("CONTRACT_CREDIT_SCORE"),
  batchToken: envAddress("CONTRACT_BATCH_TOKEN"),
  traceLog: envAddress("CONTRACT_TRACE_LOG"),
  purchaseOrder: envAddress("CONTRACT_PURCHASE_ORDER"),
  protocolFee: envAddress("CONTRACT_PROTOCOL_FEE"),
  lendingVault: envAddress("CONTRACT_LENDING_VAULT"),
  identityRegistry: envAddress("CONTRACT_IDENTITY_REGISTRY"),
} as const;

// Minimal ABIs — only the functions the API calls.
// Generated from hardhat artifacts; keep in sync with deployed contracts.

export const batchTokenAbi = [
  {
    type: "function",
    name: "nextTokenId",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mintBatch",
    inputs: [
      { name: "batchId", type: "string", internalType: "string" },
      { name: "cooperativeWallet", type: "address", internalType: "address" },
      { name: "farmerWallet", type: "address", internalType: "address" },
      { name: "weightKg", type: "uint256", internalType: "uint256" },
      { name: "grade", type: "string", internalType: "string" },
      { name: "moisturePct", type: "uint256", internalType: "uint256" },
      { name: "collectionPointHash", type: "bytes32", internalType: "bytes32" },
      { name: "weightSlipIpfsCid", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "batchData",
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "batchId", type: "string", internalType: "string" },
      { name: "farmerWallet", type: "address", internalType: "address" },
      { name: "cooperativeWallet", type: "address", internalType: "address" },
      { name: "weightKg", type: "uint256", internalType: "uint256" },
      { name: "grade", type: "string", internalType: "string" },
      { name: "moisturePct", type: "uint256", internalType: "uint256" },
      { name: "mintTimestamp", type: "uint256", internalType: "uint256" },
      { name: "loanActive", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
] as const;

export const traceLogAbi = [
  {
    type: "function",
    name: "updateStage",
    inputs: [
      { name: "tokenId", type: "uint256", internalType: "uint256" },
      { name: "newStage", type: "uint8", internalType: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "stages",
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
    stateMutability: "view",
  },
] as const;

export const farmerRegistryAbi = [
  {
    type: "function",
    name: "isRegistered",
    inputs: [{ name: "farmerWallet", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registerFarmer",
    inputs: [
      { name: "farmerWallet", type: "address", internalType: "address" },
      { name: "maaifFarmerId", type: "string", internalType: "string" },
      { name: "cooperativeWallet", type: "address", internalType: "address" },
      { name: "farmBoundaryIpfsCid", type: "bytes32", internalType: "bytes32" },
      { name: "farmAreaHectares", type: "uint256", internalType: "uint256" },
      { name: "gfwDeforestationFree", type: "bool", internalType: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getFarmer",
    inputs: [{ name: "farmerWallet", type: "address", internalType: "address" }],
    outputs: [
      { name: "maaifFarmerId", type: "string", internalType: "string" },
      { name: "cooperativeWallet", type: "address", internalType: "address" },
      { name: "farmBoundaryIpfsCid", type: "bytes32", internalType: "bytes32" },
      { name: "farmAreaHectares", type: "uint256", internalType: "uint256" },
      { name: "gfwDeforestationFree", type: "bool", internalType: "bool" },
      { name: "active", type: "bool", internalType: "bool" },
      { name: "registrationTimestamp", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

export const purchaseOrderAbi = [
  {
    type: "function",
    name: "orders",
    inputs: [{ name: "orderId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "orderId", type: "uint256", internalType: "uint256" },
      { name: "batchTokenId", type: "uint256", internalType: "uint256" },
      { name: "buyerWallet", type: "address", internalType: "address" },
      { name: "buyerOrganisation", type: "string", internalType: "string" },
      { name: "agreedPriceUsdc", type: "uint256", internalType: "uint256" },
      { name: "createdTimestamp", type: "uint256", internalType: "uint256" },
      { name: "confirmedTimestamp", type: "uint256", internalType: "uint256" },
      { name: "status", type: "uint8", internalType: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "batchToActiveOrder",
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextOrderId",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const lendingVaultAbi = [
  {
    type: "function",
    name: "settle",
    inputs: [
      { name: "batchTokenId", type: "uint256", internalType: "uint256" },
      { name: "usdcAmount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getLoan",
    inputs: [{ name: "batchTokenId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "batchTokenId", type: "uint256", internalType: "uint256" },
      { name: "farmerWallet", type: "address", internalType: "address" },
      { name: "principalUsdc", type: "uint256", internalType: "uint256" },
      { name: "interestUsdc", type: "uint256", internalType: "uint256" },
      { name: "originatedAt", type: "uint256", internalType: "uint256" },
      { name: "expiresAt", type: "uint256", internalType: "uint256" },
      { name: "forbearanceExpiry", type: "uint256", internalType: "uint256" },
      { name: "status", type: "uint8", internalType: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getFarmerLoans",
    inputs: [{ name: "farmerWallet", type: "address", internalType: "address" }],
    outputs: [{ name: "batchTokenIds", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pricePerKgBase",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maxLtvBps",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

/** Minimal Pyth Oracle ABI for reading USDC/USD price. */
export const pythAbi = [
  {
    type: "function",
    name: "getPrice",
    inputs: [{ name: "id", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "price", type: "int64", internalType: "int64" },
      { name: "conf", type: "uint64", internalType: "uint64" },
      { name: "expo", type: "int32", internalType: "int32" },
      { name: "publishTime", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

/** Minimal ERC-8004 Identity Registry ABI for reading agent identity. */
export const identityRegistryAbi = [
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "agentId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const creditScoreAbi = [
  {
    type: "function",
    name: "getScore",
    inputs: [{ name: "farmerWallet", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLtvTier",
    inputs: [{ name: "farmerWallet", type: "address", internalType: "address" }],
    outputs: [
      { name: "maxLoanUsdc", type: "uint256", internalType: "uint256" },
      { name: "ltvBasisPoints", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;
