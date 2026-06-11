const emailCodes = new Map<string, { code: string; token: string; wallet: string; expiresAt: number }>();

export function cleanupExpiredNonces() {
  for (const [key, value] of emailCodes.entries()) {
    if (value.expiresAt < Date.now()) emailCodes.delete(key);
  }
}

export function setEmailCode(email: string, code: string, token: string, wallet: string, expiresAt: number) {
  emailCodes.set(email.toLowerCase(), { code, token, wallet, expiresAt });
}

export function getEmailCode(email: string) {
  return emailCodes.get(email.toLowerCase());
}

export function getTokenByToken(token: string) {
  for (const [email, data] of emailCodes.entries()) {
    if (data.token === token) return { email, ...data };
  }
  return null;
}

export function deleteEmailCode(email: string) {
  emailCodes.delete(email.toLowerCase());
}
