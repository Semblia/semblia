import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { ModerationStatus, TestimonialType } from "@workspace/database/prisma";
import { FormsService } from "./forms.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { RedisService } from "../redis/redis.service.js";
import type { PublicSubmitTrustService } from "../testimonials/public-submit-trust.service.js";
import { hashIdempotencyPayload } from "../testimonials/testimonials.dto.js";

const mockCollectionFormFindMany = vi.fn();
const mockCollectionFormCreate = vi.fn();
const mockCollectionFormFindFirst = vi.fn();
const mockCollectionFormUpdate = vi.fn();
const mockCollectionFormDelete = vi.fn();
const mockProjectFindUnique = vi.fn();
const mockPublicSubmitIdempotencyCreate = vi.fn();
const mockPublicSubmitIdempotencyFindUnique = vi.fn();
const mockPublicSubmitIdempotencyUpdate = vi.fn();
const mockTestimonialCreate = vi.fn();
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
const mockRedisScan = vi.fn();
const mockEvaluateTrust = vi.fn();
const mockGetClientIp = vi.fn();

const prismaMock = {
  client: {
    collectionForm: {
      findMany: mockCollectionFormFindMany,
      create: mockCollectionFormCreate,
      findFirst: mockCollectionFormFindFirst,
      update: mockCollectionFormUpdate,
      delete: mockCollectionFormDelete,
    },
    project: {
      findUnique: mockProjectFindUnique,
    },
    testimonial: {
      create: mockTestimonialCreate,
    },
    publicSubmitIdempotency: {
      create: mockPublicSubmitIdempotencyCreate,
      findUnique: mockPublicSubmitIdempotencyFindUnique,
      update: mockPublicSubmitIdempotencyUpdate,
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

function makeService() {
  return new FormsService(prismaMock, redisMock, trustServiceMock);
}

function makeForm(overrides: Record<string, unknown> = {}) {
  return {
    id: "form_1",
    projectId: "project_1",
    name: "Default Form",
    description: "Primary form",
    isActive: false,
    abWeight: 0,
    config: { content: { headerTitle: "Hello" } },
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-02T00:00:00.000Z"),
    ...overrides,
  };
}

function makeTestimonial(overrides: Record<string, unknown> = {}) {
  return {
    id: "testimonial_1",
    projectId: "project_1",
    userId: null,
    authorName: "Ada",
    authorEmail: "ada@example.com",
    authorRole: "Founder",
    authorCompany: "Acme",
    authorAvatar: null,
    content: "Loved it",
    type: TestimonialType.TEXT,
    videoUrl: null,
    mediaUrl: null,
    source: null,
    sourceUrl: null,
    isPublished: false,
    rating: 10,
    isApproved: true,
    isOAuthVerified: true,
    oauthProvider: "google",
    moderationStatus: ModerationStatus.APPROVED,
    moderationScore: null,
    moderationFlags: null,
    autoPublished: true,
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z"),
    formId: "form_1",
    ...overrides,
  };
}

describe("FormsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisScan.mockResolvedValue(["0", []]);
    mockGetClientIp.mockReturnValue("198.51.100.10");
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

  it("create returns authenticated dto with stub metrics", async () => {
    mockCollectionFormCreate.mockResolvedValue(makeForm());

    const service = makeService();
    const result = await service.create(
      { slug: "acme" },
      {
        name: "Default Form",
        description: "",
        isActive: false,
        abWeight: 0,
        config: { content: { headerTitle: "Hello" } },
      },
      { projectAccess: { projectId: "project_1" } },
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
    expect(result).toEqual({
      data: [
        {
          id: "form_1",
          name: "Default Form",
          description: "Primary form",
          isActive: true,
          abWeight: 0,
          config: { content: { headerTitle: "Hello" } },
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
        },
      ],
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

  it("submitPublic creates an approved auto-published testimonial for hmac trust", async () => {
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
    mockTestimonialCreate.mockResolvedValue(makeTestimonial());

    const service = makeService();
    const result = await service.submitPublic(
      { slug: "acme", formId: "form_1" },
      {
        authorName: "Ada",
        authorEmail: "ada@example.com",
        content: "Loved it",
        rating: 10,
        isOAuthVerified: true,
      },
      {
        headers: { "user-agent": "Vitest" },
        rawBody: JSON.stringify({ authorName: "Ada", content: "Loved it" }),
      },
    );

    expect(mockTestimonialCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          formId: "form_1",
          moderationStatus: ModerationStatus.APPROVED,
          autoPublished: true,
        }),
      }),
    );
    expect(result).toMatchObject({
      formId: "form_1",
      moderationStatus: ModerationStatus.APPROVED,
      autoPublished: true,
    });
    expect(mockRedisScan).toHaveBeenCalled();
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
    mockTestimonialCreate
      .mockResolvedValueOnce(makeTestimonial())
      .mockResolvedValueOnce(
        makeTestimonial({
          id: "testimonial_2",
          moderationStatus: ModerationStatus.PENDING,
          isApproved: false,
          autoPublished: false,
        }),
      );

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
      responseBody: { id: "testimonial_cached" },
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
    ).resolves.toEqual({ id: "testimonial_cached" });
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
});
