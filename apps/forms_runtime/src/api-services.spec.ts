import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFormTemplate,
  compileSnapshot,
  toPublicSnapshot,
} from "@workspace/forms-core";
import { createApiRuntimeServices, resolveCollectionHost } from "./api-services.js";
import type { FormsRuntimeEnv } from "./env.js";

const apiEnv: FormsRuntimeEnv = {
  FORMS_RUNTIME_MODE: "api",
  FORMS_RUNTIME_API_BASE_URL: "https://api.semblia.test/v2",
  FORMS_RUNTIME_SIGNING_SECRET: "s".repeat(32),
  FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: "forms.semblia.test",
  FORMS_RUNTIME_PROJECT_ID: "project_1",
  FORMS_RUNTIME_PROJECT_ID_BY_HOST: {},
  FORMS_RUNTIME_UPLOAD_CONNECT_SRC: "https:",
  FORMS_RUNTIME_API_TIMEOUT_MS: 5000,
  FORMS_RUNTIME_EDGE_RATE_WINDOW_MS: 60_000,
  PORT: 3007,
};

const snapshot = toPublicSnapshot(
  compileSnapshot(createFormTemplate("CUSTOM"), {
    snapshotId: "snapshot_1",
    formId: "form_1",
    projectId: "project_1",
    slug: "customer-feedback",
    version: 1,
    publishedAt: "2026-06-20T00:00:00.000Z",
  }),
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createApiRuntimeServices", () => {
  it("fetches snapshots through the new api_v2 runtime contract and forwards Origin", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        success: true,
        data: snapshot,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const services = createApiRuntimeServices(apiEnv);
    const result = await services.getSnapshotBySlug(
      {
        host: "forms.semblia.test",
        origin: "https://forms.semblia.test",
        routing: { kind: "hostname", hostname: "forms.semblia.test" },
        slug: "customer-feedback",
        path: "/f/customer-feedback",
        surface: "hosted",
      },
      { origin: "https://forms.semblia.test" },
    );

    expect(result.snapshotId).toBe("snapshot_1");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.semblia.test/v2/runtime/forms/customer-feedback/snapshot?surface=hosted",
    );
    expect(init?.headers).toEqual(
      expect.objectContaining({ origin: "https://forms.semblia.test" }),
    );
  });

  it("submits the structured JSON body and replaces caller trust headers", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_710_000_000_000);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        success: true,
        data: {
          id: "response_1",
          projectId: "project_1",
          formId: "form_1",
          versionId: "snapshot_1",
          version: 1,
          reviewStatus: "PENDING",
          publishStatus: "PRIVATE",
          createdAt: "2026-06-20T00:00:01.000Z",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const services = createApiRuntimeServices(apiEnv);
    await services.submitForm({
      context: {
        host: "forms.semblia.test",
        origin: "https://forms.semblia.test",
        routing: {
          kind: "legacy-project",
          hostname: "forms.semblia.test",
          projectId: "project_1",
        },
        slug: "customer-feedback",
        path: "/f/customer-feedback",
        surface: "proxy",
      },
      rawBody: '{"answers":{"message":"Great"}}',
      metadata: {
        origin: "https://forms.semblia.test",
        signature: "sha256=caller",
        timestamp: "1710000000",
        idempotencyKey: "idem_1",
        userAgent: "Browser",
        forwardedFor: "203.0.113.10",
      },
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.semblia.test/v2/runtime/forms/customer-feedback/submissions?projectId=project_1",
    );
    expect(init?.body).toBe('{"answers":{"message":"Great"}}');
    expect(init?.headers).toEqual(
      expect.objectContaining({
        origin: "https://forms.semblia.test",
        "x-semblia-runtime-timestamp": "1710000000",
        "idempotency-key": "idem_1",
        "user-agent": "Browser",
        "x-forwarded-for": "203.0.113.10",
      }),
    );
    expect(
      (init?.headers as Record<string, string> | undefined)?.[
        "x-semblia-runtime-signature"
      ],
    ).toMatch(/^v1=[0-9a-f]{64}$/);
    expect(
      (init?.headers as Record<string, string> | undefined)?.[
        "x-semblia-signature"
      ],
    ).toBeUndefined();
    expect(nowSpy).toHaveBeenCalled();
  });

  it("strips storageKey from presign responses before returning to the browser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          success: true,
          data: {
            assetId: "asset_1",
            uploadUrl: "https://bucket.example/put",
            requiredHeaders: { "Content-Type": "image/png" },
            expiresAt: "2026-06-20T00:10:00.000Z",
            storageKey: "private/key.png",
          },
        }),
      ),
    );

    const services = createApiRuntimeServices(apiEnv);
    await expect(
      services.presignUpload({
        context: {
          host: "forms.semblia.test",
        routing: {
          kind: "legacy-project",
          hostname: "forms.semblia.test",
          projectId: "project_1",
        },
          slug: "customer-feedback",
          path: "/f/customer-feedback",
          surface: "proxy",
        },
        rawBody:
          '{"purpose":"SUBMISSION_ATTACHMENT","contentType":"image/png","byteSize":2048}',
      }),
    ).resolves.toEqual({
      assetId: "asset_1",
      uploadUrl: "https://bucket.example/put",
      requiredHeaders: { "Content-Type": "image/png" },
      expiresAt: "2026-06-20T00:10:00.000Z",
    });
  });

  it("resolves COLLECTION hosts through the public resolver", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, data: {
        requestedHostname: "acme.forms.semblia.test",
        canonicalHostname: "acme.forms.semblia.test",
        canonicalUrl: "https://acme.forms.semblia.test",
        isCanonical: true,
        projectId: "project_1",
        feature: "COLLECTION",
      } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(resolveCollectionHost(apiEnv, "acme.forms.semblia.test")).resolves.toMatchObject({ feature: "COLLECTION" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.semblia.test/v2/public-surfaces/resolve?hostname=acme.forms.semblia.test&feature=COLLECTION",
    );
  });

  it("does not expose the removed snapshot-by-ID service", () => {
    expect("getSnapshotById" in createApiRuntimeServices(apiEnv)).toBe(false);
  });
});
