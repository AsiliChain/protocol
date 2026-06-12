const DEFAULT_COOPERATIVE = "Protocol Hub";
const DEPLOYER = "0xB70f03dE20c9D4c90246c830F81D44f377A652C0" as const;

const COOPERATIVES: Record<string, `0x${string}`> = {
  "Protocol Hub": DEPLOYER,
  "Rwenzori Growers": DEPLOYER,
  "Mt. Elgon Cooperative": DEPLOYER,
  "Kagera Highlands": DEPLOYER,
  "Western Nile Farmers": DEPLOYER,
};

// Override from env var if set: "Name=0xAddr,Name2=0xAddr2"
if (process.env.COOPERATIVE_WALLETS) {
  process.env.COOPERATIVE_WALLETS.split(",").forEach((pair) => {
    const [name, addr] = pair.split("=");
    if (name && addr) COOPERATIVES[name.trim()] = addr.trim() as `0x${string}`;
  });
}

export function getCooperativeWallet(name: string): `0x${string}` | null {
  return COOPERATIVES[name] || null;
}

export function getDefaultCooperative(): string {
  return DEFAULT_COOPERATIVE;
}

export function listCooperatives(): { name: string; wallet: `0x${string}` }[] {
  return Object.entries(COOPERATIVES).map(([name, wallet]) => ({ name, wallet }));
}
