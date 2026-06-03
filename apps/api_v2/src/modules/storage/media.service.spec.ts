import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  MediaAssetPurpose,
  MediaAssetStatus,
  MediaAssetVisibility,
} from "@workspace/database/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConfigService } from "@nestjs/config";
import type { ProjectAccessService } from "../../common/authz/project-access.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { PublicSubmitTrustService } from "../responses/public-submit-trust.service.js";
import {
  publicCreateUploadIntentBodySchema,
  createUploadIntentBodySchema,
} from "./media.dto.js";
import { MediaService } from "./media.service.js";
import type { S3Service } from "./s3.service.js";
import type { StorageService } from "./storage.service.js";

const mockAllowedContentTypes = vi.fn();

const storageMock = {
  allowedContentTypes: mockAllowedContentTypes,
} as unknown as StorageService;

const service = new MediaService(
  {} as PrismaService,
  storageMock,
  {} as S3Service,
  {} as ConfigService,
  {} as ProjectAccessService,
  {} as PublicSubmitTrustService,
);

function makeAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset_1",
    projectId: "project_1",
    formId: null,
    submissionId: null,
    purpose: MediaAssetPurpose.SUBMISSION_ATTACHMENT,
    status: MediaAssetStatus.ACTIVE,
    visibility: MediaAssetVisibility.PRIVATE,
    contentType: "image/png",
    byteSize: 120_000,
    createdByActorType: "public",
    createdByActorId: "project:project_1",
    createdAt: new Date("2026-06-01T12:00:00.000Z"),
    ...overrides,
  };
}

describe("MediaService submission attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAllowedContentTypes.mockReturnValue([
      "image/png",
      "audio/mpeg",
      "video/mp4",
    ]);
  });

  it("allows public and authenticated upload intents for submission attachments", () => {
    expect(
      publicCreateUploadIntentBodySchema.parse({
        purpose: "SUBMISSION_ATTACHMENT",
        contentType: "image/png",
        byteSize: 120_000,
      }),
    ).toMatchObject({ purpose: "SUBMISSION_ATTACHMENT" });

    expect(
      createUploadIntentBodySchema.parse({
        purpose: "SUBMISSION_ATTACHMENT",
        projectSlug: "acme",
        formId: "form_1",
        contentType: "image/png",
        byteSize: 120_000,
      }),
    ).toMatchObject({ purpose: "SUBMISSION_ATTACHMENT" });
  });

  it("attaches active private submission assets to the canonical submission", async () => {
    const tx = {
      mediaAsset: {
        findMany: vi.fn().mockResolvedValue([makeAsset()]),
        count: vi.fn().mockResolvedValue(2),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await service.attachPublicSubmissionAssets({
      tx: tx as never,
      assetIds: ["asset_1"],
      projectId: "project_1",
      formId: "form_1",
      submissionId: "submission_1",
      principal: "project:project_1",
      limits: {
        imagesPerMonth: 10,
        maxMediaAssetsPerSubmission: 1,
        maxImageBytes: 4_000_000,
      },
    });

    expect(tx.mediaAsset.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "project_1",
          purpose: MediaAssetPurpose.SUBMISSION_ATTACHMENT,
          submissionId: { not: null },
        }),
      }),
    );
    expect(tx.mediaAsset.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["asset_1"] } },
      data: { formId: "form_1", submissionId: "submission_1" },
    });
  });

  it("rejects duplicate or over-limit submission media assets before attachment", async () => {
    const tx = {
      mediaAsset: {
        findMany: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    await expect(
      service.attachPublicSubmissionAssets({
        tx: tx as never,
        assetIds: ["asset_1", "asset_1"],
        projectId: "project_1",
        formId: "form_1",
        submissionId: "submission_1",
        principal: "project:project_1",
        limits: {
          imagesPerMonth: 10,
          maxMediaAssetsPerSubmission: 2,
          maxImageBytes: 4_000_000,
        },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(tx.mediaAsset.findMany).not.toHaveBeenCalled();
  });

  it("rejects assets that are not active private owned submission media", async () => {
    const tx = {
      mediaAsset: {
        findMany: vi.fn().mockResolvedValue([
          makeAsset({
            status: MediaAssetStatus.PENDING,
          }),
        ]),
        count: vi.fn().mockResolvedValue(0),
        updateMany: vi.fn(),
      },
    };

    await expect(
      service.attachPublicSubmissionAssets({
        tx: tx as never,
        assetIds: ["asset_1"],
        projectId: "project_1",
        formId: "form_1",
        submissionId: "submission_1",
        principal: "project:project_1",
        limits: {
          imagesPerMonth: 10,
          maxMediaAssetsPerSubmission: 1,
          maxImageBytes: 4_000_000,
        },
      }),
    ).rejects.toThrow(ConflictException);
    expect(tx.mediaAsset.updateMany).not.toHaveBeenCalled();
  });
});
