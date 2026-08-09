import { ConflictException } from "@nestjs/common";
import { StudioDraftResourceType } from "@workspace/database/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service.js";
import { StudioDraftsService } from "./studio-drafts.service.js";

const mockStudioDraftFindUnique = vi.fn();
const mockStudioDraftCreate = vi.fn();
const mockStudioDraftUpdateMany = vi.fn();

const prismaMock = {
  client: {
    studioDraft: {
      findUnique: mockStudioDraftFindUnique,
      create: mockStudioDraftCreate,
      updateMany: mockStudioDraftUpdateMany,
    },
  },
} as unknown as PrismaService;

function makeDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: "draft_1",
    projectId: "project_1",
    resourceType: StudioDraftResourceType.FORM,
    resourceId: "form_1",
    version: 1,
    publishedVersion: null,
    draft: { content: { title: "Draft" } },
    updatedByUserId: "user_1",
    createdAt: new Date("2026-05-02T00:00:00.000Z"),
    updatedAt: new Date("2026-05-02T00:01:00.000Z"),
    ...overrides,
  };
}

describe("StudioDraftsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty version-zero draft envelope when no draft exists", async () => {
    mockStudioDraftFindUnique.mockResolvedValue(null);

    const service = new StudioDraftsService(prismaMock);
    const result = await service.getDraft({
      projectId: "project_1",
      resourceType: StudioDraftResourceType.FORM,
      resourceId: "form_1",
    });

    expect(result).toEqual({
      resourceType: StudioDraftResourceType.FORM,
      resourceId: "form_1",
      version: 0,
      publishedVersion: null,
      draft: null,
      updatedByUserId: null,
      updatedAt: null,
    });
  });

  it("creates the first resource draft when expectedVersion is zero", async () => {
    mockStudioDraftCreate.mockResolvedValue(makeDraft());

    const service = new StudioDraftsService(prismaMock);
    const result = await service.saveDraft({
      projectId: "project_1",
      resourceType: StudioDraftResourceType.FORM,
      resourceId: "form_1",
      draft: { content: { title: "Draft" } },
      expectedVersion: 0,
      updatedByUserId: "user_1",
    });

    expect(mockStudioDraftCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        resourceType: StudioDraftResourceType.FORM,
        resourceId: "form_1",
        version: 1,
        draft: { content: { title: "Draft" } },
        updatedByUserId: "user_1",
      }),
      select: expect.any(Object),
    });
    expect(result.version).toBe(1);
  });

  it("increments the draft version only when the expected version matches", async () => {
    mockStudioDraftUpdateMany.mockResolvedValue({ count: 1 });
    mockStudioDraftFindUnique.mockResolvedValue(makeDraft({ version: 3 }));

    const service = new StudioDraftsService(prismaMock);
    const result = await service.saveDraft({
      projectId: "project_1",
      resourceType: StudioDraftResourceType.WIDGET,
      resourceId: "widget_1",
      draft: { layout: "grid" },
      expectedVersion: 2,
      updatedByUserId: "user_1",
    });

    expect(mockStudioDraftUpdateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        resourceType: StudioDraftResourceType.WIDGET,
        resourceId: "widget_1",
        version: 2,
      },
      data: {
        draft: { layout: "grid" },
        updatedByUserId: "user_1",
        version: { increment: 1 },
      },
    });
    expect(result.version).toBe(3);
  });

  it("throws a conflict when the expected version is stale", async () => {
    mockStudioDraftUpdateMany.mockResolvedValue({ count: 0 });

    const service = new StudioDraftsService(prismaMock);

    await expect(
      service.saveDraft({
        projectId: "project_1",
        resourceType: StudioDraftResourceType.FORM,
        resourceId: "form_1",
        draft: { content: { title: "Stale" } },
        expectedVersion: 4,
        updatedByUserId: "user_1",
      }),
    ).rejects.toThrow(ConflictException);
  });
});
