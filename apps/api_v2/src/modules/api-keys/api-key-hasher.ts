import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt";
const SALT_BYTES = 16;
const KEY_BYTES = 32;

export function generateCredentialSecret(kind: "SECRET" | "AGENT") {
  const prefix = `${kind === "AGENT" ? "tag" : "tsk"}_live_${randomBytes(4).toString("hex")}`;
  const token = randomBytes(24).toString("base64url");

  return {
    secret: `${prefix}.${token}`,
    keyPrefix: prefix,
    lastFour: token.slice(-4),
  };
}

export function extractCredentialPrefix(secret: string): string | null {
  const trimmed = secret.trim();
  const dotIndex = trimmed.indexOf(".");
  if (dotIndex <= 0) return null;

  const prefix = trimmed.slice(0, dotIndex);
  return /^[a-z]{3}_live_[a-f0-9]{8}$/.test(prefix) ? prefix : null;
}

export function looksLikeTrestaCredential(secret: string): boolean {
  return extractCredentialPrefix(secret) !== null;
}

export function hashCredentialSecret(secret: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(secret, salt, KEY_BYTES);
  return `${HASH_PREFIX}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyCredentialSecret(
  secret: string,
  storedHash: string,
): boolean {
  const [prefix, saltHex, expectedHex] = storedHash.split(":");
  if (prefix !== HASH_PREFIX || !saltHex || !expectedHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) {
    return false;
  }

  const actual = scryptSync(secret, salt, KEY_BYTES);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
