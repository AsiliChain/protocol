const nonces = new Map<string, { nonce: string; expiresAt: number }>();
const emailCodes = new Map<string, { code: string; token: string; wallet: string; expiresAt: number }>();

export function getNonce(address: string) {
  return nonces.get(address.toLowerCase());
}

export function setNonce(address: string, nonce: string, expiresAt: number) {
  nonces.set(address.toLowerCase(), { nonce, expiresAt });
}

export function deleteNonce(address: string) {
  nonces.delete(address.toLowerCase());
}

export function cleanupExpiredNonces() {
  for (const [key, value] of nonces.entries()) {
    if (value.expiresAt < Date.now()) nonces.delete(key);
  }
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
