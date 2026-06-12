import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac } from "node:crypto";
import { ModerationStatus } from "@workspace/database/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicSubmitTrustService } from "./public-submit-trust.service.js";
import { ResponsesService } from "./responses.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import type { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { SubmissionPrivateMetadataService } from "./submission-private-metadata.service.js";
import { hashIdempotencyPayload } from "./responses.dto.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { RedisService } from "../redis/redis.service.js";
import type { SigningSecretService } from "../projects/signing-secret.service.js";
import type { NotificationsService } from "../notifications/notifications.service.js";
import type { SubmissionModerationService } from "../submission-moderation/submission-moderation.service.js";

const mockProjectFindUnique = vi.fn();
const mockCollectionFormSubmissionCount = vi.fn();
const mockCollectionFormSubmissionFindMany = vi.fn();
const mockCollectionFormSubmissionFindFirst = vi.fn();
const mockCollectionFormSubmissionUpdate = vi.fn();
const mockCollectionFormUpsert = vi.fn();
const mockCollectionFormSubmissionCreate = vi.fn();
const mockAnnotationCreate = vi.fn();
const mockProjectAnalyticsDailyUpsert = vi.fn();
const mockTransaction = vi.fn();
const mockCreatePrivateMetadataForPublicSubmit = vi.fn();
const mockDecryptAuthorEmail = vi.fn();
const mockIdempotencyCreate = vi.fn();
const mockIdempotencyFindUnique = vi.fn();
const mockIdempotencyUpdate = vi.fn();
const mockProjectTrustedOriginFindFirst = vi.fn();
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisScan = vi.fn();
const mockRedisDel = vi.fn();
const mockTrustEvaluate = vi.fn();
const mockSigningSecretGetDecrypted = vi.fn();
const mockSigningSecretGetActiveDecrypted = vi.fn();
const mockSigningSecretMarkUsed = vi.fn();
const mockActionAuditRecordWith = vi.fn();
const mockCreateForProjectReviewers = vi.fn();
const mockEnqueueSubmission = vi.fn();

const prismaMock = {
  client: {
    $transaction: mockTransaction,
    project: {
      findUnique: mockProjectFindUnique,
    },
    collectionForm: {
      upsert: mockCollectionFormUpsert,
    },
    collectionFormSubmission: {
      count: mockCollectionFormSubmissionCount,
      findMany: mockCollectionFormSubmissionFindMany,
      findFirst: mockCollectionFormSubmissionFindFirst,
      update: mockCollectionFormSubmissionUpdate,
      create: mockCollectionFormSubmissionCreate,
    },
    collectionFormSubmissionAnnotation: {
      create: mockAnnotationCreate,
    },
    projectAnalyticsDaily: {
      upsert: mockProjectAnalyticsDailyUpsert,
    },
    publicSubmitIdempotency: {
      create: mockIdempotencyCreate,
      findUnique: mockIdempotencyFindUnique,
      update: mockIdempotencyUpdate,
    },
    projectTrustedOrigin: {
      findFirst: mockProjectTrustedOriginFindFirst,
    },
  },
} as unknown as PrismaService;

const redisServiceMock = {
  redis: {
    get: mockRedisGet,
    set: mockRedisSet,
    scan: mockRedisScan,
    del: mockRedisDel,
  },
} as unknown as RedisService;

const trustServiceMock = {
  evaluate: mockTrustEvaluate,
  getClientIp: (request: { ip?: string }) => request.ip ?? "unknown",
} as unknown as PublicSubmitTrustService;

const privateMetadataServiceMock = {
  createForPublicSubmit: mockCreatePrivateMetadataForPublicSubmit,
  decryptAuthorEmail: mockDecryptAuthorEmail,
} as unknown as SubmissionPrivateMetadataService;

const actionAuditServiceMock = {
  recordWith: mockActionAuditRecordWith,
} as unknown as ProjectActionAuditService;

const signingSecretServiceMock = {
  getDecrypted: mockSigningSecretGetDecrypted,
  getActiveDecrypted: mockSigningSecretGetActiveDecrypted,
  markUsed: mockSigningSecretMarkUsed,
} as unknown as SigningSecretService;

const notificationsServiceMock = {
  createForProjectReviewers: mockCreateForProjectReviewers,
} as unknown as NotificationsService;

const submissionModerationServiceMock = {
  enqueueSubmission: mockEnqueueSubmission,
} as unknown as SubmissionModerationService;

