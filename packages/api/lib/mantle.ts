import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Chain,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mantle, mantleSepoliaTestnet } from "viem/chains";

const CHAIN_ID = Number(process.env.MANTLE_CHAIN_ID) || 5003;
const currentChain: Chain = CHAIN_ID === 5000 ? mantle : mantleSepoliaTestnet;

function rpcUrl() {
  return CHAIN_ID === 5000
    ? process.env.MANTLE_RPC_URL!
    : process.env.MANTLE_SEPOLIA_RPC_URL!;
}

let _publicClient: PublicClient | null = null;
let _walletClient: WalletClient<Transport, Chain, Account> | null = null;

export function getPublicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: currentChain,
      transport: http(rpcUrl()),
    });
  }
  return _publicClient;
}

export function getWalletClient() {
  if (!_walletClient) {
    const pk = process.env.API_PRIVATE_KEY;
    if (!pk) throw new Error("API_PRIVATE_KEY not set");
    _walletClient = createWalletClient({
      account: privateKeyToAccount(pk as `0x${string}`),
      chain: currentChain,
      transport: http(rpcUrl()),
    });
  }
  return _walletClient;
}
