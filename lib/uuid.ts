import * as Crypto from 'expo-crypto';

export function uuid(): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (webCrypto?.randomUUID) return webCrypto.randomUUID();
  return Crypto.randomUUID();
}
