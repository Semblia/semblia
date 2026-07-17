import { describe, expect, it, vi } from "vitest";
import {
  compileSnapshot,
  createFormTemplate,
  toPublicSnapshot,
} from "@workspace/forms-core";
import { createFormsRuntimeApp } from "./app.js";
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
  delivery?: "hosted" | "embed";
  embedAllowed?: boolean;
  allowedOrigins?: string[];
}) {
  const doc = createFormTemplate("TESTIMONIAL", input?.delivery ?? "hosted");
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
    getSnapshotBySlug: vi.fn(async () => snapshot),
    getSnapshotById: vi.fn(async () => snapshot),
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
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'self' https:");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('id="semblia-form-root"');
    expect(html).toContain('id="semblia-form-snapshot"');
    expect(html).toContain("Share your experience");
    expect(html).toContain("--tf-accent:");
    expect(html).not.toContain("internal-blocked-word");
    expect(html).not.toContain("serverSettings");
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
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(html).toContain("This form is closed.");
  });

  it("serves /embed/:slug as static renderer markup and echoes an allowed Origin", async () => {
    const app = createFormsRuntimeApp(
      env,
      stubServices(publicSnapshot({ delivery: "embed" })),
    );
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
    expect(csp).toContain("script-src 'none'");
    expect(csp).toContain("frame-ancestors https://customer.example");
    expect(html).not.toContain("<!doctype");
    expect(html).not.toContain("<script");
    expect(html).toContain("Share your experience");
  });

  it("rejects disallowed embed origins and embed-disabled snapshots", async () => {
    const app = createFormsRuntimeApp(
      env,
      stubServices(publicSnapshot({ delivery: "embed" })),
    );
    const disallowed = await app.request(
      "http://forms.semblia.test/embed/customer-feedback?projectId=project_mock",
      { headers: { origin: "https://evil.example" } },
    );
    expect(disallowed.status).toBe(403);

    const disabledApp = createFormsRuntimeApp(
      env,
      stubServices(
        publicSnapshot({ delivery: "embed", embedAllowed: false }),
      ),
    );
    const disabled = await disabledApp.request(
      "http://forms.semblia.test/embed/customer-feedback?projectId=project_mock",
      { headers: { origin: "https://customer.example" } },
    );
    expect(disabled.status).toBe(403);
  });

  it("routes reject the other delivery: hosted forms 404 on /embed, embed forms 404 on /f", async () => {
    const hostedApp = createFormsRuntimeApp(env, stubServices());
    const embedOfHosted = await hostedApp.request(
      "http://forms.semblia.test/embed/customer-feedback?projectId=project_mock",
      { headers: { origin: "https://customer.example" } },
    );
    expect(embedOfHosted.status).toBe(404);

    const embedApp = createFormsRuntimeApp(
      env,
      stubServices(publicSnapshot({ delivery: "embed" })),
    );
    const hostedOfEmbed = await embedApp.request(
      "http://forms.semblia.test/f/customer-feedback?projectId=project_mock",
    );
    expect(hostedOfEmbed.status).toBe(404);
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
});
