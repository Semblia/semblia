import { InternalServerErrorException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  decryptSecret,
  encryptSecret,
} from "../../common/crypto/secret-cipher.js";
import { SubmissionPrivateMetadataService } from "./submission-private-metadata.service.js";

const encryptionKey = Buffer.from("0123456789abcdef0123456789abcdef");
const encryptionKeyBase64 = encryptionKey.toString("base64");

const mockConfigGet = vi.fn();
const mockPrivateMetadataCreate = vi.fn();

const configServiceMock = {
  get: mockConfigGet,
} as unknown as ConfigService;

const prismaWriterMock = {
  submissionPrivateMetadata: {
    create: mockPrivateMetadataCreate,
  },
};

describe("SubmissionPrivateMetadataService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigGet.mockReturnValue(encryptionKeyBase64);
    mockPrivateMetadataCreate.mockResolvedValue({ id: "metadata_1" });
  });

  it("encrypts raw PII and stores normalized hashes for public submissions", async () => {
    const service = new SubmissionPrivateMetadataService(configServiceMock);

    await service.createForPublicSubmit(prismaWriterMock, {
      submissionId: "submission_1",
      authorEmail: "  Ava@Example.com  ",
      ipAddress: "203.0.113.10",
      userAgent: "Vitest",
      consentSnapshot: { isOAuthVerified: true, oauthProvider: "google" },
    });

    const created = mockPrivateMetadataCreate.mock.calls[0]![0].data;
    expect(created).toMatchObject({
      submissionId: "submission_1",
      authorEmailHash: sha256("ava@example.com"),
      ipAddressHash: sha256("203.0.113.10"),
      userAgentHash: sha256("Vitest"),
      consentSnapshot: { isOAuthVerified: true, oauthProvider: "google" },
    });
    expect(decryptSecret(created.authorEmailEncrypted, encryptionKey)).toBe(
      "Ava@Example.com",
    );
    expect(decryptSecret(created.ipAddressEncrypted, encryptionKey)).toBe(
      "203.0.113.10",
    );
    expect(decryptSecret(created.userAgentEncrypted, encryptionKey)).toBe(
      "Vitest",
    );
  });

  it("does not create an empty metadata row when no private data is present", async () => {
    const service = new SubmissionPrivateMetadataService(configServiceMock);

    await expect(
      service.createForPublicSubmit(prismaWriterMock, {
        submissionId: "submission_1",
      }),
    ).resolves.toBeNull();
    expect(mockPrivateMetadataCreate).not.toHaveBeenCalled();
  });

  it("requires the configured encryption key before writing private metadata", async () => {
    mockConfigGet.mockReturnValue(undefined);
    const service = new SubmissionPrivateMetadataService(configServiceMock);

    await expect(
      service.createForPublicSubmit(prismaWriterMock, {
        submissionId: "submission_1",
        authorEmail: "ava@example.com",
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it("decrypts stored author emails for authenticated compatibility shims", () => {
    const service = new SubmissionPrivateMetadataService(configServiceMock);

    const encrypted = encryptSecret("ava@example.com", encryptionKey);

    expect(
      service.decryptAuthorEmail({ authorEmailEncrypted: encrypted }),
    ).toBe("ava@example.com");
    expect(service.decryptAuthorEmail(null)).toBeNull();
  });
});

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
