import {
  createPublicClient,
  createWalletClient,
  fallback,
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

function primaryRpcUrl() {
  return CHAIN_ID === 5000
    ? process.env.MANTLE_RPC_URL!
    : process.env.MANTLE_SEPOLIA_RPC_URL!;
}

function sepoliaFallbackUrls(): string[] {
  return [
    "https://mantle-sepolia.drpc.org",
    "https://rpc.sepolia.mantle.xyz",
  ];
}

function rpcTransport() {
  const urls = CHAIN_ID === 5000
    ? [primaryRpcUrl()]
    : [primaryRpcUrl(), ...sepoliaFallbackUrls().filter((u) => u !== primaryRpcUrl())];

  const transports = urls
    .filter(Boolean)
    .map((url) =>
      http(url, {
        retryCount: 2,
        retryDelay: 200,
        timeout: 10000,
      }),
    );

  if (transports.length === 1) return transports[0];
  return fallback(transports, { rank: false, retryCount: 1 });
}

let _publicClient: PublicClient | null = null;
let _walletClient: WalletClient<Transport, Chain, Account> | null = null;

export function getPublicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: currentChain,
      transport: rpcTransport(),
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
      transport: rpcTransport(),
    });
  }
  return _walletClient;
}
