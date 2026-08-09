import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const SECRET_CIPHER_VERSION = "v1";
const SECRET_CIPHER_ALGORITHM = "aes-256-gcm";
const SECRET_CIPHER_IV_LENGTH = 12;

export class SecretCipherError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SecretCipherError";
  }
}

export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(SECRET_CIPHER_IV_LENGTH);
  const cipher = createCipheriv(SECRET_CIPHER_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    SECRET_CIPHER_VERSION,
    iv.toString("base64"),
    ciphertext.toString("base64"),
    authTag.toString("base64"),
  ].join(".");
}

export function decryptSecret(packed: string, key: Buffer): string {
  const parts = packed.split(".");
  if (parts.length !== 4) {
    throw new SecretCipherError("Malformed cipher payload");
  }

  const [version, ivBase64, ciphertextBase64, authTagBase64] = parts;
  if (version !== SECRET_CIPHER_VERSION) {
    throw new SecretCipherError("Unsupported secret payload version");
  }

  if (!ivBase64 || !ciphertextBase64 || !authTagBase64) {
    throw new SecretCipherError("Malformed cipher payload - missing component");
  }

  const iv = decodeBase64Part(ivBase64, "Malformed IV");
  if (iv.length !== SECRET_CIPHER_IV_LENGTH) {
    throw new SecretCipherError("Malformed IV");
  }

  const ciphertext = decodeBase64Part(ciphertextBase64, "Malformed ciphertext");
  const authTag = decodeBase64Part(authTagBase64, "Malformed auth tag");

  try {
    const decipher = createDecipheriv(SECRET_CIPHER_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch (cause) {
    throw new SecretCipherError("Secret payload could not be decrypted", {
      cause,
    });
  }
}

function decodeBase64Part(value: string, message: string): Buffer {
  try {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length === 0 && value.length > 0) {
      throw new SecretCipherError(message);
    }

    if (decoded.toString("base64") !== value) {
      throw new SecretCipherError(message);
    }

    return decoded;
  } catch (error) {
    if (error instanceof SecretCipherError) throw error;
    throw new SecretCipherError(message, { cause: error });
  }
}
