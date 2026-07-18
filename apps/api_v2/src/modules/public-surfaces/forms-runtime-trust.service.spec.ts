import { createHmac, createHash } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PublicSurfaceFeature } from "@workspace/database/prisma";
import {
  canonicalizeRuntimeRequest,
  formatRuntimeSignature,
  SEMBLIA_RUNTIME_HEADERS,
} from "@workspace/types";
import { describe, expect, it, vi } from "vitest";
import { PublicHostingObservabilityService } from "./public-hosting-observability.service.js";
import {
  FormsRuntimeTrustService,
  type FormsRuntimeOperation,
} from "./forms-runtime-trust.service.js";
import { PublicSurfacesService } from "./public-surfaces.service.js";

const secret = "runtime-deployment-secret-that-is-not-a-project-secret";
const nowSeconds = 1_752_505_200;
const hostname = "acme.forms.semblia.com";
const fixedSignature =
  "v1=1b63efffdbced3b59efa07a32b5085399e91e18fc7e7ff01b127def4335f0dc0";

function signedRequest(overrides: Record<string, unknown> = {}) {
  const body = Buffer.from('{ "answer": 1 }');
  const request = {
    method: "POST",
    originalUrl:
      "/v2/runtime/forms/contact/submissions?projectId=project_1&b=2&a=1",
    headers: {
      [SEMBLIA_RUNTIME_HEADERS.host]: hostname,
      [SEMBLIA_RUNTIME_HEADERS.timestamp]: String(nowSeconds),
    },
    rawBody: body,
    ...overrides,
  } as {
    method: string;
    originalUrl: string;
    headers: Record<string, string | string[] | undefined>;
    rawBody?: Buffer | string;
  };
  const canonical = canonicalizeRuntimeRequest({
    timestampSeconds: nowSeconds,
    method: request.method,
    requestTarget: request.originalUrl,
    hostname,
    bodySha256: createHash("sha256").update(body).digest("hex"),
  });
  request.headers[SEMBLIA_RUNTIME_HEADERS.signature] = formatRuntimeSignature(
    createHmac("sha256", secret).update(canonical).digest(),
  );
  return request;
}

function makeService(
  options: {
    resolveHost?: ReturnType<typeof vi.fn>;
    now?: number;
    events?: unknown[];
  } = {},
) {
  const resolveHost =
    options.resolveHost ??
    vi.fn().mockResolvedValue({
      projectId: "project_1",
      canonicalHostname: hostname,
    });
  const events = options.events ?? [];
  const observability = new PublicHostingObservabilityService((event) =>
    events.push(event),
  );
  return {
    service: new FormsRuntimeTrustService(
      {
        getOrThrow: vi.fn().mockReturnValue(secret),
        get: vi.fn((key: string) =>
          key === "FORMS_RUNTIME_SIGNING_SECRET" ? secret : "forms.semblia.com",
        ),
      } as never,
      { resolveHost } as never,
      observability,
      () => options.now ?? nowSeconds * 1000,
    ),
    resolveHost,
    events,
  };
}

