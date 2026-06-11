const COOP_EMAIL_WALLETS: Record<string, string> = {};

const raw = process.env.COOP_EMAIL_WALLETS;
if (raw) {
  for (const pair of raw.split(",")) {
    const [email, wallet] = pair.trim().split(":");
    if (email && wallet) {
      COOP_EMAIL_WALLETS[email.toLowerCase()] = wallet;
    }
  }
}

export function getWalletForEmail(email: string): string | null {
  return COOP_EMAIL_WALLETS[email.toLowerCase()] ?? null;
}

export function getAllCoopEmails(): string[] {
  return Object.keys(COOP_EMAIL_WALLETS);
}