const agentActor: ActorContext = {
  actorType: "agent_key",
  userId: "user_1",
  projectId: "project_1",
  credentialId: "agent_key_1",
  scopes: ["responses:annotate", "responses:moderate"],
  clerkOrgPermissions: [],
};

function makeSubmissionRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "submission_1",
    projectId: "project_1",
    formId: "form_direct",
    trustMode: "HMAC",
    idempotencyKey: "idem_1",
    payloadHash: "hash_1",
    answers: {
      authorName: "Ava",
      content: "Great product",
      type: "TEXT",
    },
    ratingValue: null,
    ratingScale: null,
    moderationStatus: ModerationStatus.PENDING,
    moderationReason: null,
    moderatedByActorType: null,
    moderatedByActorId: null,
    moderatedAt: null,
    metadata: null,
    createdAt: new Date("2026-04-30T00:00:00.000Z"),
    updatedAt: new Date("2026-04-30T00:00:00.000Z"),
    collectionForm: {
      id: "form_direct",
      name: "Direct submissions",
    },
    annotations: [],
    moderationRuns: [],
    privateMetadata: null,
    mediaAssets: [],
    ...overrides,
  };
}

describe("PublicSubmitTrustService", () => {
  let service: PublicSubmitTrustService;

  beforeEach(() => {
    service = new PublicSubmitTrustService(
      prismaMock,
      signingSecretServiceMock,
    );
    vi.clearAllMocks();
  });

  it("accepts a valid signed request with bare base64 signature", async () => {
    const rawBody = Buffer.from('{"authorName":"Ava"}', "utf8");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const secret = "test-signing-secret";
    const signature = createHmac("sha256", secret)
      .update(`v1.${timestamp}.${rawBody.toString("utf8")}`)
      .digest("base64");
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      allowedOrigins: [],
    });
    mockSigningSecretGetActiveDecrypted.mockResolvedValue({
      id: "secret_1",
      plaintext: secret,
    });

    const result = await service.evaluate(
      {
        headers: {
          "x-semblia-signature": signature,
          "x-semblia-timestamp": timestamp,
        },
        rawBody,
        ip: "203.0.113.10",
      },
      "acme",
    );

    expect(result).toMatchObject({
      projectId: "project_1",
      slug: "acme",
      trust: "hmac",
      principal: "project:project_1",
      signingSecretId: "secret_1",
    });
    expect(mockSigningSecretMarkUsed).toHaveBeenCalledWith(
      "secret_1",
      "203.0.113.10",
    );
  });

  it("rejects signed requests with stale timestamps", async () => {
    const rawBody = Buffer.from('{"authorName":"Ava"}', "utf8");
    const timestamp = "1700000000";
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      allowedOrigins: [],
    });
    mockSigningSecretGetActiveDecrypted.mockResolvedValue({
      id: "secret_1",
      plaintext: "test-signing-secret",
    });

    await expect(
      service.evaluate(
        {
          headers: {
            "x-semblia-signature": "invalid",
            "x-semblia-timestamp": timestamp,
          },
          rawBody,
          ip: "203.0.113.10",
        },
        "acme",
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects malformed signed requests without falling through to origin trust", async () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      allowedOrigins: ["https://allowed.example"],
    });
    mockProjectTrustedOriginFindFirst.mockResolvedValue(null);

    await expect(
      service.evaluate(
        {
          headers: {
            "x-semblia-signature": "%%%",
            "x-semblia-timestamp": timestamp,
            origin: "https://allowed.example",
          },
          rawBody: Buffer.from("{}", "utf8"),
          ip: "203.0.113.10",
        },
        "acme",
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("accepts an allowed explicit origin", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      allowedOrigins: ["https://allowed.example"],
    });

    const result = await service.evaluate(
      {
        headers: {
          origin: "https://allowed.example",
        },
        rawBody: Buffer.from("{}", "utf8"),
        ip: "203.0.113.10",
      },
      "acme",
    );

    expect(result).toMatchObject({
      trust: "origin",
      principal: "203.0.113.10",
    });
  });

  it("accepts the derived default hosted origin", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      allowedOrigins: [],
    });

    const result = await service.evaluate(
      {
        headers: {
          origin: "https://acme.testimonials.semblia.com",
        },
        rawBody: Buffer.from("{}", "utf8"),
        ip: "203.0.113.10",
      },
      "acme",
    );

    expect(result).toMatchObject({
      trust: "origin",
      principal: "203.0.113.10",
    });

    await expect(
      service.evaluate(
        {
          headers: {
            origin: "https://acme.collect.semblia.com",
          },
          rawBody: Buffer.from("{}", "utf8"),
          ip: "203.0.113.11",
        },
        "acme",
      ),
    ).resolves.toMatchObject({
      trust: "origin",
      principal: "203.0.113.11",
    });
  });
});

