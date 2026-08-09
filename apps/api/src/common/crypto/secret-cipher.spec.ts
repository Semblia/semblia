import { describe, expect, it } from "vitest";
import {
  SecretCipherError,
  decryptSecret,
  encryptSecret,
} from "./secret-cipher.js";

const key = Buffer.alloc(32, 7);

describe("secret cipher", () => {
  it("roundtrips plaintext", () => {
    const encrypted = encryptSecret("super-secret", key);

    expect(decryptSecret(encrypted, key)).toBe("super-secret");
  });

  it("detects tampered ciphertext", () => {
    const encrypted = encryptSecret("super-secret", key);
    const parts = encrypted.split(".");
    parts[2] = Buffer.from("tampered").toString("base64");

    expect(() => decryptSecret(parts.join("."), key)).toThrow(
      SecretCipherError,
    );
  });

  it("detects tampered auth tag", () => {
    const encrypted = encryptSecret("super-secret", key);
    const parts = encrypted.split(".");
    parts[3] = Buffer.from("tampered-auth-tag").toString("base64");

    expect(() => decryptSecret(parts.join("."), key)).toThrow(
      SecretCipherError,
    );
  });

  it("rejects malformed input", () => {
    expect(() => decryptSecret("not-a-valid-secret", key)).toThrow(
      SecretCipherError,
    );
  });

  it("rejects unsupported versions", () => {
    const encrypted = encryptSecret("super-secret", key);
    const parts = encrypted.split(".");
    parts[0] = "v2";

    expect(() => decryptSecret(parts.join("."), key)).toThrow(
      /Unsupported secret payload version/,
    );
  });

  it("uses unique IVs for identical plaintext", () => {
    const first = encryptSecret("same-plaintext", key);
    const second = encryptSecret("same-plaintext", key);

    expect(first).not.toBe(second);
    expect(first.split(".")[1]).not.toBe(second.split(".")[1]);
  });
});
