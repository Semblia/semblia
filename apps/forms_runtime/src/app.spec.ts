import { describe, expect, it, vi } from "vitest";
import {
  compileSnapshot,
  createFormTemplate,
  toPublicSnapshot,
} from "@workspace/forms-core";
import { createFormsRuntimeApp } from "./app.js";
import { RuntimeApiError } from "./api-client.js";
import { loadEnv } from "./env.js";
import { createMockRuntimeServices } from "./mock-services.js";
import type { FormsRuntimeServices } from "./types.js";

const env = loadEnv({
  FORMS_RUNTIME_MODE: "mock",
  FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: "forms.semblia.test",
  FORMS_RUNTIME_PROJECT_ID: "project_mock",
  FORMS_RUNTIME_EDGE_RATE_WINDOW_MS: "60000",
});

function publicSnapshot(input?: {
  status?: "published" | "archived";
  embedAllowed?: boolean;
  allowedOrigins?: string[];
}) {
  const doc = createFormTemplate("TESTIMONIAL");
  doc.content.title = "Share your experience";
  doc.content.closedMessage = "This form is closed.";
  doc.settings.embedAllowed = input?.embedAllowed ?? true;
  doc.settings.allowedOrigins = input?.allowedOrigins ?? [
    "https://customer.example",
  ];
  doc.settings.blockedWords = ["internal-blocked-word"];
  return toPublicSnapshot(
    compileSnapshot(doc, {
      snapshotId: "snapshot_1",
      formId: "form_1",
      projectId: "project_mock",
      slug: "customer-feedback",
      version: 1,
      status: input?.status ?? "published",
      publishedAt: "2026-06-20T00:00:00.000Z",
    }),
  );
}

function stubServices(snapshot = publicSnapshot()): FormsRuntimeServices {
  return {
    resolveCollectionHost: vi.fn(async (hostname) => ({
      requestedHostname: hostname,
      canonicalHostname: hostname,
      canonicalUrl: `https://${hostname}`,
      isCanonical: true,
      projectId: "project_mock",
      feature: "COLLECTION" as const,
    })),
    getSnapshotBySlug: vi.fn(async () => snapshot),
    submitForm: vi.fn(async () => ({
      id: "response_1",
      projectId: "project_mock",
      formId: "form_1",
      versionId: "snapshot_1",
      version: 1,
      reviewStatus: "PENDING",
      publishStatus: "PRIVATE",
      createdAt: "2026-06-20T00:01:00.000Z",
    })),
    presignUpload: vi.fn(async () => ({
      assetId: "asset_1",
      uploadUrl: "https://bucket.example/put",
      requiredHeaders: { "Content-Type": "image/png" },
      expiresAt: "2026-06-20T00:10:00.000Z",
    })),
  };
}

async function submitRepeatedly(
  app: ReturnType<typeof createFormsRuntimeApp>,
  headers: Record<string, string> = {},
) {
  let lastStatus = 0;

  for (let i = 0; i < 11; i += 1) {
    const response = await app.request(
      "http://forms.semblia.com/f/customer-feedback/submissions?projectId=project_mock",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...headers,
        },
        body: '{"answers":{}}',
      },
    );
    lastStatus = response.status;
  }

  return lastStatus;
}