describe("ResponsesService", () => {
  let service: ResponsesService;

  beforeEach(() => {
    service = new ResponsesService(
      prismaMock,
      redisServiceMock,
      trustServiceMock,
      privateMetadataServiceMock,
      actionAuditServiceMock,
      undefined,
      notificationsServiceMock,
      submissionModerationServiceMock,
    );
    vi.clearAllMocks();
    mockCreatePrivateMetadataForPublicSubmit.mockResolvedValue(null);
    mockEnqueueSubmission.mockResolvedValue([]);
    mockDecryptAuthorEmail.mockReturnValue(null);
    mockCollectionFormUpsert.mockResolvedValue({ id: "form_direct" });
    mockCollectionFormSubmissionCount.mockResolvedValue(0);
    mockCollectionFormSubmissionFindMany.mockResolvedValue([]);
    mockCollectionFormSubmissionFindFirst.mockResolvedValue(null);
    mockCollectionFormSubmissionCreate.mockResolvedValue({
      id: "submission_1",
      projectId: "project_1",
      formId: "form_direct",
    });
    mockCollectionFormSubmissionUpdate.mockImplementation(async ({ data }) => ({
      ...makeSubmissionRecord(),
      moderationStatus: data.moderationStatus ?? ModerationStatus.PENDING,
    }));
    mockProjectAnalyticsDailyUpsert.mockResolvedValue({});
    mockTransaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(prismaMock.client),
    );
  });

  it("lists response moderation run summaries without raw provider output", async () => {
    mockCollectionFormSubmissionCount.mockResolvedValue(1);
    mockCollectionFormSubmissionFindMany.mockResolvedValue([
      makeSubmissionRecord({
        id: "submission_1",
        moderationRuns: [
          {
            id: "run_1",
            artifactType: "IMAGE",
            provider: "aws-rekognition",
            providerOperation: "DetectModerationLabels",
            status: "SUCCEEDED",
            decision: "REVIEW",
            score: 0.82,
            flags: ["violence"],
            categories: { violence: 0.82 },
            errorCode: null,
            errorMessage: null,
            rawResult: { private: true },
            providerJobId: "aws-job-1",
            createdAt: new Date("2026-06-01T10:00:00.000Z"),
            completedAt: new Date("2026-06-01T10:01:00.000Z"),
          },
        ],
      }),
    ]);

    const result = await service.list(
      {
        status: "ALL",
        sort: "newest",
        page: 1,
        pageSize: 10,
      },
      { projectAccess: { projectId: "project_1" } },
    );

    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item?.moderationRuns).toEqual([
      {
        id: "run_1",
        artifactType: "IMAGE",
        provider: "aws-rekognition",
        providerOperation: "DetectModerationLabels",
        status: "SUCCEEDED",
        decision: "REVIEW",
        score: 0.82,
        flags: ["violence"],
        categories: { violence: 0.82 },
        reason: null,
        createdAt: "2026-06-01T10:00:00.000Z",
        completedAt: "2026-06-01T10:01:00.000Z",
      },
    ]);
    expect(item?.moderationRuns[0]).not.toHaveProperty("rawResult");
    expect(item?.moderationRuns[0]).not.toHaveProperty("providerJobId");
  });

  it("lets an agent annotate a response without mutating source answers", async () => {
    mockCollectionFormSubmissionFindFirst.mockResolvedValue(
      makeSubmissionRecord(),
    );
    mockAnnotationCreate.mockResolvedValue({
      id: "annotation_1",
      projectId: "project_1",
      submissionId: "submission_1",
      actorType: "agent_key",
      actorId: "agent_key_1",
      note: "Strong candidate",
      labels: ["candidate"],
      sentiment: "positive",
      metadata: { confidence: 0.8 },
      createdAt: new Date("2026-05-08T00:00:00.000Z"),
      updatedAt: new Date("2026-05-08T00:00:00.000Z"),
    });

    await service.createAnnotation(
      { slug: "acme", responseId: "submission_1" },
      {
        note: "Strong candidate",
        labels: ["candidate"],
        sentiment: "positive",
        metadata: { confidence: 0.8 },
      },
      { projectAccess: { projectId: "project_1" } },
      agentActor,
    );

    expect(mockAnnotationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorType: "agent_key",
          actorId: "agent_key_1",
          note: "Strong candidate",
        }),
      }),
    );
    expect(mockCollectionFormSubmissionUpdate).not.toHaveBeenCalled();
    expect(mockActionAuditRecordWith).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        action: "submission.annotated",
        targetId: "submission_1",
      }),
    );
  });

  it("replays the stored response for an idempotent public submit with the same payload hash", async () => {
    mockTrustEvaluate.mockResolvedValue({
      projectId: "project_1",
      slug: "acme",
      trust: "origin",
      principal: "203.0.113.10",
      rateLimitTracker: "project_1:browser:203.0.113.10",
    });
    mockIdempotencyCreate.mockRejectedValue({ code: "P2002" });
    mockIdempotencyFindUnique.mockResolvedValue({
      projectId: "project_1",
      idempotencyKey: "idem-1",
      payloadHash: hashIdempotencyPayload(
        Buffer.from('{"authorName":"Ava","content":"Great product"}', "utf8"),
      ),
      responseStatusCode: 201,
      responseBody: { id: "response_1", authorName: "Ava" },
    });

    const result = await service.createPublic(
      { slug: "acme" },
      {
        authorName: "Ava",
        content: "Great product",
      },
      {
        headers: {
          "idempotency-key": "idem-1",
          origin: "https://allowed.example",
        },
        rawBody: Buffer.from(
          '{"authorName":"Ava","content":"Great product"}',
          "utf8",
        ),
        ip: "203.0.113.10",
      },
    );

    expect(result).toEqual(expect.objectContaining({ id: "response_1" }));
    expect(mockEnqueueSubmission).not.toHaveBeenCalled();
  });

  it("rejects idempotency key reuse with a different payload", async () => {
    mockTrustEvaluate.mockResolvedValue({
      projectId: "project_1",
      slug: "acme",
      trust: "origin",
      principal: "203.0.113.10",
      rateLimitTracker: "project_1:browser:203.0.113.10",
    });
    mockIdempotencyCreate.mockRejectedValue({ code: "P2002" });
    mockIdempotencyFindUnique.mockResolvedValue({
      projectId: "project_1",
      idempotencyKey: "idem-1",
      payloadHash: "different-payload-hash",
      responseStatusCode: 201,
      responseBody: { id: "response_1", authorName: "Ava" },
    });

    await expect(
      service.createPublic(
        { slug: "acme" },
        {
          authorName: "Ava",
          content: "Great product",
        },
        {
          headers: {
            "idempotency-key": "idem-1",
            origin: "https://allowed.example",
          },
          rawBody: Buffer.from(
            '{"authorName":"Ava","content":"Great product"}',
            "utf8",
          ),
          ip: "203.0.113.10",
        },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it("rejects idempotency replay while the first matching request is still processing", async () => {
    mockTrustEvaluate.mockResolvedValue({
      projectId: "project_1",
      slug: "acme",
      trust: "origin",
      principal: "203.0.113.10",
      rateLimitTracker: "project_1:browser:203.0.113.10",
    });
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      autoModeration: true,
      autoApproveVerified: true,
    });
    mockIdempotencyCreate.mockRejectedValue({ code: "P2002" });
    mockIdempotencyFindUnique.mockResolvedValue({
      projectId: "project_1",
      idempotencyKey: "idem-1",
      payloadHash: hashIdempotencyPayload(
        Buffer.from('{"authorName":"Ava","content":"Great product"}', "utf8"),
      ),
      responseStatusCode: 201,
      responseBody: {},
    });

    await expect(
      service.createPublic(
        { slug: "acme" },
        {
          authorName: "Ava",
          content: "Great product",
        },
        {
          headers: {
            "idempotency-key": "idem-1",
            origin: "https://allowed.example",
          },
          rawBody: Buffer.from(
            '{"authorName":"Ava","content":"Great product"}',
            "utf8",
          ),
          ip: "203.0.113.10",
        },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it("stores trusted HMAC public response submits as canonical submissions without creating response projections", async () => {
    mockTrustEvaluate.mockResolvedValue({
      projectId: "project_1",
      slug: "acme",
      trust: "hmac",
      principal: "project:project_1",
      rateLimitTracker: "project_1:hmac:project:project_1",
    });
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      autoModeration: true,
      autoApproveVerified: false,
    });
    mockIdempotencyCreate.mockResolvedValue({ id: "idem_row_1" });
    const result = await service.createPublic(
      { slug: "acme" },
      {
        authorName: "Ava",
        authorEmail: "ava@example.com",
        content: "Great product",
      },
      {
        headers: {
          "idempotency-key": "idem-1",
          "user-agent": "Vitest",
        },
        rawBody: Buffer.from(
          '{"authorName":"Ava","content":"Great product"}',
          "utf8",
        ),
        ip: "203.0.113.10",
      },
    );

    expect(result).toMatchObject({
      id: "submission_1",
      projectId: "project_1",
      formId: "form_direct",
      authorName: "Ava",
      content: "Great product",
      moderationStatus: ModerationStatus.APPROVED,
    });
    expect(mockCollectionFormUpsert).toHaveBeenCalledWith({
      where: {
        projectId_slug: {
          projectId: "project_1",
          slug: "direct-submissions",
        },
      },
      create: expect.objectContaining({
        projectId: "project_1",
        slug: "direct-submissions",
        name: "Direct submissions",
      }),
      update: {},
      select: { id: true },
    });
    expect(mockCollectionFormSubmissionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        formId: "form_direct",
        signingSecretId: null,
        trustMode: "HMAC",
        idempotencyKey: "idem-1",
        payloadHash: hashIdempotencyPayload(
          Buffer.from('{"authorName":"Ava","content":"Great product"}', "utf8"),
        ),
        ratingValue: null,
        ratingScale: null,
        moderationStatus: ModerationStatus.APPROVED,
        answers: expect.not.objectContaining({
          authorEmail: "ava@example.com",
        }),
      }),
    });
    expect(mockCollectionFormSubmissionCreate).toHaveBeenCalledWith({
      data: expect.not.objectContaining({
        testimonialId: expect.any(String),
      }),
    });
    expect(mockProjectAnalyticsDailyUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ formSubmissions: 1 }),
        update: { formSubmissions: { increment: 1 } },
      }),
    );
    expect(mockCreatePrivateMetadataForPublicSubmit).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        submissionId: "submission_1",
        authorEmail: "ava@example.com",
        ipAddress: "203.0.113.10",
        userAgent: "Vitest",
      }),
    );
    expect(mockIdempotencyUpdate).toHaveBeenCalled();
    expect(mockIdempotencyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        surface: "DIRECT_SUBMISSION",
        idempotencyKey: "idem-1",
      }),
    });
    expect(mockIdempotencyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submissionId: "submission_1",
          responseBody: expect.not.objectContaining({
            authorEmail: "ava@example.com",
            testimonialId: expect.any(String),
          }),
        }),
      }),
    );
    expect(mockCreateForProjectReviewers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "SUBMISSION_CREATED",
        link: "/projects/acme/responses/submission_1",
        metadata: expect.objectContaining({
          projectId: "project_1",
          submissionId: "submission_1",
        }),
      }),
    );
    expect(mockEnqueueSubmission).toHaveBeenCalledWith({
      submissionId: "submission_1",
    });
  });

  it("auto-approves verified origin submissions only when the project allows it", async () => {
    mockTrustEvaluate.mockResolvedValue({
      projectId: "project_1",
      slug: "acme",
      trust: "origin",
      principal: "203.0.113.10",
      rateLimitTracker: "project_1:browser:203.0.113.10",
    });
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      autoModeration: true,
      autoApproveVerified: true,
    });
    await service.createPublic(
      { slug: "acme" },
      {
        authorName: "Ava",
        content: "Great product",
        isOAuthVerified: true,
        oauthProvider: "google",
      },
      {
        headers: {
          origin: "https://allowed.example",
        },
        rawBody: Buffer.from(
          '{"authorName":"Ava","content":"Great product","isOAuthVerified":true,"oauthProvider":"google"}',
          "utf8",
        ),
        ip: "203.0.113.10",
      },
    );

    expect(mockCollectionFormSubmissionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        moderationStatus: ModerationStatus.APPROVED,
        answers: expect.objectContaining({
          isOAuthVerified: true,
          oauthProvider: "google",
        }),
      }),
    });
  });

  it("returns the cached public list response when present", async () => {
    mockRedisGet.mockResolvedValue(
      JSON.stringify({
        items: [{ id: "response_1", authorName: "Ava" }],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }),
    );

    const result = await service.listPublic(
      { slug: "acme" },
      { page: 1, pageSize: 20 },
    );

    expect(result.items).toEqual([{ id: "response_1", authorName: "Ava" }]);
    expect(mockCollectionFormSubmissionFindMany).not.toHaveBeenCalled();
  });

  it("projects only safe public fields in the computed public list", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockProjectFindUnique.mockResolvedValue({ id: "project_1", slug: "acme" });
    mockCollectionFormSubmissionCount.mockResolvedValue(1);
    mockCollectionFormSubmissionFindMany.mockResolvedValue([
      makeSubmissionRecord({
        id: "submission_1",
        answers: {
          authorName: "Ava",
          authorRole: "Founder",
          authorCompany: "Acme",
          content: "Great product",
          type: "TEXT",
          source: "manual",
          isOAuthVerified: true,
          oauthProvider: "google",
        },
        ratingValue: 5,
        moderationStatus: ModerationStatus.APPROVED,
        metadata: {
          qualityFlags: ["flag"],
          qualityScore: 0.2,
        },
      }),
    ]);

    const result = await service.listPublic(
      { slug: "acme" },
      { page: 1, pageSize: 20 },
    );

    expect(result.items[0]).toEqual({
      id: "submission_1",
      projectId: "project_1",
      authorName: "Ava",
      authorRole: "Founder",
      authorCompany: "Acme",
      authorAvatar: null,
      content: "Great product",
      type: "TEXT",
      video: null,
      media: null,
      source: "manual",
      sourceUrl: null,
      rating: 5,
      isPublished: true,
      isOAuthVerified: true,
      oauthProvider: "google",
      createdAt: new Date("2026-04-30T00:00:00.000Z"),
    });
    expect(result.items[0]).not.toHaveProperty("authorEmail");
    expect(result.items[0]).not.toHaveProperty("ipAddress");
    expect(result.items[0]).not.toHaveProperty("userAgent");
    expect(result.items[0]).not.toHaveProperty("oauthSubject");
    expect(result.items[0]).not.toHaveProperty("moderationFlags");
    expect(result.items[0]).not.toHaveProperty("moderationScore");
    expect(mockRedisSet).toHaveBeenCalledWith(
      "v2:responses:public:acme:1:20",
      expect.any(String),
      "EX",
      60,
    );
  });

  it("moderates responses without changing source fields", async () => {
    mockCollectionFormSubmissionFindFirst.mockResolvedValue(
      makeSubmissionRecord({
        id: "submission_1",
        moderationStatus: ModerationStatus.PENDING,
      }),
    );
    mockCollectionFormSubmissionUpdate.mockResolvedValue(
      makeSubmissionRecord({
        id: "submission_1",
        moderationStatus: ModerationStatus.FLAGGED,
        moderationReason: "Needs human review",
      }),
    );
    mockRedisScan.mockResolvedValueOnce([
      "0",
      ["v2:responses:public:acme:1:20"],
    ]);
    mockRedisDel.mockResolvedValue(1);

    await service.moderate(
      { slug: "acme", responseId: "submission_1" },
      {
        status: "FLAGGED",
        reason: "Needs human review",
      },
      { projectAccess: { projectId: "project_1" } },
      agentActor,
    );

    expect(mockCollectionFormSubmissionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          answers: expect.anything(),
          ratingValue: expect.anything(),
          ratingScale: expect.anything(),
        }),
      }),
    );
    expect(mockCollectionFormSubmissionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moderationStatus: ModerationStatus.FLAGGED,
          moderatedByActorType: "agent_key",
          moderatedByActorId: "agent_key_1",
        }),
      }),
    );
    expect(mockRedisScan).toHaveBeenCalled();
    expect(mockRedisDel).toHaveBeenCalledWith("v2:responses:public:acme:1:20");
    expect(mockCreateForProjectReviewers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "SUBMISSION_MODERATED",
        link: "/projects/acme/responses/submission_1",
        metadata: expect.objectContaining({
          projectId: "project_1",
          submissionId: "submission_1",
          status: ModerationStatus.FLAGGED,
        }),
      }),
      { excludeUserIds: ["user_1"] },
      expect.any(Object),
    );
  });
});
