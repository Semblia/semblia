import { ConflictException, UnauthorizedException } from "@nestjs/common";
import {
  FormModerationArtifactType,
  FormModerationRunStatus,
} from "@workspace/database/prisma";
import { describe, expect, it, vi } from "vitest";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { NoopModerationClient } from "../submission-moderation/providers/noop-moderation.client.js";
import { SubmissionModerationService } from "../submission-moderation/submission-moderation.service.js";
import {
  formSubmitIdempotencyWhere,
  replayCompletedPublicSubmit,
} from "./public-submit-idempotency.js";
import { PublicSubmitTrustService } from "./public-submit-trust.service.js";
import { ResponsesService } from "./responses.service.js";
import { compileSnapshot, createFormTemplate } from "@workspace/forms-core";
import { PublicHostingObservabilityService } from "../public-surfaces/public-hosting-observability.service.js";

function makeResponse(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-05-26T10:00:00.000Z");
  return {
    id: "response_1",
    projectId: "project_1",
    formId: "form_1",
    versionId: "version_1",
    version: 1,
    trustMode: "ORIGIN",
    answers: [
      {
        fieldId: "testimonial",
        type: "longText",
        role: "primaryText",
        labelSnapshot: "Testimonial",
        value: "Semblia helped us ship.",
        private: false,
        publishable: true,
        usedInWidget: true,
      },
      {
        fieldId: "email",
        type: "email",
        role: "authorEmail",
        labelSnapshot: "Email",
        value: "ada@example.com",
        private: true,
        publishable: false,
        usedInWidget: false,
      },
    ],
    ratingValue: 5,
    ratingScale: 5,
    authorName: "Ada Lovelace",
    authorRole: "Founder",
    authorCompany: "Acme",
    authorAvatarAssetId: null,
    consent: {
      canPublishText: true,
      canPublishName: false,
      canPublishRole: true,
      canPublishCompany: true,
      canPublishAvatar: false,
      canEditForClarity: true,
    },
    reviewStatus: "PENDING",
    publishStatus: "PRIVATE",
    moderationReason: null,
    moderatedByActorType: null,
    moderatedByActorId: null,
    moderatedAt: null,
    sourceMetadata: {
      source: "runtime_form",
      snapshotId: "version_1",
      ipHash: "should-not-leak",
      userAgentHash: "should-not-leak",
    },
    createdAt: now,
    updatedAt: now,
    form: {
      id: "form_1",
      name: "Testimonials",
      slug: "testimonials",
      intent: "TESTIMONIAL",
    },
    annotations: [],
    moderationRuns: [],
    ...overrides,
  };
}