describe("createFormsRuntimeApp", () => {
  it("serves health checks", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("http://forms.semblia.test/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("renders /f/:slug with the shared renderer, snapshot JSON, and hosted CSP", async () => {
    const app = createFormsRuntimeApp(env, stubServices());
    const response = await app.request(
      "http://forms.semblia.test/f/customer-feedback?projectId=project_mock",
      { headers: { origin: "https://forms.semblia.test" } },
    );
    const html = await response.text();
    const csp = response.headers.get("content-security-policy") ?? "";

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'self' https:");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"');
    expect(html).toContain('id="semblia-form-root"');
    expect(html).toContain('id="semblia-form-snapshot"');
    expect(html).toContain("Share your experience");
    expect(html).toContain("--tf-accent:");
    expect(html).not.toContain("internal-blocked-word");
    expect(html).not.toContain("serverSettings");
  });

  it("keeps localhost mock mode on its project_mock fallback without projectId", async () => {
    const services = stubServices();
    const app = createFormsRuntimeApp(env, services);
    const response = await app.request("http://localhost/f/customer-feedback");

    expect(response.status).toBe(200);
    expect(services.resolveCollectionHost).not.toHaveBeenCalled();
    expect(services.getSnapshotBySlug).toHaveBeenCalledWith(
      expect.objectContaining({
        routing: {
          kind: "legacy-project",
          hostname: "forms.semblia.test",
          projectId: "project_mock",
        },
      }),
      expect.anything(),
    );
  });

  it("renders closed snapshots as closed-form UI with no edge cache", async () => {
    const app = createFormsRuntimeApp(
      env,
      stubServices(publicSnapshot({ status: "archived" })),
    );
    const response = await app.request(
      "http://forms.semblia.test/f/customer-feedback?projectId=project_mock",
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(html).toContain("This form is closed.");
  });

  it("serves /embed/:slug as static renderer markup and echoes an allowed Origin", async () => {
    const app = createFormsRuntimeApp(env, stubServices());
    const response = await app.request(
      "http://forms.semblia.test/embed/customer-feedback?projectId=project_mock",
      { headers: { origin: "https://customer.example" } },
    );
    const html = await response.text();
    const csp = response.headers.get("content-security-policy") ?? "";

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://customer.example",
    );
    expect(response.headers.get("x-frame-options")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(csp).toContain("script-src 'none'");
    expect(csp).toContain("frame-ancestors https://customer.example");
    expect(html).not.toContain("<!doctype");
    expect(html).not.toContain("<script");
    expect(html).toContain("Share your experience");
  });

  it("rejects disallowed embed origins and embed-disabled snapshots", async () => {
    const app = createFormsRuntimeApp(env, stubServices());
    const disallowed = await app.request(
      "http://forms.semblia.test/embed/customer-feedback?projectId=project_mock",
      { headers: { origin: "https://evil.example" } },
    );
    expect(disallowed.status).toBe(403);
    expect(disallowed.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(disallowed.headers.get("cache-control")).toBe("private, no-store");
    expect(disallowed.headers.get("vary")).toBe("origin, accept-encoding");

    const disabledApp = createFormsRuntimeApp(
      env,
      stubServices(publicSnapshot({ embedAllowed: false })),
    );
    const disabled = await disabledApp.request(
      "http://forms.semblia.test/embed/customer-feedback?projectId=project_mock",
      { headers: { origin: "https://customer.example" } },
    );
    expect(disabled.status).toBe(403);
    expect(disabled.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(disabled.headers.get("cache-control")).toBe("private, no-store");
    expect(disabled.headers.get("vary")).toBe("origin, accept-encoding");
  });

  it("serves embed.js and loader.js as Phase-8 JavaScript placeholders", async () => {
    const app = createFormsRuntimeApp(env, stubServices());
    for (const path of ["/embed.js", "/loader.js"]) {
      const response = await app.request(`http://forms.semblia.test${path}`);
      const body = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/javascript",
      );
      expect(body).toContain("TODO(Phase 8)");
    }
  });

  it("proxies structured submissions to api_v2 services with Origin and idempotency headers", async () => {
    const services = stubServices();
    const app = createFormsRuntimeApp(env, services);
    const response = await app.request(
      "http://forms.semblia.test/f/customer-feedback/submissions?projectId=project_mock",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://forms.semblia.test",
          "idempotency-key": "idem_1",
        },
        body: JSON.stringify({
          answers: { testimonial: "Great team" },
          consent: { canPublishText: true },
        }),
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ id: "response_1" });
    expect(services.submitForm).toHaveBeenCalledWith(
      expect.objectContaining({
        rawBody: JSON.stringify({
          answers: { testimonial: "Great team" },
          consent: { canPublishText: true },
        }),
        metadata: expect.objectContaining({
          origin: "https://forms.semblia.test",
          idempotencyKey: "idem_1",
        }),
      }),
    );
  });

  it("proxies presign requests and adds SUBMISSION_ATTACHMENT for unsigned browser calls", async () => {
    const services = stubServices();
    const app = createFormsRuntimeApp(env, services);
    const response = await app.request(
      "http://forms.semblia.test/f/customer-feedback/uploads/presign?projectId=project_mock",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://forms.semblia.test",
        },
        body: JSON.stringify({ contentType: "image/png", byteSize: 2048 }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      assetId: "asset_1",
      uploadUrl: "https://bucket.example/put",
    });
    const presignInput = vi.mocked(services.presignUpload).mock.calls[0]?.[0];
    expect(JSON.parse(presignInput?.rawBody ?? "{}")).toEqual({
      contentType: "image/png",
      byteSize: 2048,
      purpose: "SUBMISSION_ATTACHMENT",
    });
  });

  it("rate-limits repeated unsigned submissions at the edge", async () => {
    const app = createFormsRuntimeApp(
      loadEnv({
        FORMS_RUNTIME_MODE: "mock",
        FORMS_RUNTIME_PROJECT_ID: "project_mock",
        FORMS_RUNTIME_EDGE_RATE_WINDOW_MS: "60000",
      }),
      stubServices(),
    );

    await expect(submitRepeatedly(app)).resolves.toBe(429);
  });

  it("does not upgrade edge rate limits for caller-supplied signature headers", async () => {
    const app = createFormsRuntimeApp(
      loadEnv({
        FORMS_RUNTIME_MODE: "mock",
        FORMS_RUNTIME_PROJECT_ID: "project_mock",
        FORMS_RUNTIME_EDGE_RATE_WINDOW_MS: "60000",
      }),
      stubServices(),
    );

    await expect(
      submitRepeatedly(app, {
        "x-semblia-signature": "sha256=caller",
        "x-semblia-timestamp": "1710000100",
      }),
    ).resolves.toBe(429);
  });

  it("resolves wildcard hosts before snapshots and isolates warm same-slug snapshots", async () => {
    const services = stubServices();
    vi.mocked(services.resolveCollectionHost).mockImplementation(
      async (host) => ({
        requestedHostname: host,
        canonicalHostname: host,
        canonicalUrl: `https://${host}`,
        isCanonical: true,
        projectId: host.startsWith("alpha") ? "project_alpha" : "project_beta",
        feature: "COLLECTION",
      }),
    );
    vi.mocked(services.getSnapshotBySlug).mockImplementation(
      async (context) => {
        const snapshot = publicSnapshot();
        snapshot.projectId = context.host.startsWith("alpha")
          ? "project_alpha"
          : "project_beta";
        snapshot.content.title = context.host.startsWith("alpha")
          ? "Alpha form"
          : "Beta form";
        return snapshot;
      },
    );
    const app = createFormsRuntimeApp(env, services);

    for (const [host, title] of [
      ["alpha.forms.semblia.test", "Alpha form"],
      ["beta.forms.semblia.test", "Beta form"],
      ["alpha.forms.semblia.test", "Alpha form"],
      ["beta.forms.semblia.test", "Beta form"],
    ] as const) {
      const response = await app.request(
        `http://${host}/f/customer-feedback?projectId=hostile`,
      );
      expect(await response.text()).toContain(title);
    }

    expect(services.resolveCollectionHost).toHaveBeenCalledTimes(4);
    expect(services.getSnapshotBySlug).toHaveBeenCalledTimes(2);
    expect(services.getSnapshotBySlug).toHaveBeenCalledWith(
      expect.objectContaining({ host: "alpha.forms.semblia.test" }),
      expect.anything(),
    );
  });

  it("redirects only safe wildcard GET aliases while preserving every query parameter", async () => {
    const services = stubServices();
    vi.mocked(services.resolveCollectionHost).mockResolvedValue({
      requestedHostname: "alias.forms.semblia.test",
      canonicalHostname: "canonical.forms.semblia.test",
      canonicalUrl: "https://canonical.forms.semblia.test",
      isCanonical: false,
      projectId: "project_alpha",
      feature: "COLLECTION",
    });
    const app = createFormsRuntimeApp(env, services);
    const response = await app.request(
      "http://alias.forms.semblia.test/f/customer-feedback?projectId=hostile&submitted=1&source=mail",
      { redirect: "manual" },
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://canonical.forms.semblia.test/f/customer-feedback?projectId=hostile&submitted=1&source=mail",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(services.getSnapshotBySlug).not.toHaveBeenCalled();
  });

  it("does not redirect wildcard proxy POSTs and keeps their tenant authority host-bound", async () => {
    const services = stubServices();
    vi.mocked(services.resolveCollectionHost).mockResolvedValue({
      requestedHostname: "alias.forms.semblia.test",
      canonicalHostname: "canonical.forms.semblia.test",
      canonicalUrl: "https://canonical.forms.semblia.test",
      isCanonical: false,
      projectId: "project_alpha",
      feature: "COLLECTION",
    });
    const app = createFormsRuntimeApp(env, services);
    const response = await app.request(
      "http://alias.forms.semblia.test/f/customer-feedback/submissions?projectId=hostile",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"answers":{}}',
      },
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("location")).toBeNull();
    expect(services.submitForm).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          routing: { kind: "hostname", hostname: "alias.forms.semblia.test" },
        }),
      }),
    );
  });

  it("bypasses the public resolver only for the configured exact service host", async () => {
    const services = stubServices();
    const app = createFormsRuntimeApp(env, services);
    const response = await app.request(
      "http://forms.semblia.test/f/customer-feedback?projectId=project_mock",
    );

    expect(response.status).toBe(200);
    expect(services.resolveCollectionHost).not.toHaveBeenCalled();
    expect(services.getSnapshotBySlug).toHaveBeenCalledWith(
      expect.objectContaining({
        routing: {
          kind: "legacy-project",
          hostname: "forms.semblia.test",
          projectId: "project_mock",
        },
      }),
      expect.anything(),
    );
  });

  it.each([
    "http://deep.alpha.forms.semblia.test/f/customer-feedback",
    "http://invalid_host.forms.semblia.test/f/customer-feedback",
  ])(
    "returns opaque 404 for rejected viewer routing identity %s",
    async (url) => {
      const app = createFormsRuntimeApp(env, stubServices());
      const response = await app.request(url);

      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(await response.text()).not.toContain("Invalid");
    },
  );

  it("requires projectId on the exact service host in API mode", async () => {
    const apiApp = createFormsRuntimeApp(
      loadEnv({
        FORMS_RUNTIME_MODE: "api",
        FORMS_RUNTIME_API_BASE_URL: "https://api.semblia.test/v2",
        FORMS_RUNTIME_SIGNING_SECRET: "s".repeat(32),
        FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: "forms.semblia.test",
      }),
      stubServices(),
    );
    const response = await apiApp.request(
      "http://forms.semblia.test/f/customer-feedback",
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("uses hostname-scoped edge rate buckets", async () => {
    const services = stubServices();
    const app = createFormsRuntimeApp(env, services);
    for (const host of [
      "alpha.forms.semblia.test",
      "beta.forms.semblia.test",
    ]) {
      for (let i = 0; i < 10; i += 1) {
        const response = await app.request(
          `http://${host}/f/customer-feedback/submissions`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: '{"answers":{}}',
          },
        );
        expect(response.status).toBe(201);
      }
    }
    const alpha = await app.request(
      "http://alpha.forms.semblia.test/f/customer-feedback/submissions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"answers":{}}',
      },
    );
    expect(alpha.status).toBe(429);
  });

  it("expires and deterministically evicts bounded host-project snapshot cache entries", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T00:00:00.000Z"));
    try {
      const services = stubServices();
      const app = createFormsRuntimeApp(env, services);
      await app.request("http://ttl.forms.semblia.test/f/customer-feedback");
      vi.advanceTimersByTime(60_001);
      await app.request("http://ttl.forms.semblia.test/f/customer-feedback");
      expect(services.getSnapshotBySlug).toHaveBeenCalledTimes(2);

      for (let i = 0; i < 256; i += 1) {
        await app.request(
          `http://tenant-${i}.forms.semblia.test/f/customer-feedback`,
        );
      }
      await app.request("http://ttl.forms.semblia.test/f/customer-feedback");
      expect(services.getSnapshotBySlug).toHaveBeenCalledTimes(259);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects resolver canonical URLs that are not HTTPS for the canonical hostname", async () => {
    const services = stubServices();
    vi.mocked(services.resolveCollectionHost).mockResolvedValue({
      requestedHostname: "alias.forms.semblia.test",
      canonicalHostname: "canonical.forms.semblia.test",
      canonicalUrl: "https://attacker.example/redirect-me",
      isCanonical: false,
      projectId: "project_alpha",
      feature: "COLLECTION",
    });
    const app = createFormsRuntimeApp(env, services);
    const response = await app.request(
      "http://alias.forms.semblia.test/f/customer-feedback?source=mail",
      { redirect: "manual" },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each([
    {
      name: "wrong feature",
      resolution: {
        requestedHostname: "alpha.forms.semblia.test",
        canonicalHostname: "alpha.forms.semblia.test",
        canonicalUrl: "https://alpha.forms.semblia.test",
        isCanonical: true,
        projectId: "project_mock",
        feature: "WALL",
      },
    },
    {
      name: "non-boolean canonical marker",
      resolution: {
        requestedHostname: "alpha.forms.semblia.test",
        canonicalHostname: "alpha.forms.semblia.test",
        canonicalUrl: "https://alpha.forms.semblia.test",
        isCanonical: "true",
        projectId: "project_mock",
        feature: "COLLECTION",
      },
    },
    {
      name: "non-normalized requested hostname",
      resolution: {
        requestedHostname: "ALPHA.forms.semblia.test.",
        canonicalHostname: "alpha.forms.semblia.test",
        canonicalUrl: "https://alpha.forms.semblia.test",
        isCanonical: true,
        projectId: "project_mock",
        feature: "COLLECTION",
      },
    },
    {
      name: "true canonical marker for a distinct hostname",
      resolution: {
        requestedHostname: "alpha.forms.semblia.test",
        canonicalHostname: "canonical.forms.semblia.test",
        canonicalUrl: "https://canonical.forms.semblia.test",
        isCanonical: true,
        projectId: "project_mock",
        feature: "COLLECTION",
      },
    },
    {
      name: "false canonical marker for the same hostname",
      resolution: {
        requestedHostname: "alpha.forms.semblia.test",
        canonicalHostname: "alpha.forms.semblia.test",
        canonicalUrl: "https://alpha.forms.semblia.test",
        isCanonical: false,
        projectId: "project_mock",
        feature: "COLLECTION",
      },
    },
  ])(
    "fails malformed resolver contract closed: $name",
    async ({ resolution }) => {
      const services = stubServices();
      vi.mocked(services.resolveCollectionHost).mockResolvedValue(
        resolution as never,
      );
      const app = createFormsRuntimeApp(env, services);
      const response = await app.request(
        "http://alpha.forms.semblia.test/f/customer-feedback",
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(services.getSnapshotBySlug).not.toHaveBeenCalled();
    },
  );

  it("rejects a snapshot whose project does not match the resolved wildcard host", async () => {
    const services = stubServices();
    vi.mocked(services.resolveCollectionHost).mockResolvedValue({
      requestedHostname: "alpha.forms.semblia.test",
      canonicalHostname: "alpha.forms.semblia.test",
      canonicalUrl: "https://alpha.forms.semblia.test",
      isCanonical: true,
      projectId: "project_alpha",
      feature: "COLLECTION",
    });
    const mismatched = publicSnapshot();
    mismatched.projectId = "project_beta";
    vi.mocked(services.getSnapshotBySlug).mockResolvedValue(mismatched);
    const app = createFormsRuntimeApp(env, services);
    const response = await app.request(
      "http://alpha.forms.semblia.test/f/customer-feedback",
    );

    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("project_beta");
  });

  it.each([
    [new RuntimeApiError(404), 404],
    [new RuntimeApiError(401), 401],
    [new RuntimeApiError(429), 429],
    [new RuntimeApiError(503), 503],
  ])(
    "maps runtime API status %i without exposing upstream detail",
    async (error, status) => {
      const services = stubServices();
      vi.mocked(services.resolveCollectionHost).mockRejectedValue(error);
      const app = createFormsRuntimeApp(env, services);
      const response = await app.request(
        "http://alpha.forms.semblia.test/f/customer-feedback",
      );

      expect(response.status).toBe(status);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(await response.text()).not.toContain("Runtime API request failed");
    },
  );
});
