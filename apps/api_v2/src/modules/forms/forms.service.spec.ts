import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  ModerationStatus,
  PublicSubmitTrustMode,
  StudioDraftResourceType,
} from "@workspace/database/prisma";
import { defaultFormDefinition } from "@workspace/forms-core/schema";
import { FormsService } from "./forms.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { ConfigService } from "@nestjs/config";
import type { RedisService } from "../redis/redis.service.js";
import type { StudioDraftsService } from "../studio-drafts/studio-drafts.service.js";
import type { SubmissionPrivateMetadataService } from "../responses/submission-private-metadata.service.js";
import type { PublicSubmitTrustService } from "../responses/public-submit-trust.service.js";
import type { NotificationsService } from "../notifications/notifications.service.js";
import type { SubmissionModerationService } from "../submission-moderation/submission-moderation.service.js";
import type { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { MediaService } from "../storage/media.service.js";
import { hashIdempotencyPayload } from "../responses/responses.dto.js";
import {
  LEGACY_STUDIO_DRAFT_MESSAGE,
  createDefaultPublishedFormConfig,
} from "./forms-v4-config.js";

const mockCollectionFormFindMany = vi.fn();
const mockCollectionFormCreate = vi.fn();
const mockCollectionFormFindFirst = vi.fn();
const mockCollectionFormUpdate = vi.fn();
const mockCollectionFormDelete = vi.fn();
const mockProjectFindUnique = vi.fn();
const mockProjectFindFirst = vi.fn();
const mockPublicSurfaceHostFindFirst = vi.fn();
const mockPublicSubmitIdempotencyCreate = vi.fn();
const mockPublicSubmitIdempotencyFindUnique = vi.fn();
const mockPublicSubmitIdempotencyUpdate = vi.fn();
const mockCollectionFormSubmissionFindFirst = vi.fn();
const mockCollectionFormSubmissionCreate = vi.fn();
const mockCollectionFormSubmissionGroupBy = vi.fn();
const mockProjectAnalyticsDailyUpsert = vi.fn();
const mockWidgetAnalyticsCreateMany = vi.fn();
const mockFormImpressionCreate = vi.fn();
const mockFormImpressionGroupBy = vi.fn();
const mockStudioDraftFindUnique = vi.fn();
const mockStudioDraftUpdateMany = vi.fn();
const mockTransaction = vi.fn();
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
const mockRedisScan = vi.fn();
const mockEvaluateTrust = vi.fn();
const mockGetClientIp = vi.fn();
const mockCreatePrivateMetadataForPublicSubmit = vi.fn();
const mockGetStudioDraft = vi.fn();
const mockSaveStudioDraft = vi.fn();
const mockActivatePublicSubmitAssets = vi.fn();
const mockAttachPublicSubmissionAssets = vi.fn();
const mockCreateForProjectReviewers = vi.fn();
const mockEnqueueSubmission = vi.fn();

const prismaMock = {
  client: {
    $transaction: mockTransaction,
    collectionForm: {
      findMany: mockCollectionFormFindMany,
      create: mockCollectionFormCreate,
      findFirst: mockCollectionFormFindFirst,
      update: mockCollectionFormUpdate,
      delete: mockCollectionFormDelete,
    },
    project: {
      findUnique: mockProjectFindUnique,
      findFirst: mockProjectFindFirst,
    },
    publicSurfaceHost: {
      findFirst: mockPublicSurfaceHostFindFirst,
    },
    collectionFormSubmission: {
      findFirst: mockCollectionFormSubmissionFindFirst,
      create: mockCollectionFormSubmissionCreate,
      groupBy: mockCollectionFormSubmissionGroupBy,
    },
    projectAnalyticsDaily: {
      upsert: mockProjectAnalyticsDailyUpsert,
    },
    widgetAnalytics: {
      createMany: mockWidgetAnalyticsCreateMany,
    },
    formImpression: {
      create: mockFormImpressionCreate,
      groupBy: mockFormImpressionGroupBy,
    },
    publicSubmitIdempotency: {
      create: mockPublicSubmitIdempotencyCreate,
      findUnique: mockPublicSubmitIdempotencyFindUnique,
      update: mockPublicSubmitIdempotencyUpdate,
    },
    studioDraft: {
      findUnique: mockStudioDraftFindUnique,
      updateMany: mockStudioDraftUpdateMany,
    },
  },
} as unknown as PrismaService;

const redisMock = {
  redis: {
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    scan: mockRedisScan,
  },
} as unknown as RedisService;

const trustServiceMock = {
  evaluate: mockEvaluateTrust,
  getClientIp: mockGetClientIp,
} as unknown as PublicSubmitTrustService;

const privateMetadataServiceMock = {
  createForPublicSubmit: mockCreatePrivateMetadataForPublicSubmit,
} as unknown as SubmissionPrivateMetadataService;

const studioDraftsServiceMock = {
  getDraft: mockGetStudioDraft,
  saveDraft: mockSaveStudioDraft,
} as unknown as StudioDraftsService;

const mediaServiceMock = {
  activatePublicSubmitAssets: mockActivatePublicSubmitAssets,
  attachPublicSubmissionAssets: mockAttachPublicSubmissionAssets,
  toDto: vi.fn(() => null),
} as unknown as MediaService;

const notificationsServiceMock = {
  createForProjectReviewers: mockCreateForProjectReviewers,
} as unknown as NotificationsService;

const submissionModerationServiceMock = {
  enqueueSubmission: mockEnqueueSubmission,
} as unknown as SubmissionModerationService;

const mockActionAuditRecordMany = vi.fn();
const actionAuditServiceMock = {
  recordMany: mockActionAuditRecordMany,
} as unknown as ProjectActionAuditService;

const configServiceMock = {
  get: vi.fn((key: string) =>
    key === "FORMS_RUNTIME_PUBLIC_BASE_DOMAIN"
      ? "collect.semblia.com"
      : undefined,
  ),
} as unknown as ConfigService;

function makeService(mediaService?: MediaService) {
  return new FormsService(
    prismaMock,
    configServiceMock,
    redisMock,
    trustServiceMock,
    privateMetadataServiceMock,
    studioDraftsServiceMock,
    actionAuditServiceMock,
    mediaService,
    notificationsServiceMock,
    submissionModerationServiceMock,
  );
}

function makeForm(overrides: Record<string, unknown> = {}) {
  return {
    id: "form_1",
    projectId: "project_1",
    slug: "default-form",
    name: "Default Form",
    description: "Primary form",
    isActive: false,
    abWeight: 0,
    config: createDefaultPublishedFormConfig(),
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-02T00:00:00.000Z"),
    ...overrides,
  };
}

describe("FormsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectionFormFindFirst.mockResolvedValue(null);
    mockPublicSurfaceHostFindFirst.mockResolvedValue(null);
    mockProjectFindFirst.mockResolvedValue(null);
    mockRedisScan.mockResolvedValue(["0", []]);
    mockGetClientIp.mockReturnValue("198.51.100.10");
    mockCreatePrivateMetadataForPublicSubmit.mockResolvedValue(null);
    mockGetStudioDraft.mockResolvedValue({
      resourceType: StudioDraftResourceType.FORM,
      resourceId: "form_1",
      version: 1,
      publishedVersion: null,
      draft: { content: { headerTitle: "Saved draft" } },
      updatedByUserId: "user_1",
      updatedAt: new Date("2026-05-02T00:00:00.000Z"),
    });
    mockSaveStudioDraft.mockResolvedValue({
      resourceType: StudioDraftResourceType.FORM,
      resourceId: "form_1",
      version: 2,
      publishedVersion: null,
      draft: { content: { headerTitle: "Saved draft" } },
      updatedByUserId: "user_1",
      updatedAt: new Date("2026-05-02T00:01:00.000Z"),
    });
    mockTransaction.mockImplementation(
      async (
        input: ((tx: unknown) => Promise<unknown>) | Array<Promise<unknown>>,
      ) =>
        Array.isArray(input) ? Promise.all(input) : input(prismaMock.client),
    );
    mockProjectAnalyticsDailyUpsert.mockResolvedValue({ id: "daily_1" });
    mockWidgetAnalyticsCreateMany.mockResolvedValue({ count: 1 });
    mockFormImpressionCreate.mockResolvedValue({ id: "impression_1" });
    mockCollectionFormSubmissionFindFirst.mockResolvedValue(null);
    mockCollectionFormSubmissionGroupBy.mockResolvedValue([]);
    mockFormImpressionGroupBy.mockResolvedValue([]);
    mockStudioDraftFindUnique.mockResolvedValue(null);
    mockStudioDraftUpdateMany.mockResolvedValue({ count: 1 });
    mockActivatePublicSubmitAssets.mockResolvedValue(undefined);
    mockAttachPublicSubmissionAssets.mockResolvedValue(undefined);
    mockEnqueueSubmission.mockResolvedValue([]);
  });

  it("list returns forms for the project ordered by createdAt asc", async () => {
    mockCollectionFormFindMany.mockResolvedValue([
      makeForm({
        id: "form_old",
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
      }),
      makeForm({
        id: "form_new",
        createdAt: new Date("2026-04-02T00:00:00.000Z"),
      }),
    ]);

    const service = makeService();
    const result = await service.list(
      { slug: "acme" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockCollectionFormFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project_1" },
        orderBy: { createdAt: "asc" },
      }),
    );
    expect(result.map((item) => item.id)).toEqual(["form_old", "form_new"]);
  });

  it("list batches form metrics for every returned form", async () => {
    mockCollectionFormFindMany.mockResolvedValue([
      makeForm({ id: "form_a" }),
      makeForm({ id: "form_b" }),
    ]);
    mockCollectionFormSubmissionGroupBy.mockResolvedValue([
      {
        formId: "form_a",
        _count: { _all: 3 },
        _avg: { ratingValue: 8.333 },
        _max: { createdAt: new Date("2026-05-10T12:00:00.000Z") },
      },
    ]);
    mockFormImpressionGroupBy.mockResolvedValue([
      { formId: "form_a", _count: { _all: 12 } },
      { formId: "form_b", _count: { _all: 4 } },
    ]);

    const service = makeService();
    const result = await service.list(
      { slug: "acme" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockCollectionFormSubmissionGroupBy).toHaveBeenCalledWith({
      by: ["formId"],
      where: { projectId: "project_1", formId: { in: ["form_a", "form_b"] } },
      _count: { _all: true },
      _avg: { ratingValue: true },
      _max: { createdAt: true },
    });
    expect(mockFormImpressionGroupBy).toHaveBeenCalledWith({
      by: ["formId"],
      where: { projectId: "project_1", formId: { in: ["form_a", "form_b"] } },
      _count: { _all: true },
    });
    expect(result[0]).toMatchObject({
      id: "form_a",
      submissions: 3,
      views: 12,
      responseRate: 25,
      avgRating: 8.3,
      lastSubmissionAt: new Date("2026-05-10T12:00:00.000Z"),
    });
    expect(result[0]?.entry).toMatchObject({
      submissions: 3,
      views: 12,
      responseRate: 25,
      avgRating: 8.3,
      lastSubmissionAt: new Date("2026-05-10T12:00:00.000Z"),
    });
    expect(result[1]).toMatchObject({
      id: "form_b",
      submissions: 0,
      views: 4,
      responseRate: 0,
      avgRating: 0,
      lastSubmissionAt: null,
    });
  });

  it("create returns authenticated dto with stub metrics", async () => {
    mockProjectFindUnique.mockResolvedValue({
      name: "Acme",
      brandColorPrimary: "#0f766e",
    });
    mockCollectionFormCreate.mockResolvedValue(makeForm());

    const service = makeService();
    const result = await service.create(
      { slug: "acme" },
      {
        name: "Default Form",
        description: "",
        isActive: false,
        abWeight: 0,
      },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockCollectionFormCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          config: expect.objectContaining({
            schemaVersion: 2,
            content: expect.objectContaining({
              brandName: "Acme",
            }),
            theme: expect.objectContaining({
              inputs: expect.objectContaining({ brandColor: "#0f766e" }),
            }),
            derived: expect.any(Object),
          }),
        }),
      }),
    );
    expect(result).toMatchObject({
      id: "form_1",
      projectId: "project_1",
      submissions: 0,
      views: 0,
      responseRate: 0,
      avgRating: 0,
      lastSubmissionAt: null,
    });
  });

  it("create rejects invalid forms v4 configs with 422", async () => {
    const service = makeService();

    await expect(
      service.create(
        { slug: "acme" },
        {
          name: "Default Form",
          description: "",
          isActive: false,
          abWeight: 0,
          config: { content: { headerTitle: "Legacy config" } },
        },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(mockCollectionFormCreate).not.toHaveBeenCalled();
  });

  it("duplicate creates an inactive copy with the source config and stub metrics", async () => {
    const sourceConfig = createDefaultPublishedFormConfig({
      brandName: "Customer proof",
    });
    mockCollectionFormFindFirst
      .mockResolvedValueOnce(
        makeForm({
          id: "form_source",
          slug: "customer-proof-form",
          name: "Customer proof form",
          description: "Collect launch testimonials",
          isActive: true,
          abWeight: 50,
          config: sourceConfig,
        }),
      )
      .mockResolvedValue(null);
    mockCollectionFormCreate.mockResolvedValue(
      makeForm({
        id: "form_copy",
        name: "Customer proof form (copy)",
        description: "Collect launch testimonials",
        isActive: false,
        abWeight: 0,
        config: sourceConfig,
      }),
    );

    const service = makeService();
    const result = await service.duplicate(
      { slug: "acme", formId: "form_source" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockCollectionFormFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "form_source", projectId: "project_1" },
      }),
    );
    expect(mockCollectionFormCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          projectId: "project_1",
          slug: "customer-proof-form-copy",
          name: "Customer proof form (copy)",
          description: "Collect launch testimonials",
          isActive: false,
          abWeight: 0,
          config: sourceConfig,
        },
      }),
    );
    expect(mockSaveStudioDraft).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "form_copy",
      name: "Customer proof form (copy)",
      isActive: false,
      abWeight: 0,
      config: sourceConfig,
      submissions: 0,
      views: 0,
      responseRate: 0,
      avgRating: 0,
      lastSubmissionAt: null,
    });
  });

  it("duplicate truncates the copy suffix to the collection form name limit", async () => {
    const sourceName = "x".repeat(255);
    mockCollectionFormFindFirst
      .mockResolvedValueOnce(makeForm({ name: sourceName }))
      .mockResolvedValue(null);
    mockCollectionFormCreate.mockResolvedValue(
      makeForm({
        id: "form_copy",
        name: `${sourceName} (copy)`.slice(0, 255),
      }),
    );

    const service = makeService();
    await service.duplicate(
      { slug: "acme", formId: "form_1" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockCollectionFormCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: `${sourceName} (copy)`.slice(0, 255),
        }),
      }),
    );
  });

  it("duplicate throws 404 when the source form is missing", async () => {
    mockCollectionFormFindFirst.mockResolvedValue(null);

    const service = makeService();

    await expect(
      service.duplicate(
        { slug: "acme", formId: "form_missing" },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).rejects.toThrow(NotFoundException);
    expect(mockCollectionFormCreate).not.toHaveBeenCalled();
  });

  it("duplicate throws 404 without leaking forms from a different project", async () => {
    mockCollectionFormFindFirst.mockResolvedValue(null);

    const service = makeService();

    await expect(
      service.duplicate(
        { slug: "acme", formId: "form_other_project" },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).rejects.toThrow(NotFoundException);
    expect(mockCollectionFormFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "form_other_project", projectId: "project_1" },
      }),
    );
    expect(mockCollectionFormCreate).not.toHaveBeenCalled();
  });

  it("getById throws 404 when the form belongs to a different project", async () => {
    mockCollectionFormFindFirst.mockResolvedValue(null);

    const service = makeService();

    await expect(
      service.getById(
        { slug: "acme", formId: "form_2" },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("update busts the forms public render cache key", async () => {
    mockCollectionFormFindFirst.mockResolvedValue(makeForm());
    mockCollectionFormUpdate.mockResolvedValue(makeForm({ name: "Updated" }));

    const service = makeService();
    await service.update(
      { slug: "acme", formId: "form_1" },
      { name: "Updated" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockRedisDel).toHaveBeenCalledWith("v2:forms:public:acme");
  });

  it("delete busts the forms public render cache key", async () => {
    mockCollectionFormFindFirst.mockResolvedValue(makeForm());
    mockCollectionFormDelete.mockResolvedValue({
      id: "form_1",
      projectId: "project_1",
    });

    const service = makeService();
    await service.delete(
      { slug: "acme", formId: "form_1" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockRedisDel).toHaveBeenCalledWith("v2:forms:public:acme");
  });

  it("getDraft verifies form ownership before returning the shared server draft", async () => {
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));

    const service = makeService();
    const result = await service.getDraft(
      { slug: "acme", formId: "form_1" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockCollectionFormFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "form_1", projectId: "project_1" },
      }),
    );
    expect(mockGetStudioDraft).toHaveBeenCalledWith({
      projectId: "project_1",
      resourceType: StudioDraftResourceType.FORM,
      resourceId: "form_1",
    });
    expect(result.version).toBe(1);
  });

  it("saveDraft verifies form ownership and forwards optimistic concurrency details", async () => {
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));

    const service = makeService();
    const result = await service.saveDraft(
      { slug: "acme", formId: "form_1" },
      {
        draft: { content: { headerTitle: "Saved draft" } },
        expectedVersion: 1,
      },
      { projectAccess: { projectId: "project_1" } },
      "user_1",
    );

    expect(mockSaveStudioDraft).toHaveBeenCalledWith({
      projectId: "project_1",
      resourceType: StudioDraftResourceType.FORM,
      resourceId: "form_1",
      draft: { content: { headerTitle: "Saved draft" } },
      expectedVersion: 1,
      updatedByUserId: "user_1",
    });
    expect(result.version).toBe(2);
  });

  it("publishDraft promotes the saved Studio draft into the live hosted form config", async () => {
    const draftConfig = defaultFormDefinition({
      brandName: "Acme",
      brandColor: "#0f766e",
    });
    draftConfig.content.headline = "Live headline";
    const publishedConfig = createDefaultPublishedFormConfig({
      brandName: "Acme",
      brandColor: "#0f766e",
    });
    publishedConfig.content.headline = "Live headline";
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));
    mockStudioDraftFindUnique.mockResolvedValue({
      resourceType: StudioDraftResourceType.FORM,
      resourceId: "form_1",
      version: 2,
      publishedVersion: null,
      draft: draftConfig,
      updatedByUserId: "user_1",
      updatedAt: new Date("2026-05-02T00:01:00.000Z"),
    });
    mockCollectionFormUpdate.mockResolvedValue(
      makeForm({
        isActive: true,
        config: publishedConfig,
      }),
    );

    const service = makeService();
    const result = await service.publishDraft(
      { slug: "acme", formId: "form_1" },
      { expectedVersion: 2 },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockCollectionFormUpdate).toHaveBeenCalledWith({
      where: { id: "form_1" },
      data: {
        config: expect.objectContaining({
          schemaVersion: 2,
          content: expect.objectContaining({
            brandName: "Acme",
            headline: "Live headline",
          }),
          derived: expect.any(Object),
        }),
      },
      select: expect.any(Object),
    });
    expect(mockStudioDraftUpdateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        resourceType: StudioDraftResourceType.FORM,
        resourceId: "form_1",
        version: 2,
      },
      data: { publishedVersion: 2 },
    });
    expect(mockRedisDel).toHaveBeenCalledWith("v2:forms:public:acme");
    expect(result.config).toMatchObject({
      schemaVersion: 2,
      content: {
        brandName: "Acme",
        headline: "Live headline",
      },
      derived: expect.any(Object),
    });
  });

  it("publishDraft rejects legacy Studio drafts loudly", async () => {
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));
    mockStudioDraftFindUnique.mockResolvedValue({
      resourceType: StudioDraftResourceType.FORM,
      resourceId: "form_1",
      version: 2,
      publishedVersion: null,
      draft: { content: { headerTitle: "Legacy draft" } },
      updatedByUserId: "user_1",
      updatedAt: new Date("2026-05-02T00:01:00.000Z"),
    });

    const service = makeService();

    await expect(
      service.publishDraft(
        { slug: "acme", formId: "form_1" },
        { expectedVersion: 2 },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).rejects.toMatchObject({
      response: { message: LEGACY_STUDIO_DRAFT_MESSAGE },
    });
    expect(mockCollectionFormUpdate).not.toHaveBeenCalled();
  });

  it("recordThemeTelemetry persists validated events for the owned form", async () => {
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));

    const service = makeService();
    const actor = {
      actorType: "user",
      userId: "user_1",
      credentialId: null,
    } as unknown as Parameters<typeof service.recordThemeTelemetry>[3];
    const result = await service.recordThemeTelemetry(
      { slug: "acme", formId: "form_1" },
      {
        events: [
          {
            type: "forms_theme.knob_changed",
            formId: "form_1",
            presetId: "clean",
            knob: "brandColor",
            from: "#4f46e5",
            to: "#0f766e",
          },
        ],
      },
      { projectAccess: { projectId: "project_1" } },
      actor,
    );

    expect(result).toEqual({ accepted: true, count: 1 });
    expect(mockActionAuditRecordMany).toHaveBeenCalledWith([
      expect.objectContaining({
        projectId: "project_1",
        actor,
        action: "forms_theme.knob_changed",
        targetType: "FORM",
        targetId: "form_1",
        metadata: expect.objectContaining({ knob: "brandColor" }),
      }),
    ]);
  });

  it("recordThemeTelemetry rejects event form IDs that do not match the route", async () => {
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));

    const service = makeService();
    await expect(
      service.recordThemeTelemetry(
        { slug: "acme", formId: "form_1" },
        {
          events: [
            {
              type: "forms_theme.preset_selected",
              formId: "form_other",
              presetId: "clean",
              previousPresetId: null,
            },
          ],
        },
        { projectAccess: { projectId: "project_1" } },
        null,
      ),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(mockActionAuditRecordMany).not.toHaveBeenCalled();
  });

  it("listPublic returns only active forms with safe projection", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockProjectFindUnique.mockResolvedValue({ id: "project_1" });
    mockCollectionFormFindMany.mockResolvedValue([
      makeForm({
        isActive: true,
        updatedAt: new Date("2026-04-05T00:00:00.000Z"),
      }),
    ]);

    const service = makeService();
    const result = await service.listPublic({ slug: "acme" });

    expect(mockCollectionFormFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project_1", isActive: true },
        orderBy: { createdAt: "asc" },
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: "form_1",
      slug: "default-form",
      name: "Default Form",
      description: "Primary form",
      isActive: true,
      abWeight: 0,
      config: {
        schemaVersion: 2,
        derived: expect.any(Object),
      },
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
    });
    expect(result.data[0]).not.toHaveProperty("updatedAt");
  });

  it("listPublic uses the cache when available", async () => {
    mockRedisGet.mockResolvedValue(
      JSON.stringify({ data: [{ id: "cached_form" }] }),
    );

    const service = makeService();
    const result = await service.listPublic({ slug: "acme" });

    expect(result).toEqual({ data: [{ id: "cached_form" }] });
    expect(mockCollectionFormFindMany).not.toHaveBeenCalled();
  });

  it("resolveRuntimeForm resolves the default hosted form and returns hosted renderer config", async () => {
    mockPublicSurfaceHostFindFirst.mockResolvedValue(null);
    mockProjectFindFirst.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      name: "Acme",
      brandColorPrimary: "#0f766e",
    });
    mockGetClientIp.mockReturnValueOnce("198.51.100.55");
    mockCollectionFormFindFirst.mockResolvedValue(
      makeForm({
        isActive: true,
        config: {
          brandName: "Acme",
          headline: "Tell us what worked",
          subhead: "A short note helps the next buyer.",
          questions: [
            {
              id: "content",
              type: "textarea",
              label: "Your feedback",
              required: true,
            },
            {
              id: "authorName",
              type: "text",
              label: "Your name",
              required: true,
            },
            {
              id: "authorEmail",
              type: "email",
              label: "Email",
              required: false,
            },
            {
              id: "rating",
              type: "rating",
              label: "Rating",
              required: true,
            },
            {
              id: "authorCompany",
              type: "text",
              label: "Company",
              required: false,
            },
          ],
          tokens: {
            accent: "#0f766e",
            radius: 28,
            fontBody: "ui-sans-serif, system-ui, sans-serif",
          },
        },
      }),
    );

    const service = makeService();
    const result = await service.resolveRuntimeForm(
      { projectPublicSlug: "acme", formSlug: null, path: "/" },
      {
        headers: {
          "x-semblia-original-host": "acme.collect.semblia.com",
          "user-agent": "Vitest",
        },
        ip: "198.51.100.55",
      },
    );

    expect(mockProjectFindFirst).toHaveBeenCalledWith({
      where: { slug: "acme", isActive: true },
      select: expect.objectContaining({
        id: true,
        slug: true,
        name: true,
        brandColorPrimary: true,
        autoModeration: true,
        autoApproveVerified: true,
        user: expect.any(Object),
      }),
    });
    expect(mockCollectionFormFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project_1", isActive: true },
        orderBy: [{ abWeight: "desc" }, { createdAt: "asc" }],
      }),
    );
    expect(result.project).toEqual({
      id: "project_1",
      slug: "acme",
      name: "Acme",
      publicSlug: "acme",
      brandColorPrimary: "#0f766e",
    });
    expect(result.form).toMatchObject({
      id: "form_1",
      slug: "default-form",
      name: "Default Form",
      configEtag: expect.stringMatching(/^[a-f0-9]{64}$/),
      publishedAt: "2026-04-02T00:00:00.000Z",
    });
    expect(result.form.config).toMatchObject({
      schemaVersion: 2,
      content: {
        brandName: "Acme",
        headline: "Tell us what worked",
      },
      theme: {
        inputs: expect.objectContaining({
          brandColor: "#0f766e",
          radius: 4,
        }),
      },
      derived: expect.any(Object),
    });
    const hostedConfig = result.form.config as {
      structure: { questions: Array<{ id: string }> };
    };
    expect(
      hostedConfig.structure.questions.map((question) => question.id),
    ).toEqual([
      "content",
      "authorName",
      "authorEmail",
      "rating",
      "authorCompany",
    ]);
    expect(mockFormImpressionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project_1",
          formId: "form_1",
          ipAddress: "198.51.100.55",
          userAgent: "Vitest",
        }),
      }),
    );
    expect(mockProjectAnalyticsDailyUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          formViews: 1,
          hostedPageViews: 1,
        }),
        update: {
          formViews: { increment: 1 },
          hostedPageViews: { increment: 1 },
        },
      }),
    );
  });

  it("submitRuntimeForm parses hosted form posts and stores only canonical submissions", async () => {
    mockPublicSurfaceHostFindFirst.mockResolvedValue(null);
    mockProjectFindFirst.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      name: "Acme",
      brandColorPrimary: "#0f766e",
      autoModeration: true,
      autoApproveVerified: false,
    });
    mockCollectionFormFindFirst.mockResolvedValueOnce(
      makeForm({ isActive: true }),
    );
    mockCollectionFormSubmissionCreate.mockResolvedValue({
      id: "submission_1",
    });

    const service = makeService();
    const result = await service.submitRuntimeForm(
      {
        context: { projectPublicSlug: "acme", formSlug: null, path: "/" },
        contentType: "application/x-www-form-urlencoded",
        body: [
          "answers%5BauthorName%5D=Ada",
          "answers%5BauthorEmail%5D=ada%40example.com",
          "answers%5Bcontent%5D=Great",
          "answers%5Brating%5D=5",
        ].join("&"),
      },
      {
        headers: {
          "x-semblia-original-host": "acme.collect.semblia.com",
          "x-semblia-original-user-agent": "Hosted Browser",
        },
      },
    );

    expect(mockEvaluateTrust).not.toHaveBeenCalled();
    expect(mockProjectFindUnique).not.toHaveBeenCalled();
    expect(mockCollectionFormSubmissionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        answers: expect.objectContaining({
          authorName: "Ada",
          authorEmail: "ada@example.com",
          content: "Great",
          rating: "5",
        }),
        ratingValue: 5,
        moderationStatus: ModerationStatus.PENDING,
      }),
    });
    expect(mockProjectAnalyticsDailyUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ formSubmissions: 1 }),
        update: { formSubmissions: { increment: 1 } },
      }),
    );
    expect(result).toEqual({ redirectTo: null });
  });

  it("submitRuntimeForm reuses the resolved hosted target without re-running public origin trust", async () => {
    mockPublicSurfaceHostFindFirst.mockResolvedValue(null);
    mockProjectFindFirst.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      name: "Acme",
      brandColorPrimary: "#0f766e",
      autoModeration: true,
      autoApproveVerified: false,
    });
    mockCollectionFormFindFirst.mockResolvedValueOnce(
      makeForm({ isActive: true }),
    );
    mockCollectionFormSubmissionCreate.mockResolvedValue({
      id: "submission_1",
    });
    mockGetClientIp.mockReturnValue("203.0.113.44");

    const service = makeService();
    await service.submitRuntimeForm(
      {
        context: { projectPublicSlug: "acme", formSlug: null, path: "/" },
        contentType: "application/x-www-form-urlencoded",
        body: [
          "answers%5BauthorName%5D=Ada",
          "answers%5Bcontent%5D=Great",
          "answers%5Brating%5D=5",
        ].join("&"),
      },
      {
        headers: {
          "x-semblia-original-host": "acme.collect.semblia.com",
          "x-semblia-original-user-agent": "Hosted Browser",
          "x-semblia-original-forwarded-for": "203.0.113.44, 10.0.0.10",
        },
        ip: "10.0.0.10",
      },
    );

    expect(mockEvaluateTrust).not.toHaveBeenCalled();
    expect(mockProjectFindUnique).not.toHaveBeenCalled();
    expect(mockCollectionFormFindFirst).toHaveBeenCalledTimes(1);
    expect(mockGetClientIp).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: "203.0.113.44",
        headers: expect.objectContaining({
          origin: "https://acme.collect.semblia.com",
          "user-agent": "Hosted Browser",
          "x-forwarded-for": "203.0.113.44, 10.0.0.10",
        }),
      }),
    );
    expect(mockCollectionFormSubmissionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        formId: "form_1",
        trustMode: PublicSubmitTrustMode.ORIGIN,
      }),
    });
  });

  it("resolveRuntimeForm uses active custom host records without default-host fallback", async () => {
    mockPublicSurfaceHostFindFirst.mockResolvedValue({
      resourceType: "FORM",
      resourceId: "form_custom",
      project: {
        id: "project_1",
        slug: "acme",
        name: "Acme",
        brandColorPrimary: "#0f766e",
        autoModeration: true,
        autoApproveVerified: true,
      },
    });
    mockCollectionFormFindFirst.mockResolvedValue(
      makeForm({ id: "form_custom", isActive: true }),
    );

    const service = makeService();
    const result = await service.resolveRuntimeForm(
      {
        projectPublicSlug: "feedback",
        formSlug: null,
        path: "/",
      },
      {
        headers: {
          "x-semblia-original-host": "feedback.customer.example",
        },
        ip: "198.51.100.20",
      },
    );

    expect(mockProjectFindFirst).not.toHaveBeenCalled();
    expect(mockPublicSurfaceHostFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hostname: "feedback.customer.example",
          status: "ACTIVE",
          feature: "COLLECTION",
        }),
      }),
    );
    expect(result.project.publicSlug).toBe("acme");
    expect(result.form.id).toBe("form_custom");
  });

  it("submitRuntimeForm drops unsafe cross-origin redirect targets", async () => {
    mockPublicSurfaceHostFindFirst.mockResolvedValue(null);
    mockProjectFindFirst.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      name: "Acme",
      brandColorPrimary: "#0f766e",
      autoModeration: true,
      autoApproveVerified: false,
    });
    mockCollectionFormFindFirst.mockResolvedValueOnce(
      makeForm({
        isActive: true,
        config: {
          content: {
            successAction: {
              kind: "redirect",
              url: "https://evil.example/phish",
            },
          },
        },
      }),
    );
    mockCollectionFormSubmissionCreate.mockResolvedValue({
      id: "submission_1",
    });

    const service = makeService();
    const result = await service.submitRuntimeForm(
      {
        context: { projectPublicSlug: "acme", formSlug: null, path: "/" },
        contentType: "application/x-www-form-urlencoded",
        body: [
          "answers%5BauthorName%5D=Ada",
          "answers%5Bcontent%5D=Great",
          "answers%5Brating%5D=5",
        ].join("&"),
      },
      {
        headers: {
          "x-semblia-original-host": "acme.collect.semblia.com",
        },
      },
    );

    expect(result).toEqual({ redirectTo: null });
  });

  it("submitRuntimeForm honours studio-shape success redirects on the same host", async () => {
    mockPublicSurfaceHostFindFirst.mockResolvedValue(null);
    mockProjectFindFirst.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      name: "Acme",
      brandColorPrimary: "#0f766e",
      autoModeration: true,
      autoApproveVerified: false,
    });
    mockCollectionFormFindFirst.mockResolvedValueOnce(
      makeForm({
        isActive: true,
        config: {
          success: {
            action: "redirect",
            redirectUrl: "https://acme.collect.semblia.com/thanks",
          },
        },
      }),
    );
    mockCollectionFormSubmissionCreate.mockResolvedValue({
      id: "submission_1",
    });

    const service = makeService();
    const result = await service.submitRuntimeForm(
      {
        context: { projectPublicSlug: "acme", formSlug: null, path: "/" },
        contentType: "application/x-www-form-urlencoded",
        body: [
          "answers%5BauthorName%5D=Ada",
          "answers%5Bcontent%5D=Great",
          "answers%5Brating%5D=5",
        ].join("&"),
      },
      {
        headers: {
          "x-semblia-original-host": "acme.collect.semblia.com",
        },
      },
    );

    expect(result).toEqual({
      redirectTo: "https://acme.collect.semblia.com/thanks",
    });
  });

  it("submitPublic persists answers in a canonical submission without testimonial projections", async () => {
    mockEvaluateTrust.mockResolvedValue({
      projectId: "project_1",
      trust: "hmac",
      principal: "project:project_1",
      signingSecretId: "secret_1",
    });
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      autoModeration: true,
      autoApproveVerified: true,
    });
    mockCollectionFormSubmissionCreate.mockResolvedValue({
      id: "submission_1",
      projectId: "project_1",
      formId: "form_1",
    });

    const service = makeService();
    const result = await service.submitPublic(
      { slug: "acme", formId: "form_1" },
      {
        authorName: "Ada",
        authorEmail: "ada@example.com",
        content: "Loved it",
        rating: 10,
        answers: {
          nps: 10,
          favoriteFeature: "wall",
        },
        isOAuthVerified: true,
      },
      {
        headers: { "user-agent": "Vitest" },
        rawBody: JSON.stringify({ authorName: "Ada", content: "Loved it" }),
      },
    );

    expect(mockCollectionFormSubmissionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        formId: "form_1",
        signingSecretId: "secret_1",
        trustedOriginId: null,
        trustMode: PublicSubmitTrustMode.HMAC,
        idempotencyKey: null,
        moderationStatus: ModerationStatus.APPROVED,
        answers: {
          nps: 10,
          favoriteFeature: "wall",
        },
        ratingValue: 10,
        ratingScale: 10,
      }),
    });
    expect(
      mockCollectionFormSubmissionCreate.mock.calls[0]?.[0].data,
    ).not.toHaveProperty("testimonialId");
    expect(mockCreateForProjectReviewers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "SUBMISSION_CREATED",
        link: "/projects/acme/responses/submission_1",
        metadata: expect.objectContaining({
          projectId: "project_1",
          formId: "form_1",
          submissionId: "submission_1",
        }),
      }),
    );
    expect(
      mockCreateForProjectReviewers.mock.calls[0]?.[1].metadata,
    ).not.toHaveProperty("testimonialId");
    expect(mockCreatePrivateMetadataForPublicSubmit).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        submissionId: "submission_1",
        authorEmail: "ada@example.com",
        ipAddress: "198.51.100.10",
        userAgent: "Vitest",
      }),
    );
    expect(
      mockCreatePrivateMetadataForPublicSubmit.mock.calls[0]?.[1],
    ).not.toHaveProperty("testimonialId");
    expect(mockEnqueueSubmission).toHaveBeenCalledWith({
      submissionId: "submission_1",
    });
    expect(result).toMatchObject({
      formId: "form_1",
      moderationStatus: ModerationStatus.APPROVED,
      autoPublished: true,
    });
    expect(result).not.toHaveProperty("authorEmail");
    expect(mockRedisScan).toHaveBeenCalled();
  });

  it("submitPublic attaches uploaded submission media using moderation plan caps", async () => {
    mockEvaluateTrust.mockResolvedValue({
      projectId: "project_1",
      trust: "hmac",
      principal: "project:project_1",
      signingSecretId: "secret_1",
    });
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      autoModeration: true,
      autoApproveVerified: true,
      user: {
        plan: "PRO",
        subscription: {
          userPlan: "PRO",
          plan: {
            limits: {
              moderation: {
                imagesPerMonth: 50,
                maxMediaAssetsPerSubmission: 3,
                maxImageBytes: 6_000_000,
              },
            },
          },
        },
      },
    });
    mockCollectionFormSubmissionCreate.mockResolvedValue({
      id: "submission_1",
    });

    const service = makeService(mediaServiceMock);
    await service.submitPublic(
      { slug: "acme", formId: "form_1" },
      {
        authorName: "Ada",
        content: "Loved it",
        mediaAssetIds: ["asset_image_1", "asset_audio_1"],
      },
      {
        headers: {},
        rawBody: JSON.stringify({
          authorName: "Ada",
          content: "Loved it",
          mediaAssetIds: ["asset_image_1", "asset_audio_1"],
        }),
      },
    );

    expect(mockActivatePublicSubmitAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        principal: "project:project_1",
        assetIds: expect.arrayContaining(["asset_image_1", "asset_audio_1"]),
      }),
    );
    expect(mockAttachPublicSubmissionAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        formId: "form_1",
        submissionId: "submission_1",
        principal: "project:project_1",
        assetIds: ["asset_image_1", "asset_audio_1"],
        limits: {
          imagesPerMonth: 50,
          maxMediaAssetsPerSubmission: 3,
          maxImageBytes: 6_000_000,
        },
      }),
    );
  });

  it("submitPublic origin trust auto-approves only verified submissions when enabled", async () => {
    mockEvaluateTrust.mockResolvedValue({
      projectId: "project_1",
      trust: "origin",
      principal: "198.51.100.10",
    });
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));
    mockProjectFindUnique
      .mockResolvedValueOnce({
        id: "project_1",
        autoModeration: true,
        autoApproveVerified: true,
      })
      .mockResolvedValueOnce({
        id: "project_1",
        autoModeration: true,
        autoApproveVerified: false,
      });
    mockCollectionFormSubmissionCreate
      .mockResolvedValueOnce({
        id: "submission_approved",
        projectId: "project_1",
        formId: "form_1",
      })
      .mockResolvedValueOnce({
        id: "submission_pending",
        projectId: "project_1",
        formId: "form_1",
      });

    const service = makeService();

    const approved = (await service.submitPublic(
      { slug: "acme", formId: "form_1" },
      { authorName: "Ada", content: "Loved it", isOAuthVerified: true },
      {
        headers: {},
        rawBody: JSON.stringify({ authorName: "Ada", content: "Loved it" }),
      },
    )) as { moderationStatus: ModerationStatus; autoPublished: boolean };
    const pending = (await service.submitPublic(
      { slug: "acme", formId: "form_1" },
      { authorName: "Ada", content: "Loved it", isOAuthVerified: true },
      {
        headers: {},
        rawBody: JSON.stringify({ authorName: "Ada", content: "Loved it" }),
      },
    )) as { moderationStatus: ModerationStatus; autoPublished: boolean };

    expect(approved.moderationStatus).toBe(ModerationStatus.APPROVED);
    expect(approved.autoPublished).toBe(true);
    expect(pending.moderationStatus).toBe(ModerationStatus.PENDING);
    expect(pending.autoPublished).toBe(false);
  });

  it("submitPublic throws 404 when the form is missing, inactive, or on another project", async () => {
    mockEvaluateTrust.mockResolvedValue({
      projectId: "project_1",
      trust: "hmac",
      principal: "project:project_1",
    });
    mockCollectionFormFindFirst.mockResolvedValue(null);

    const service = makeService();

    await expect(
      service.submitPublic(
        { slug: "acme", formId: "form_404" },
        { authorName: "Ada", content: "Loved it" },
        { headers: {}, rawBody: "{}" },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("submitPublic replays the stored response for the same idempotency key and payload", async () => {
    const rawBody = JSON.stringify({ authorName: "Ada", content: "Loved it" });
    mockEvaluateTrust.mockResolvedValue({
      projectId: "project_1",
      trust: "hmac",
      principal: "project:project_1",
    });
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));
    mockPublicSubmitIdempotencyCreate.mockRejectedValue({ code: "P2002" });
    mockPublicSubmitIdempotencyFindUnique.mockResolvedValue({
      payloadHash: hashIdempotencyPayload(rawBody),
      responseBody: { id: "submission_cached" },
    });

    const service = makeService();

    await expect(
      service.submitPublic(
        { slug: "acme", formId: "form_1" },
        { authorName: "Ada", content: "Loved it" },
        {
          headers: { "idempotency-key": "idem-1" },
          rawBody,
        },
      ),
    ).resolves.toEqual({ id: "submission_cached" });
    expect(mockEnqueueSubmission).not.toHaveBeenCalled();
  });

  it("submitPublic reserves form idempotency keys under the form surface", async () => {
    const rawBody = JSON.stringify({ authorName: "Ada", content: "Loved it" });
    mockEvaluateTrust.mockResolvedValue({
      projectId: "project_1",
      trust: "hmac",
      principal: "project:project_1",
    });
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));
    mockPublicSubmitIdempotencyCreate.mockResolvedValue({ id: "idem_row_1" });
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      autoModeration: true,
      autoApproveVerified: true,
    });
    mockCollectionFormSubmissionCreate.mockResolvedValue({
      id: "submission_1",
    });

    const service = makeService();
    await service.submitPublic(
      { slug: "acme", formId: "form_1" },
      { authorName: "Ada", content: "Loved it" },
      {
        headers: { "idempotency-key": "idem-1" },
        rawBody,
      },
    );

    expect(mockPublicSubmitIdempotencyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        surface: "FORM",
        idempotencyKey: "idem-1",
      }),
    });
  });

  it("submitPublic returns 409 when a matching idempotency key is still processing", async () => {
    const rawBody = JSON.stringify({ authorName: "Ada", content: "Loved it" });
    mockEvaluateTrust.mockResolvedValue({
      projectId: "project_1",
      trust: "hmac",
      principal: "project:project_1",
    });
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));
    mockPublicSubmitIdempotencyCreate.mockRejectedValue({ code: "P2002" });
    mockPublicSubmitIdempotencyFindUnique.mockResolvedValue({
      payloadHash: hashIdempotencyPayload(rawBody),
      responseBody: {},
    });

    const service = makeService();

    await expect(
      service.submitPublic(
        { slug: "acme", formId: "form_1" },
        { authorName: "Ada", content: "Loved it" },
        {
          headers: { "idempotency-key": "idem-1" },
          rawBody,
        },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it("submitPublic returns 409 when the same idempotency key is reused with a different payload", async () => {
    const rawBody = JSON.stringify({ authorName: "Ada", content: "Loved it" });
    mockEvaluateTrust.mockResolvedValue({
      projectId: "project_1",
      trust: "hmac",
      principal: "project:project_1",
    });
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));
    mockPublicSubmitIdempotencyCreate.mockRejectedValue({ code: "P2002" });
    mockPublicSubmitIdempotencyFindUnique.mockResolvedValue({
      payloadHash: "stored-hash",
      responseBody: {},
    });

    const service = makeService();

    await expect(
      service.submitPublic(
        { slug: "acme", formId: "form_1" },
        { authorName: "Ada", content: "Loved it" },
        {
          headers: { "idempotency-key": "idem-1" },
          rawBody,
        },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it("submitPublic rejects exact duplicate form responses within the recent duplicate window", async () => {
    const rawBody = JSON.stringify({ authorName: "Ada", content: "Loved it" });
    mockEvaluateTrust.mockResolvedValue({
      projectId: "project_1",
      trust: "origin",
      principal: "198.51.100.10",
    });
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      autoModeration: true,
      autoApproveVerified: true,
    });
    mockCollectionFormSubmissionFindFirst.mockResolvedValue({
      id: "submission_existing",
      createdAt: new Date("2026-05-31T12:00:00.000Z"),
    });

    const service = makeService();

    await expect(
      service.submitPublic(
        { slug: "acme", formId: "form_1" },
        { authorName: "Ada", content: "Loved it" },
        {
          headers: {},
          rawBody,
        },
      ),
    ).rejects.toThrow(ConflictException);

    expect(mockCollectionFormSubmissionFindFirst).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        formId: "form_1",
        payloadHash: hashIdempotencyPayload(rawBody),
        createdAt: { gte: expect.any(Date) },
      },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    expect(mockCollectionFormSubmissionCreate).not.toHaveBeenCalled();
  });

  it("submitPublic flags spammy submissions instead of auto-approving them", async () => {
    const rawBody = JSON.stringify({
      authorName: "Ada",
      content:
        "Buy now visit https://one.example https://two.example https://three.example",
    });
    mockEvaluateTrust.mockResolvedValue({
      projectId: "project_1",
      trust: "hmac",
      principal: "project:project_1",
    });
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      autoModeration: true,
      autoApproveVerified: true,
    });
    mockCollectionFormSubmissionCreate.mockResolvedValue({
      id: "submission_1",
      projectId: "project_1",
      formId: "form_1",
    });

    const service = makeService();
    const result = await service.submitPublic(
      { slug: "acme", formId: "form_1" },
      {
        authorName: "Ada",
        content:
          "Buy now visit https://one.example https://two.example https://three.example",
      },
      {
        headers: {},
        rawBody,
      },
    );

    expect(mockCollectionFormSubmissionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        moderationStatus: ModerationStatus.FLAGGED,
        moderationReason: expect.stringContaining("spam"),
        metadata: expect.objectContaining({
          qualityGate: expect.objectContaining({
            action: "flag",
            flags: expect.arrayContaining(["spam_links", "spam_terms"]),
          }),
        }),
      }),
    });
    expect(
      mockCollectionFormSubmissionCreate.mock.calls[0]?.[0].data,
    ).not.toHaveProperty("testimonialId");
    expect(result).toMatchObject({
      moderationStatus: ModerationStatus.FLAGGED,
      autoPublished: false,
    });
    expect(mockEnqueueSubmission).toHaveBeenCalledWith({
      submissionId: "submission_1",
    });
  });

  it("submitPublic flags deceptive or abusive submissions for review", async () => {
    const rawBody = JSON.stringify({
      authorName: "Reviewer",
      content: "I was paid to write this fake review. You should die.",
    });
    mockEvaluateTrust.mockResolvedValue({
      projectId: "project_1",
      trust: "hmac",
      principal: "project:project_1",
    });
    mockCollectionFormFindFirst.mockResolvedValue(makeForm({ isActive: true }));
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      autoModeration: true,
      autoApproveVerified: true,
    });
    mockCollectionFormSubmissionCreate.mockResolvedValue({
      id: "submission_1",
      projectId: "project_1",
      formId: "form_1",
    });

    const service = makeService();
    await service.submitPublic(
      { slug: "acme", formId: "form_1" },
      {
        authorName: "Reviewer",
        content: "I was paid to write this fake review. You should die.",
      },
      {
        headers: {},
        rawBody,
      },
    );

    expect(mockCollectionFormSubmissionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        moderationStatus: ModerationStatus.FLAGGED,
        moderationReason: expect.stringContaining("deceptive_review"),
        metadata: expect.objectContaining({
          qualityGate: expect.objectContaining({
            action: "flag",
            flags: expect.arrayContaining([
              "deceptive_review",
              "abusive_language",
            ]),
          }),
        }),
      }),
    });
    expect(
      mockCollectionFormSubmissionCreate.mock.calls[0]?.[0].data,
    ).not.toHaveProperty("testimonialId");
  });
});