function makeResponsesService() {
  const client = {
    $transaction: vi.fn(async (callback) => callback(client)),
    formResponse: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    formResponseAnnotation: { create: vi.fn() },
    formSubmitIdempotency: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    form: { findFirst: vi.fn() },
    formVersion: { findFirst: vi.fn() },
    projectAnalyticsDaily: { upsert: vi.fn() },
    widget: { findMany: vi.fn().mockResolvedValue([]) },
    publicSurfaceHost: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const prisma = { client } as unknown as PrismaService;
  const redis = { redis: { del: vi.fn() } };
  const actionAudit = {
    recordWith: vi.fn(),
  } as unknown as ProjectActionAuditService;
  const privateMetadata = {
    createForPublicSubmit: vi.fn(),
    hashIdentifier: vi.fn((value: string) => `hash:${value}`),
  };

  return {
    service: new ResponsesService(
      prisma,
      redis as never,
      {} as never,
      privateMetadata as never,
      actionAudit,
      {} as never,
      {} as never,
      undefined,
      undefined,
      undefined,
    ),
    client,
    redis,
    actionAudit,
  };
}

describe("ResponsesService Phase 6", () => {
  it("invalidates response-driven wall caches for all live aliases", async () => {
    const { service, client, redis } = makeResponsesService();
    client.widget.findMany.mockResolvedValue([{ id: "widget_1", wallSlug: "proof" }]);
    client.publicSurfaceHost.findMany.mockResolvedValue([
      { hostname: "alpha.walls.semblia.com" },
      { hostname: "alias.walls.semblia.com" },
    ]);
    await (service as unknown as { bustWidgetCaches(projectId: string): Promise<void> })
      .bustWidgetCaches("project_1");
    expect(redis.redis.del).toHaveBeenCalledWith(
      "v2:widgets:embed:widget_1",
      "v2:walls:legacy:proof",
      "v2:walls:public:alpha.walls.semblia.com:project_1:proof",
      "v2:walls:public:alias.walls.semblia.com:project_1:proof",
    );
  });

  it("uses runtime trust at the public upload boundary without customer evaluation", async () => {
    const snapshot = compileSnapshot(createFormTemplate("TESTIMONIAL"), {
      snapshotId: "version_1",
      formId: "form_1",
      projectId: "project_1",
      slug: "contact",
      version: 1,
      publishedAt: "2026-01-01T00:00:00.000Z",
    });
    const intent = vi
      .fn()
      .mockResolvedValue({ uploadUrl: "https://upload.example" });
    const customer = {
      evaluate: vi.fn(),
      getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
    };
    const runtime = {
      verifyAndResolve: vi
        .fn()
        .mockResolvedValue({
          projectId: "project_1",
          canonicalHostname: "acme.forms.semblia.com",
          principal: "forms-runtime:acme.forms.semblia.com",
        }),
    };
    const client = {
      form: {
        findFirst: vi
          .fn()
          .mockResolvedValue({
            id: "form_1",
            projectId: "project_1",
            slug: "contact",
            currentVersion: 1,
            project: { id: "project_1", slug: "acme", allowedOrigins: [] },
          }),
      },
      formVersion: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: "version_1", version: 1, snapshot }),
      },
    };
    const service = new ResponsesService(
      { client } as never,
      {} as never,
      customer as never,
      {} as never,
      {} as never,
      runtime as never,
      { record: vi.fn() } as never,
      { createPublicFormUploadIntent: intent } as never,
    );
    const rawBody = Buffer.from('{ "purpose":"SUBMISSION_ATTACHMENT" }');
    await service.presignRuntimeUpload(
      { slug: "contact" },
      {},
      {
        purpose: "SUBMISSION_ATTACHMENT",
        contentType: "text/plain",
        byteSize: 1,
      },
      {
        method: "POST",
        originalUrl: "/v2/runtime/forms/contact/uploads/presign",
        rawBody,
        headers: { "x-semblia-runtime-host": "acme.forms.semblia.com" },
      },
    );
    expect(runtime.verifyAndResolve).toHaveBeenCalledWith(
      expect.objectContaining({ rawBody }),
      { operation: "UPLOAD_PRESIGN", legacyProjectId: undefined },
    );
    expect(customer.evaluate).not.toHaveBeenCalled();
    expect(intent).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        principal: "forms-runtime:acme.forms.semblia.com",
      }),
    );
  });

  it("persists runtime submit HMAC without a customer signing secret", async () => {
    const snapshot = compileSnapshot(createFormTemplate("TESTIMONIAL"), {
      snapshotId: "version_1",
      formId: "form_1",
      projectId: "project_1",
      slug: "contact",
      version: 1,
      publishedAt: "2026-01-01T00:00:00.000Z",
    });
    const create = vi.fn().mockResolvedValue(makeResponse());
    const customer = {
      evaluate: vi.fn(),
      getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
    };
    const media = { activatePublicSubmitAssets: vi.fn() };
    const runtime = {
      verifyAndResolve: vi
        .fn()
        .mockResolvedValue({
          projectId: "project_1",
          canonicalHostname: "acme.forms.semblia.com",
          principal: "forms-runtime:acme.forms.semblia.com",
        }),
    };
    const client = {
      $transaction: vi.fn(),
      form: {
        findFirst: vi
          .fn()
          .mockResolvedValue({
            id: "form_1",
            projectId: "project_1",
            slug: "contact",
            currentVersion: 1,
            name: "Contact",
            project: { id: "project_1", slug: "acme", allowedOrigins: [] },
          }),
      },
      formVersion: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: "version_1", version: 1, snapshot }),
      },
      formResponse: { create },
      projectAnalyticsDaily: { upsert: vi.fn() },
    };
    client.$transaction.mockImplementation(
      async (fn: (tx: typeof client) => unknown) => fn(client),
    );
    const service = new ResponsesService(
      { client } as never,
      {} as never,
      customer as never,
      {
        createForPublicSubmit: vi.fn(),
        hashIdentifier: vi.fn().mockReturnValue("hash"),
      } as never,
      {} as never,
      runtime as never,
      { record: vi.fn() } as never,
      media as never,
      undefined,
      undefined,
    );
    const rawBody = Buffer.from('{ "answers": {} }');
    await service.submitRuntimeForm(
      { slug: "contact" },
      {},
      {
        answers: {
          rating: 5,
          testimonial: "A sufficiently long testimonial response.",
          name: "Ada",
          consent: true,
        },
      },
      {
        method: "POST",
        originalUrl: "/v2/runtime/forms/contact/submissions",
        rawBody,
        headers: { "x-semblia-runtime-host": "acme.forms.semblia.com" },
      },
    );
    expect(customer.evaluate).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trustMode: "HMAC",
          signingSecretId: null,
          trustedOriginId: null,
        }),
      }),
    );
    expect(media.activatePublicSubmitAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        principal: "forms-runtime:acme.forms.semblia.com",
      }),
    );
  });

  it.each(["submit", "presign"])(
    "keeps cross-project runtime %s opaque and records a safe event",
    async (operation) => {
      const event = vi.fn();
      const customer = { evaluate: vi.fn(), getClientIp: vi.fn() };
      const runtime = {
        verifyAndResolve: vi
          .fn()
          .mockResolvedValue({
            projectId: "project_A",
            canonicalHostname: "a.forms.semblia.com",
            principal: "forms-runtime:a.forms.semblia.com",
          }),
      };
      const client = {
        form: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: "form_B" }),
        },
      };
      const media = {
        createPublicFormUploadIntent: vi.fn(),
        activatePublicSubmitAssets: vi.fn(),
      };
      const service = new ResponsesService(
        { client } as never,
        {} as never,
        customer as never,
        {} as never,
        {} as never,
        runtime as never,
        new PublicHostingObservabilityService(event),
        media as never,
      );
      const request = {
        method: "POST",
        originalUrl:
          operation === "submit"
            ? "/v2/runtime/forms/contact/submissions"
            : "/v2/runtime/forms/contact/uploads/presign",
        rawBody: Buffer.from('{"answers":{"secret":"no"}}'),
        headers: {
          "x-semblia-runtime-host": "a.forms.semblia.com",
          "x-request-id": "bad id!",
          origin: "https://evil.example",
        },
      };
      const invoke =
        operation === "submit"
          ? service.submitRuntimeForm(
              { slug: "contact" },
              {},
              { answers: {} },
              request,
            )
          : service.presignRuntimeUpload(
              { slug: "contact" },
              {},
              {
                purpose: "SUBMISSION_ATTACHMENT",
                contentType: "text/plain",
                byteSize: 1,
              },
              request,
            );
      await expect(invoke).rejects.toMatchObject({
        response: { message: "Form not found", statusCode: 404 },
      });
      expect(customer.evaluate).not.toHaveBeenCalled();
      expect(event).toHaveBeenCalledTimes(1);
      const recorded = event.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(recorded).toMatchObject({
        event: "public_host_cross_project_rejection",
        outcome: "rejected",
        reason: "resource_owner_mismatch",
        hostname: "a.forms.semblia.com",
        projectId: "project_A",
        feature: "COLLECTION",
        metricValue: 1,
      });
      expect(recorded.requestId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(JSON.stringify(recorded)).not.toMatch(
        /contact|form_B|secret|rawBody|signature|origin|payload|bodyHash/i,
      );
      expect(media.createPublicFormUploadIntent).not.toHaveBeenCalled();
      expect(media.activatePublicSubmitAssets).not.toHaveBeenCalled();
    },
  );

  it.each(["submit", "presign"])(
    "stops %s on runtime verifier rejection before form or customer access",
    async (operation) => {
      const customer = { evaluate: vi.fn() };
      const runtime = {
        verifyAndResolve: vi
          .fn()
          .mockRejectedValue(new UnauthorizedException()),
      };
      const formFind = vi.fn();
      const service = new ResponsesService(
        { client: { form: { findFirst: formFind } } } as never,
        {} as never,
        customer as never,
        {} as never,
        {} as never,
        runtime as never,
        { record: vi.fn() } as never,
      );
      const request = {
        method: "POST",
        originalUrl:
          operation === "submit"
            ? "/v2/runtime/forms/contact/submissions?projectId=project_B"
            : "/v2/runtime/forms/contact/uploads/presign?projectId=project_B",
        rawBody: Buffer.from('{"raw":true}'),
        headers: { "x-semblia-runtime-host": "a.forms.semblia.com" },
      };
      const invoke =
        operation === "submit"
          ? service.submitRuntimeForm(
              { slug: "contact" },
              { projectId: "project_B" },
              { answers: {} },
              request,
            )
          : service.presignRuntimeUpload(
              { slug: "contact" },
              { projectId: "project_B" },
              {
                purpose: "SUBMISSION_ATTACHMENT",
                contentType: "text/plain",
                byteSize: 1,
              },
              request,
            );
      await expect(invoke).rejects.toBeInstanceOf(UnauthorizedException);
      expect(runtime.verifyAndResolve).toHaveBeenCalledWith(
        expect.objectContaining({ rawBody: request.rawBody }),
        {
          operation: operation === "submit" ? "SUBMISSION" : "UPLOAD_PRESIGN",
          legacyProjectId: "project_B",
        },
      );
      expect(formFind).not.toHaveBeenCalled();
      expect(customer.evaluate).not.toHaveBeenCalled();
    },
  );

  it("routes runtime submission headers to deployment trust before customer trust", async () => {
    const runtime = {
      verifyAndResolve: vi.fn().mockResolvedValue({
        projectId: "project_runtime",
        canonicalHostname: "acme.forms.semblia.com",
        principal: "forms-runtime:acme.forms.semblia.com",
      }),
    };
    const service = new ResponsesService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      runtime as never,
      { record: vi.fn() } as never,
      undefined,
      undefined,
      undefined,
    );
    const rawBody = Buffer.from('{ "a": 1 }');
    const result = await (
      service as unknown as {
        resolveRuntimeTrust: (
          ...args: unknown[]
        ) => Promise<{ trust?: { trust: string; principal: string } }>;
      }
    ).resolveRuntimeTrust(
      {
        method: "POST",
        originalUrl: "/v2/runtime/forms/contact/submissions",
        rawBody,
        headers: { "x-semblia-runtime-host": "acme.forms.semblia.com" },
      },
      undefined,
      "SUBMISSION",
    );
    expect(runtime.verifyAndResolve).toHaveBeenCalledWith(
      expect.objectContaining({ rawBody }),
      { operation: "SUBMISSION", legacyProjectId: undefined },
    );
    expect(result.trust).toMatchObject({
      trust: "hmac",
      principal: "forms-runtime:acme.forms.semblia.com",
    });
    expect(result.trust).not.toHaveProperty("signingSecretId");
  });

  it("routes partial runtime upload headers to runtime verification without customer fallback", async () => {
    const runtime = {
      verifyAndResolve: vi.fn().mockRejectedValue(new UnauthorizedException()),
    };
    const service = new ResponsesService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      runtime as never,
      { record: vi.fn() } as never,
      undefined,
      undefined,
      undefined,
    );
    await expect(
      (
        service as unknown as {
          resolveRuntimeTrust: (...args: unknown[]) => Promise<unknown>;
        }
      ).resolveRuntimeTrust(
        {
          method: "POST",
          originalUrl: "/v2/runtime/forms/contact/uploads/presign",
          headers: { "x-semblia-runtime-host": "acme.forms.semblia.com" },
        },
        "project_1",
        "UPLOAD_PRESIGN",
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(runtime.verifyAndResolve).toHaveBeenCalledWith(expect.anything(), {
      operation: "UPLOAD_PRESIGN",
      legacyProjectId: "project_1",
    });
  });

  it("returns display-safe response DTOs without private answers or source hashes", async () => {
    const { service, client } = makeResponsesService();
    client.formResponse.count.mockResolvedValue(1);
    client.formResponse.findMany.mockResolvedValue([makeResponse()]);

    const result = await service.list(
      {
        reviewStatus: "ALL",
        publishStatus: "ALL",
        sort: "newest",
        page: 1,
        pageSize: 10,
      },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(result.items[0]).toMatchObject({
      id: "response_1",
      authorName: null,
      authorRole: "Founder",
      authorCompany: "Acme",
      reviewStatus: "PENDING",
      publishStatus: "PRIVATE",
      form: {
        id: "form_1",
        slug: "testimonials",
      },
    });
    expect(result.items[0]?.answers).toEqual([
      expect.objectContaining({
        fieldId: "testimonial",
        role: "primaryText",
        value: "Semblia helped us ship.",
      }),
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /ada@example\.com|authorEmail|ipHash|userAgentHash|should-not-leak/i,
    );
  });

  it("keeps review and publish state independent while consent gates publishing", async () => {
    const { service, client } = makeResponsesService();
    const response = makeResponse({
      consent: {
        canPublishText: true,
        canPublishName: true,
        canPublishRole: true,
        canPublishCompany: true,
        canPublishAvatar: true,
        canEditForClarity: true,
      },
      reviewStatus: "PENDING",
    });
    client.formResponse.findFirst.mockResolvedValue(response);
    client.formResponse.update.mockResolvedValue({
      ...response,
      publishStatus: "PUBLISHED",
    });

    const updated = await service.updatePublish(
      { slug: "acme", responseId: "response_1" },
      { status: "PUBLISHED" },
      { projectAccess: { projectId: "project_1" } },
      {
        actorType: "user",
        userId: "user_1",
        clerkOrgPermissions: [],
        scopes: [],
      },
    );

    expect(client.formResponse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { publishStatus: "PUBLISHED" },
      }),
    );
    expect(updated).toMatchObject({
      reviewStatus: "PENDING",
      publishStatus: "PUBLISHED",
    });
  });

  it("rejects publish when the stored consent does not allow display", async () => {
    const { service, client } = makeResponsesService();
    client.formResponse.findFirst.mockResolvedValue(
      makeResponse({
        consent: {
          canPublishText: false,
          canPublishName: true,
          canPublishRole: true,
          canPublishCompany: true,
          canPublishAvatar: true,
          canEditForClarity: true,
        },
      }),
    );

    await expect(
      service.updatePublish(
        { slug: "acme", responseId: "response_1" },
        { status: "PUBLISHED" },
        { projectAccess: { projectId: "project_1" } },
        null,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(client.formResponse.update).not.toHaveBeenCalled();
  });
});

describe("public submit Phase 6 security helpers", () => {
  it("does not synthesize a trusted origin from a project slug", async () => {
    const service = new PublicSubmitTrustService(
      {
        client: {
          projectTrustedOrigin: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      } as unknown as PrismaService,
      {} as never,
    );

    await expect(
      service.evaluate(
        { headers: { origin: "https://acme.collect.semblia.com" } },
        { id: "project_1", slug: "acme", allowedOrigins: [] },
        [],
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("replays completed idempotency responses and returns 409 for in-flight or mismatched payloads", () => {
    expect(formSubmitIdempotencyWhere("project_1", "form_1", "idem_1")).toEqual(
      {
        projectId_formId_idempotencyKey: {
          projectId: "project_1",
          formId: "form_1",
          idempotencyKey: "idem_1",
        },
      },
    );
    expect(
      replayCompletedPublicSubmit(
        { payloadHash: "hash_1", responseBody: { id: "response_1" } },
        "hash_1",
      ),
    ).toEqual({ id: "response_1" });
    expect(() =>
      replayCompletedPublicSubmit(
        { payloadHash: "hash_1", responseBody: { id: "response_1" } },
        "hash_2",
      ),
    ).toThrow(ConflictException);
    expect(() =>
      replayCompletedPublicSubmit(
        { payloadHash: "hash_1", responseBody: {} },
        "hash_1",
      ),
    ).toThrow(ConflictException);
  });

  it("hard-rejects invalid HMAC submissions without falling back to Origin", async () => {
    const projectTrustedOriginFindFirst = vi.fn();
    const signingSecretService = {
      getActiveDecrypted: vi.fn().mockResolvedValue({
        id: "secret_1",
        plaintext: "correct-secret",
      }),
      markUsed: vi.fn(),
    };
    const service = new PublicSubmitTrustService(
      {
        client: {
          projectTrustedOrigin: {
            findFirst: projectTrustedOriginFindFirst,
          },
        },
      } as unknown as PrismaService,
      signingSecretService as never,
    );
    const timestamp = 1_779_900_000;
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(timestamp * 1000);

    try {
      await expect(
        service.evaluate(
          {
            headers: {
              "x-semblia-signature": `sha256=${Buffer.alloc(32, 1).toString(
                "base64",
              )}`,
              "x-semblia-timestamp": String(timestamp),
              origin: "https://allowed.example",
            },
            rawBody: '{"ok":true}',
            ip: "203.0.113.1",
          },
          {
            id: "project_1",
            slug: "acme",
            allowedOrigins: ["https://allowed.example"],
          },
          ["https://allowed.example"],
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    } finally {
      dateNowSpy.mockRestore();
    }
    expect(projectTrustedOriginFindFirst).not.toHaveBeenCalled();
    expect(signingSecretService.markUsed).not.toHaveBeenCalled();
  });
});

describe("SubmissionModerationService Phase 6", () => {
  it("does not let provider reconciliation override reviewer-approved responses", async () => {
    const responseUpdate = vi.fn();
    const moderationRunUpdate = vi.fn(async ({ data }) => ({
      id: "run_1",
      ...data,
    }));
    const service = new SubmissionModerationService(
      {
        client: {
          formModerationRun: {
            findUnique: vi.fn().mockResolvedValue({
              id: "run_1",
              responseId: "response_1",
              status: FormModerationRunStatus.ENQUEUED,
              artifactType: FormModerationArtifactType.TEXT,
              provider: "local",
              providerOperation: "noop",
              response: {
                id: "response_1",
                answers: [
                  {
                    role: "primaryText",
                    value: "clean response",
                    private: false,
                    publishable: true,
                  },
                ],
                reviewStatus: "APPROVED",
                moderatedAt: new Date("2026-05-26T10:00:00.000Z"),
                moderatedByActorType: "user",
                sourceMetadata: null,
                project: { autoApproveVerified: false },
              },
              mediaAsset: null,
            }),
            update: moderationRunUpdate,
          },
          formResponse: {
            update: responseUpdate,
          },
        },
      } as unknown as PrismaService,
      { get: vi.fn(() => false) } as never,
      { add: vi.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      new NoopModerationClient(),
    );

    await expect(service.processRun("run_1")).resolves.toMatchObject({
      status: FormModerationRunStatus.SUCCEEDED,
    });
    expect(moderationRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: FormModerationRunStatus.SUCCEEDED,
          rawResult: { disabled: true },
        }),
      }),
    );
    expect(responseUpdate).not.toHaveBeenCalled();
  });
});