describe("FormsRuntimeTrustService", () => {
  it("resolves and uses the default clock with compiled constructor metadata", async () => {
    // Vitest omits design:paramtypes, so mirror the metadata emitted by nest build.
    const originalParamTypes = Reflect.getMetadata(
      "design:paramtypes",
      FormsRuntimeTrustService,
    ) as unknown;
    Reflect.defineMetadata(
      "design:paramtypes",
      [
        ConfigService,
        PublicSurfacesService,
        PublicHostingObservabilityService,
        Function,
      ],
      FormsRuntimeTrustService,
    );
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(nowSeconds * 1000);
    const resolveHost = vi.fn().mockResolvedValue({
      projectId: "project_1",
      canonicalHostname: hostname,
    });
    let closeModule: (() => Promise<void>) | undefined;

    try {
      const moduleRef = await Test.createTestingModule({
        providers: [
          FormsRuntimeTrustService,
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn((key: string) =>
                key === "FORMS_RUNTIME_SIGNING_SECRET"
                  ? secret
                  : "forms.semblia.com",
              ),
            },
          },
          {
            provide: PublicSurfacesService,
            useValue: { resolveHost },
          },
          {
            provide: PublicHostingObservabilityService,
            useValue: { record: vi.fn() },
          },
        ],
      }).compile();
      closeModule = () => moduleRef.close();
      const service = moduleRef.get(FormsRuntimeTrustService);

      await expect(
        service.verifyAndResolve(signedRequest(), {
          operation: "SUBMISSION",
        }),
      ).resolves.toMatchObject({
        hostname,
        projectId: "project_1",
      });
      expect(resolveHost).toHaveBeenCalledWith({
        hostname,
        feature: PublicSurfaceFeature.COLLECTION,
      });
    } finally {
      await closeModule?.();
      dateNow.mockRestore();
      if (originalParamTypes === undefined) {
        Reflect.deleteMetadata("design:paramtypes", FormsRuntimeTrustService);
      } else {
        Reflect.defineMetadata(
          "design:paramtypes",
          originalParamTypes,
          FormsRuntimeTrustService,
        );
      }
    }
  });

  it("treats any single runtime header as authoritative", () => {
    expect(FormsRuntimeTrustService.hasRuntimeHeaders({ headers: {} })).toBe(
      false,
    );
    for (const header of Object.values(SEMBLIA_RUNTIME_HEADERS)) {
      expect(
        FormsRuntimeTrustService.hasRuntimeHeaders({
          headers: { [header]: "present" },
        }),
      ).toBe(true);
    }
  });

  it("verifies the fixed canonical vector and binds wildcard requests to COLLECTION", async () => {
    const { service, resolveHost } = makeService();
    expect(signedRequest().headers[SEMBLIA_RUNTIME_HEADERS.signature]).toBe(
      fixedSignature,
    );

    await expect(
      service.verifyAndResolve(signedRequest(), { operation: "SUBMISSION" }),
    ).resolves.toMatchObject({
      hostname,
      canonicalHostname: hostname,
      projectId: "project_1",
      isLegacyExactHost: false,
      principal: `forms-runtime:${hostname}`,
    });
    expect(resolveHost).toHaveBeenCalledWith({
      hostname,
      feature: PublicSurfaceFeature.COLLECTION,
    });
  });

  it.each([
    [
      "method",
      (request: ReturnType<typeof signedRequest>) => {
        request.method = "GET";
      },
    ],
    [
      "request target and query",
      (request: ReturnType<typeof signedRequest>) => {
        request.originalUrl =
          "/v2/runtime/forms/contact/submissions?a=9&b=2&projectId=project_1";
      },
    ],
    [
      "hostname",
      (request: ReturnType<typeof signedRequest>) => {
        request.headers[SEMBLIA_RUNTIME_HEADERS.host] =
          "other.forms.semblia.com";
      },
    ],
    [
      "timestamp",
      (request: ReturnType<typeof signedRequest>) => {
        request.headers[SEMBLIA_RUNTIME_HEADERS.timestamp] = String(
          nowSeconds + 1,
        );
      },
    ],
    [
      "body",
      (request: ReturnType<typeof signedRequest>) => {
        request.rawBody = Buffer.from('{"answer":1}');
      },
    ],
  ])(
    "rejects a signature when the %s changes after signing",
    async (_label, mutate) => {
      const { service } = makeService();
      const request = signedRequest();
      mutate(request);
      await expect(
        service.verifyAndResolve(request, { operation: "SUBMISSION" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it("rejects partial, malformed, uppercase, wrong-length, expired, and unequal-length signatures", async () => {
    const mutations = [
      (request: ReturnType<typeof signedRequest>) =>
        delete request.headers[SEMBLIA_RUNTIME_HEADERS.timestamp],
      (request: ReturnType<typeof signedRequest>) => {
        request.headers[SEMBLIA_RUNTIME_HEADERS.signature] = "bogus";
      },
      (request: ReturnType<typeof signedRequest>) => {
        request.headers[SEMBLIA_RUNTIME_HEADERS.signature] =
          `v1=${"A".repeat(64)}`;
      },
      (request: ReturnType<typeof signedRequest>) => {
        request.headers[SEMBLIA_RUNTIME_HEADERS.signature] =
          "v1=" + "a".repeat(63);
      },
      (request: ReturnType<typeof signedRequest>) => {
        request.headers[SEMBLIA_RUNTIME_HEADERS.signature] =
          "v1=" + "a".repeat(2);
      },
      (request: ReturnType<typeof signedRequest>) => {
        request.headers[SEMBLIA_RUNTIME_HEADERS.timestamp] = String(
          nowSeconds - 301,
        );
      },
    ];
    for (const mutate of mutations) {
      const { service } = makeService();
      const request = signedRequest();
      mutate(request);
      await expect(
        service.verifyAndResolve(request, { operation: "SUBMISSION" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it("rejects array values and every missing runtime header peer with the same opaque 401", async () => {
    const mutations = [
      (request: ReturnType<typeof signedRequest>) => {
        request.headers[SEMBLIA_RUNTIME_HEADERS.host] = [hostname];
      },
      (request: ReturnType<typeof signedRequest>) => {
        request.headers[SEMBLIA_RUNTIME_HEADERS.timestamp] = [
          String(nowSeconds),
        ];
      },
      (request: ReturnType<typeof signedRequest>) => {
        request.headers[SEMBLIA_RUNTIME_HEADERS.signature] = [fixedSignature];
      },
      (request: ReturnType<typeof signedRequest>) =>
        delete request.headers[SEMBLIA_RUNTIME_HEADERS.host],
      (request: ReturnType<typeof signedRequest>) =>
        delete request.headers[SEMBLIA_RUNTIME_HEADERS.signature],
    ];
    for (const mutate of mutations) {
      const { service } = makeService();
      const request = signedRequest();
      mutate(request);
      await expect(
        service.verifyAndResolve(request, { operation: "SUBMISSION" }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          statusCode: 401,
          message: "Unauthorized runtime request",
        }),
      });
    }
  });

  it("accepts the inclusive five-minute freshness boundary", async () => {
    const request = signedRequest();
    const { service } = makeService({ now: (nowSeconds + 300) * 1000 });
    await expect(
      service.verifyAndResolve(request, { operation: "SUBMISSION" }),
    ).resolves.toBeDefined();
  });

  it("rejects a legacy project ID on a wildcard host", async () => {
    const { service } = makeService();
    await expect(
      service.verifyAndResolve(signedRequest(), {
        operation: "SUBMISSION",
        legacyProjectId: "project_1",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects the exact configured host when its legacy project ID is absent", async () => {
    const { service } = makeService();
    const request = signedRequest({
      method: "GET",
      originalUrl: "/v2/runtime/forms/contact/snapshot?surface=hosted",
      headers: {
        [SEMBLIA_RUNTIME_HEADERS.host]: "forms.semblia.com",
        [SEMBLIA_RUNTIME_HEADERS.timestamp]: String(nowSeconds),
      },
    });
    request.headers[SEMBLIA_RUNTIME_HEADERS.signature] = signRequest(
      request,
      "forms.semblia.com",
    );
    await expect(
      service.verifyAndResolve(request, { operation: "HOSTED_PAGE" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("allows only mapped viewer operations on the exact configured service host and records compatibility use", async () => {
    const events: unknown[] = [];
    const { service } = makeService({ events });
    const request = signedRequest({
      method: "GET",
      originalUrl: "/v2/runtime/forms/contact/snapshot?surface=hosted",
      headers: {
        [SEMBLIA_RUNTIME_HEADERS.host]: "forms.semblia.com",
        [SEMBLIA_RUNTIME_HEADERS.timestamp]: String(nowSeconds),
      },
    });
    request.headers[SEMBLIA_RUNTIME_HEADERS.signature] = signRequest(
      request,
      "forms.semblia.com",
    );
    await expect(
      service.verifyAndResolve(request, {
        operation: "HOSTED_PAGE",
        legacyProjectId: "project_legacy",
      }),
    ).resolves.toMatchObject({
      projectId: "project_legacy",
      isLegacyExactHost: true,
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        event: "forms_runtime_legacy_use",
        outcome: "used",
      }),
    );

    await expect(
      service.verifyAndResolve(request, {
        operation: "EMBED_PAGE",
        legacyProjectId: "project_legacy",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    ["HOSTED_PAGE", "GET", "/v2/runtime/forms/contact/snapshot?surface=hosted"],
    ["EMBED_PAGE", "GET", "/v2/runtime/forms/contact/snapshot?surface=embed"],
    ["SUBMISSION", "POST", "/v2/runtime/forms/contact/submissions"],
    ["UPLOAD_PRESIGN", "POST", "/v2/runtime/forms/contact/uploads/presign"],
  ] as const)(
    "accepts wildcard %s only on its mapped route and method",
    async (operation, method, originalUrl) => {
      const { service } = makeService();
      const request = signedRequest({ method, originalUrl });
      request.headers[SEMBLIA_RUNTIME_HEADERS.signature] = signRequest(
        request,
        hostname,
      );
      await expect(
        service.verifyAndResolve(request, { operation }),
      ).resolves.toBeDefined();
    },
  );

  it("rejects wildcard operation, method, and surface mismatches before host resolution", async () => {
    const { service, resolveHost } = makeService();
    const request = signedRequest({
      method: "GET",
      originalUrl: "/v2/runtime/forms/contact/snapshot?surface=embed",
    });
    request.headers[SEMBLIA_RUNTIME_HEADERS.signature] = signRequest(
      request,
      hostname,
    );
    await expect(
      service.verifyAndResolve(request, { operation: "HOSTED_PAGE" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(resolveHost).not.toHaveBeenCalled();
  });

  it("rejects duplicate surfaces and hostile route prefixes for every operation", async () => {
    const cases: Array<[FormsRuntimeOperation, string, string]> = [
      [
        "HOSTED_PAGE",
        "GET",
        "/evil/v2/runtime/forms/contact/snapshot?surface=hosted",
      ],
      [
        "EMBED_PAGE",
        "GET",
        "/v2/runtime/forms/contact/extra/snapshot?surface=embed",
      ],
      ["SUBMISSION", "POST", "/v2/runtime/forms/contact/submissions/extra"],
      [
        "UPLOAD_PRESIGN",
        "POST",
        "/v2/runtime/forms/contact/uploads/presign/extra",
      ],
      [
        "HOSTED_PAGE",
        "GET",
        "/v2/runtime/forms/contact/snapshot?surface=hosted&surface=embed",
      ],
    ];
    for (const [operation, method, originalUrl] of cases) {
      const { service } = makeService();
      const request = signedRequest({ method, originalUrl });
      request.headers[SEMBLIA_RUNTIME_HEADERS.signature] = signRequest(
        request,
        hostname,
      );
      await expect(
        service.verifyAndResolve(request, { operation }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it("turns malformed canonical targets into the same opaque 401", async () => {
    const { service } = makeService();
    const request = signedRequest();
    request.originalUrl = "/v2/runtime/forms/contact/submissions?bad=%ZZ";
    await expect(
      service.verifyAndResolve(request, { operation: "SUBMISSION" }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        statusCode: 401,
        message: "Unauthorized runtime request",
      }),
    });
  });

  it.each(["unknown", "retired", "wrong feature"])(
    "turns %s resolver failures into opaque rejections and records only sanitized rejection data",
    async () => {
      const events: unknown[] = [];
      const { service } = makeService({
        resolveHost: vi.fn().mockRejectedValue(new Error("retired host")),
        events,
      });
      const request = signedRequest();
      request.headers["x-request-id"] = "unsafe\nrequest";
      await expect(
        service.verifyAndResolve(request, { operation: "SUBMISSION" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(events).toContainEqual(
        expect.objectContaining({
          event: "forms_runtime_signature_rejection",
          outcome: "rejected",
          reason: "host_resolution_failed",
        }),
      );
      expect(JSON.stringify(events)).not.toContain("unsafe\\nrequest");
      expect(JSON.stringify(events)).not.toContain(
        String(request.headers[SEMBLIA_RUNTIME_HEADERS.signature]),
      );
    },
  );

  it("uses the canonical wildcard hostname in a stable principal", async () => {
    const { service } = makeService({
      resolveHost: vi.fn().mockResolvedValue({
        projectId: "project_1",
        canonicalHostname: "canonical.forms.semblia.com",
      }),
    });
    await expect(
      service.verifyAndResolve(signedRequest(), { operation: "SUBMISSION" }),
    ).resolves.toMatchObject({
      hostname,
      canonicalHostname: "canonical.forms.semblia.com",
      principal: "forms-runtime:canonical.forms.semblia.com",
    });
  });

  it("uses the deployment secret rather than a project signing secret", async () => {
    const { service } = makeService();
    const request = signedRequest();
    request.headers[SEMBLIA_RUNTIME_HEADERS.signature] = formatRuntimeSignature(
      createHmac("sha256", "project-signing-secret")
        .update(
          canonicalizeRuntimeRequest({
            timestampSeconds: nowSeconds,
            method: request.method,
            requestTarget: request.originalUrl,
            hostname,
            bodySha256: createHash("sha256")
              .update(request.rawBody ?? Buffer.alloc(0))
              .digest("hex"),
          }),
        )
        .digest(),
    );
    await expect(
      service.verifyAndResolve(request, { operation: "SUBMISSION" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function signRequest(
  request: ReturnType<typeof signedRequest>,
  signedHostname: string,
) {
  const body = request.rawBody ?? Buffer.alloc(0);
  return formatRuntimeSignature(
    createHmac("sha256", secret)
      .update(
        canonicalizeRuntimeRequest({
          timestampSeconds: nowSeconds,
          method: request.method,
          requestTarget: request.originalUrl,
          hostname: signedHostname,
          bodySha256: createHash("sha256").update(body).digest("hex"),
        }),
      )
      .digest(),
  );
}
