import { UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicSubmitTrustService } from "./public-submit-trust.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { SigningSecretService } from "../projects/signing-secret.service.js";

const mockProjectFindUnique = vi.fn();
const mockProjectTrustedOriginFindFirst = vi.fn();
const mockGetActiveDecrypted = vi.fn();
const mockMarkUsed = vi.fn();

const prismaMock = {
  client: {
    project: {
      findUnique: mockProjectFindUnique,
    },
    projectTrustedOrigin: {
      findFirst: mockProjectTrustedOriginFindFirst,
    },
  },
} as unknown as PrismaService;

const signingSecretServiceMock = {
  getActiveDecrypted: mockGetActiveDecrypted,
  markUsed: mockMarkUsed,
} as unknown as SigningSecretService;

describe("PublicSubmitTrustService normalized trust", () => {
  let service: PublicSubmitTrustService;

  beforeEach(() => {
    service = new PublicSubmitTrustService(
      prismaMock,
      signingSecretServiceMock,
    );
    vi.clearAllMocks();
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      allowedOrigins: [],
    });
  });

  it("accepts active trusted-origin records", async () => {
    mockProjectTrustedOriginFindFirst.mockResolvedValue({
      id: "origin_1",
      origin: "https://proof.example.com",
    });

    await expect(
      service.evaluate(
        {
          headers: { origin: "https://proof.example.com" },
          ip: "203.0.113.10",
        },
        "acme",
      ),
    ).resolves.toMatchObject({
      projectId: "project_1",
      trust: "origin",
      principal: "203.0.113.10",
      trustedOriginId: "origin_1",
    });

    expect(mockProjectTrustedOriginFindFirst).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        origin: "https://proof.example.com",
        status: "ACTIVE",
      },
      select: { id: true, origin: true },
    });
  });

  it("does not authorize disabled normalized origins", async () => {
    mockProjectTrustedOriginFindFirst.mockResolvedValue(null);

    await expect(
      service.evaluate(
        {
          headers: { origin: "https://disabled.example.com" },
          ip: "203.0.113.10",
        },
        "acme",
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
});
