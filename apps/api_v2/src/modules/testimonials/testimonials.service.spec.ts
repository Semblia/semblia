import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac } from "node:crypto";
import { ModerationStatus, TestimonialType } from "@workspace/database/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicSubmitTrustService } from "./public-submit-trust.service.js";
import { TestimonialsService } from "./testimonials.service.js";
import { hashIdempotencyPayload } from "./testimonials.dto.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { RedisService } from "../redis/redis.service.js";
import type { SigningSecretService } from "../projects/signing-secret.service.js";

const mockProjectFindUnique = vi.fn();
const mockTestimonialFindMany = vi.fn();
const mockTestimonialCount = vi.fn();
const mockTestimonialFindFirst = vi.fn();
const mockTestimonialUpdate = vi.fn();
const mockTestimonialCreate = vi.fn();
const mockIdempotencyCreate = vi.fn();
const mockIdempotencyFindUnique = vi.fn();
const mockIdempotencyUpdate = vi.fn();
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisScan = vi.fn();
const mockRedisDel = vi.fn();
const mockTrustEvaluate = vi.fn();
const mockSigningSecretGetDecrypted = vi.fn();

const prismaMock = {
  client: {
    project: {
      findUnique: mockProjectFindUnique,
    },
    testimonial: {
      findMany: mockTestimonialFindMany,
      count: mockTestimonialCount,
      findFirst: mockTestimonialFindFirst,
      update: mockTestimonialUpdate,
      create: mockTestimonialCreate,
    },
    publicSubmitIdempotency: {
      create: mockIdempotencyCreate,
      findUnique: mockIdempotencyFindUnique,
      update: mockIdempotencyUpdate,
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

const signingSecretServiceMock = {
  getDecrypted: mockSigningSecretGetDecrypted,
} as unknown as SigningSecretService;

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
    mockSigningSecretGetDecrypted.mockResolvedValue(secret);

    const result = await service.evaluate(
      {
        headers: {
          "x-tresta-signature": signature,
          "x-tresta-timestamp": timestamp,
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
    });
  });

  it("rejects signed requests with stale timestamps", async () => {
    const rawBody = Buffer.from('{"authorName":"Ava"}', "utf8");
    const timestamp = "1700000000";
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "acme",
      allowedOrigins: [],
    });
    mockSigningSecretGetDecrypted.mockResolvedValue("test-signing-secret");

    await expect(
      service.evaluate(
        {
          headers: {
            "x-tresta-signature": "invalid",
            "x-tresta-timestamp": timestamp,
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

    await expect(
      service.evaluate(
        {
          headers: {
            "x-tresta-signature": "%%%",
            "x-tresta-timestamp": timestamp,
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
          origin: "https://acme.testimonials.tresta.app",
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
});

describe("TestimonialsService", () => {
  let service: TestimonialsService;

  beforeEach(() => {
    service = new TestimonialsService(
      prismaMock,
      redisServiceMock,
      trustServiceMock,
    );
    vi.clearAllMocks();
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
      responseBody: { id: "testimonial_1", authorName: "Ava" },
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

    expect(result).toEqual(expect.objectContaining({ id: "testimonial_1" }));
    expect(mockTestimonialCreate).not.toHaveBeenCalled();
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
      responseBody: { id: "testimonial_1", authorName: "Ava" },
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

  it("auto-approves and auto-publishes trusted HMAC submissions when auto moderation is enabled", async () => {
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
    mockTestimonialCreate.mockResolvedValue({
      id: "testimonial_1",
      projectId: "project_1",
      userId: null,
      authorName: "Ava",
      authorEmail: null,
      authorRole: null,
      authorCompany: null,
      authorAvatar: null,
      content: "Great product",
      type: TestimonialType.TEXT,
      videoUrl: null,
      mediaUrl: null,
      source: null,
      sourceUrl: null,
      isPublished: false,
      rating: null,
      isApproved: true,
      isOAuthVerified: false,
      oauthProvider: null,
      moderationStatus: ModerationStatus.APPROVED,
      moderationScore: null,
      moderationFlags: null,
      autoPublished: true,
      createdAt: new Date("2026-04-30T00:00:00.000Z"),
      updatedAt: new Date("2026-04-30T00:00:00.000Z"),
    });

    await service.createPublic(
      { slug: "acme" },
      {
        authorName: "Ava",
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

    expect(mockTestimonialCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moderationStatus: ModerationStatus.APPROVED,
          isApproved: true,
          autoPublished: true,
          ipAddress: "203.0.113.10",
          userAgent: "Vitest",
        }),
      }),
    );
    expect(mockIdempotencyUpdate).toHaveBeenCalled();
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
    mockTestimonialCreate.mockResolvedValue({
      id: "testimonial_1",
      projectId: "project_1",
      userId: null,
      authorName: "Ava",
      authorEmail: null,
      authorRole: null,
      authorCompany: null,
      authorAvatar: null,
      content: "Great product",
      type: TestimonialType.TEXT,
      videoUrl: null,
      mediaUrl: null,
      source: null,
      sourceUrl: null,
      isPublished: false,
      rating: null,
      isApproved: true,
      isOAuthVerified: true,
      oauthProvider: "google",
      moderationStatus: ModerationStatus.APPROVED,
      moderationScore: null,
      moderationFlags: null,
      autoPublished: true,
      createdAt: new Date("2026-04-30T00:00:00.000Z"),
      updatedAt: new Date("2026-04-30T00:00:00.000Z"),
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

    expect(mockTestimonialCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moderationStatus: ModerationStatus.APPROVED,
          isApproved: true,
          autoPublished: true,
          isOAuthVerified: true,
          oauthProvider: "google",
        }),
      }),
    );
  });

  it("returns the cached public list response when present", async () => {
    mockRedisGet.mockResolvedValue(
      JSON.stringify({
        items: [{ id: "testimonial_1", authorName: "Ava" }],
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

    expect(result.items).toEqual([{ id: "testimonial_1", authorName: "Ava" }]);
    expect(mockTestimonialFindMany).not.toHaveBeenCalled();
  });

  it("projects only safe public fields in the computed public list", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockProjectFindUnique.mockResolvedValue({ id: "project_1", slug: "acme" });
    mockTestimonialCount.mockResolvedValue(1);
    mockTestimonialFindMany.mockResolvedValue([
      {
        id: "testimonial_1",
        projectId: "project_1",
        authorName: "Ava",
        authorEmail: "private@example.com",
        authorRole: "Founder",
        authorCompany: "Acme",
        authorAvatar: null,
        content: "Great product",
        type: TestimonialType.TEXT,
        videoUrl: null,
        mediaUrl: null,
        source: "manual",
        sourceUrl: null,
        rating: 5,
        isPublished: true,
        isOAuthVerified: true,
        oauthProvider: "google",
        oauthSubject: "private-subject",
        ipAddress: "203.0.113.10",
        userAgent: "private-agent",
        moderationFlags: ["flag"],
        moderationScore: 0.2,
        createdAt: new Date("2026-04-30T00:00:00.000Z"),
      },
    ]);

    const result = await service.listPublic(
      { slug: "acme" },
      { page: 1, pageSize: 20 },
    );

    expect(result.items[0]).toEqual({
      id: "testimonial_1",
      projectId: "project_1",
      authorName: "Ava",
      authorRole: "Founder",
      authorCompany: "Acme",
      authorAvatar: null,
      content: "Great product",
      type: TestimonialType.TEXT,
      videoUrl: null,
      mediaUrl: null,
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
      "v2:testimonials:public:acme:1:20",
      expect.any(String),
      "EX",
      60,
    );
  });

  it("forces approval when publishing an unapproved testimonial", async () => {
    mockTestimonialFindFirst.mockResolvedValue({
      id: "testimonial_1",
      projectId: "project_1",
    });
    mockTestimonialUpdate.mockResolvedValue({
      id: "testimonial_1",
      projectId: "project_1",
      userId: null,
      authorName: "Ava",
      authorEmail: null,
      authorRole: null,
      authorCompany: null,
      authorAvatar: null,
      content: "Great product",
      type: TestimonialType.TEXT,
      videoUrl: null,
      mediaUrl: null,
      source: null,
      sourceUrl: null,
      isPublished: true,
      rating: null,
      isApproved: true,
      isOAuthVerified: false,
      oauthProvider: null,
      moderationStatus: ModerationStatus.APPROVED,
      moderationScore: null,
      moderationFlags: null,
      autoPublished: false,
      createdAt: new Date("2026-04-30T00:00:00.000Z"),
      updatedAt: new Date("2026-04-30T00:00:00.000Z"),
    });
    mockRedisScan.mockResolvedValueOnce([
      "0",
      ["v2:testimonials:public:acme:1:20"],
    ]);
    mockRedisDel.mockResolvedValue(1);

    await service.publish(
      { slug: "acme", testimonialId: "testimonial_1" },
      { published: true },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockTestimonialUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isPublished: true,
          moderationStatus: ModerationStatus.APPROVED,
          isApproved: true,
        }),
      }),
    );
    expect(mockRedisScan).toHaveBeenCalled();
    expect(mockRedisDel).toHaveBeenCalledWith(
      "v2:testimonials:public:acme:1:20",
    );
  });
});
