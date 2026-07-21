import { ForbiddenException } from "@nestjs/common";
import {
  MediaAssetPurpose,
  MediaAssetStatus,
  MediaAssetVisibility,
} from "@workspace/database/prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { Capability } from "../../common/authz/capabilities.js";
import { MediaService } from "./media.service.js";
import { StorageService } from "./storage.service.js";

const userActor: ActorContext = {
  actorType: "user",
  userId: "user_1",
  clerkOrgPermissions: [],
  scopes: [],
};

const apiKeyActor: ActorContext = {
  actorType: "api_key",
  userId: "user_1",
  projectId: "project_1",
  credentialId: "key_1",
  clerkOrgPermissions: [],
  scopes: [],
};

describe("MediaService", () => {
  const mediaAssetCreate = vi.fn();
  const mediaAssetUpdate = vi.fn();
  const mediaAssetUpdateMany = vi.fn();
  const mediaAssetFindUnique = vi.fn();
  const projectAccessResolveBySlug = vi.fn();
  const s3PresignPut = vi.fn();
  const s3HeadObject = vi.fn();
  const s3DeleteObject = vi.fn();

  function createService() {
    const configService = {
      get: vi.fn((name: string) => {
        if (name === "S3_PRESIGN_PUT_TTL_SECONDS") return 60;
        if (name === "S3_PUBLIC_CDN_BASE_URL") return "https://cdn.semblia.test";
        return undefined;
      }),
    };
    const storage = new StorageService(configService as never);
    return new MediaService(
      {
        client: {
          mediaAsset: {
            create: mediaAssetCreate,
            update: mediaAssetUpdate,
            updateMany: mediaAssetUpdateMany,
            findUnique: mediaAssetFindUnique,
          },
        },
      } as never,
      storage,
      {
        bucketName: "uploads",
        presignPut: s3PresignPut,
        headObject: s3HeadObject,
        deleteObject: s3DeleteObject,
      } as never,
      configService as never,
      { resolveBySlug: projectAccessResolveBySlug } as never,
    );
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00.000Z"));
    vi.clearAllMocks();
    projectAccessResolveBySlug.mockResolvedValue({
      project: { id: "project_1" },
      capabilities: new Set([Capability.MANAGE_PROJECT]),
    });
    mediaAssetCreate.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "asset_1",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedAt: null,
      }),
    );
    mediaAssetUpdate.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "asset_1",
        bucket: "uploads",
        storageKey: data.storageKey ?? "public/projects/project_1/logos/asset_1.png",
        contentType: "image/png",
        byteSize: 1234,
        purpose: MediaAssetPurpose.PROJECT_LOGO,
        visibility: MediaAssetVisibility.PUBLIC,
        status: data.status ?? MediaAssetStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedAt: data.confirmedAt ?? null,
        ...data,
      }),
    );
    mediaAssetUpdateMany.mockResolvedValue({ count: 1 });
    s3PresignPut.mockResolvedValue("https://s3.semblia.test/upload");
    s3HeadObject.mockResolvedValue({ ContentLength: 1234 });
    s3DeleteObject.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses private project-scoped storage for import source assets", () => {
    const storage = new StorageService({ get: vi.fn() } as never);

    expect(
      storage.keyFor({
        assetId: "asset_1",
        purpose: MediaAssetPurpose.IMPORT_SOURCE,
        visibility: storage.visibilityFor(MediaAssetPurpose.IMPORT_SOURCE),
        contentType: "text/csv",
        projectId: "project_1",
      }),
    ).toBe("private/projects/project_1/imports/asset_1.csv");
    expect(storage.visibilityFor(MediaAssetPurpose.IMPORT_SOURCE)).toBe(
      MediaAssetVisibility.PRIVATE,
    );
  });

  it("creates project-scoped upload intents only for actors with project management access", async () => {
    const service = createService();

    await expect(
      service.createUploadIntent(userActor, {
        purpose: "PROJECT_LOGO",
        projectSlug: "acme",
        contentType: "image/png",
        byteSize: 1234,
      }),
    ).resolves.toEqual({
      assetId: "asset_1",
      uploadUrl: "https://s3.semblia.test/upload",
      storageKey: "public/projects/project_1/logos/asset_1.png",
      expiresAt: "2026-06-30T12:01:00.000Z",
      requiredHeaders: { "Content-Type": "image/png" },
    });

    expect(projectAccessResolveBySlug).toHaveBeenCalledWith(userActor, "acme");
    expect(mediaAssetCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bucket: "uploads",
        purpose: MediaAssetPurpose.PROJECT_LOGO,
        visibility: MediaAssetVisibility.PUBLIC,
        projectId: "project_1",
        createdByActorType: "user",
        createdByActorId: "user_1",
      }),
    });
    expect(s3PresignPut).toHaveBeenCalledWith(
      "public/projects/project_1/logos/asset_1.png",
      "image/png",
      1234,
      60,
    );
  });

  it("rejects internal export artifacts and project writes without management capability", async () => {
    const service = createService();

    await expect(
      service.createUploadIntent(userActor, {
        purpose: "EXPORT_ARTIFACT",
        projectSlug: "acme",
        contentType: "text/csv",
        byteSize: 512,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    projectAccessResolveBySlug.mockResolvedValueOnce({
      project: { id: "project_1" },
      capabilities: new Set([Capability.VIEW_PROJECT]),
    });

    await expect(
      service.createUploadIntent(userActor, {
        purpose: "PROJECT_LOGO",
        projectSlug: "acme",
        contentType: "image/png",
        byteSize: 1234,
      }),
    ).rejects.toThrow(`Missing capability: ${Capability.MANAGE_PROJECT}`);
  });

  it("requires a user actor for account-default logo intents", async () => {
    const service = createService();

    await expect(
      service.createUploadIntent(apiKeyActor, {
        purpose: "ACCOUNT_DEFAULTS_LOGO",
        contentType: "image/png",
        byteSize: 1234,
      }),
    ).rejects.toThrow("Account defaults require a user actor");
  });

  it("activates public submit assets only when every pending asset matches the submit principal", async () => {
    const service = createService();
    const tx = {
      mediaAsset: {
        updateMany: mediaAssetUpdateMany,
      },
    };

    await expect(
      service.activatePublicSubmitAssets({
        tx: tx as never,
        projectId: "project_1",
        formId: "form_1",
        responseId: "response_1",
        principal: "198.51.100.10",
        assetIds: ["asset_1", "asset_1", "asset_2"],
      }),
    ).rejects.toThrow("Invalid submission media asset");

    expect(mediaAssetUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["asset_1", "asset_2"] },
        projectId: "project_1",
        purpose: MediaAssetPurpose.SUBMISSION_ATTACHMENT,
        status: { in: [MediaAssetStatus.PENDING, MediaAssetStatus.ACTIVE] },
        createdByActorType: "public",
        createdByActorId: "198.51.100.10",
      },
      data: {
        formId: "form_1",
        responseId: "response_1",
        status: MediaAssetStatus.ACTIVE,
        confirmedAt: new Date("2026-06-30T12:00:00.000Z"),
      },
    });
  });

  it("prevents actors from deleting media assets they did not create", async () => {
    const service = createService();
    mediaAssetFindUnique.mockResolvedValue({
      id: "asset_1",
      storageKey: "public/projects/project_1/logos/asset_1.png",
      createdByActorType: "api_key",
      createdByActorId: "other_key",
    });

    await expect(service.hardDelete(userActor, "asset_1")).rejects.toThrow(
      "Media asset belongs to another actor",
    );
    expect(s3DeleteObject).not.toHaveBeenCalled();
    expect(mediaAssetUpdate).not.toHaveBeenCalled();
  });
});
