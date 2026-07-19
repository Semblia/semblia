import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalizeRuntimeRequest } from "@workspace/types";
import { runtimeApiRequest } from "./api-client.js";
import type { FormsRuntimeEnv } from "./env.js";

const apiEnv: FormsRuntimeEnv = {
  FORMS_RUNTIME_MODE: "api",
  FORMS_RUNTIME_API_BASE_URL: "https://api.semblia.test/v2",
  FORMS_RUNTIME_SIGNING_SECRET: "s".repeat(32),
  FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: "forms.semblia.test",
  FORMS_RUNTIME_PROJECT_ID: "project_1",
  FORMS_RUNTIME_PROJECT_ID_BY_HOST: {},
  FORMS_RUNTIME_UPLOAD_CONNECT_SRC: "https:",
  FORMS_RUNTIME_API_TIMEOUT_MS: 2500,
  FORMS_RUNTIME_EDGE_RATE_WINDOW_MS: 60_000,
  PORT: 3007,
};

function mockFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("runtimeApiRequest", () => {
  it("unwraps successful api_v2 response envelopes", async () => {
    mockFetch(
      Response.json({
        success: true,
        data: { snapshotId: "snapshot_123" },
        meta: { requestId: "req_123" },
      }),
    );

    const result = await runtimeApiRequest<{ snapshotId: string }>({
      env: apiEnv,
      method: "GET",
      path: "/runtime/forms/customer-feedback/snapshot?projectId=project_1",
      hostname: "forms.semblia.test",
    });

    expect(result).toEqual({ snapshotId: "snapshot_123" });
  });

  it("signs the final request target with fresh runtime headers", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_710_000_000_000);
    const fetchMock = mockFetch(Response.json({ success: true, data: { ok: true } }));

    await runtimeApiRequest({
      env: apiEnv,
      method: "POST",
      path: "/runtime/forms/customer-feedback/submissions?surface=hosted",
      hostname: "Forms.Customer.Example",
      rawBody: '{"answers":{"message":"Great"}}',
      headers: { origin: "https://forms.semblia.test" },
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.semblia.test/v2/runtime/forms/customer-feedback/submissions?surface=hosted",
      expect.objectContaining({
        method: "POST",
        body: '{"answers":{"message":"Great"}}',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(requestInit?.headers).toEqual(
      expect.objectContaining({
        "content-type": "application/json",
        origin: "https://forms.semblia.test",
        "x-semblia-runtime-host": "forms.customer.example",
        "x-semblia-runtime-timestamp": "1710000000",
      }),
    );
    expect(
      (requestInit?.headers as Record<string, string> | undefined)?.[
        "x-semblia-runtime-signature"
      ],
    ).toBe(
      `v1=${createHmac("sha256", "s".repeat(32))
        .update(
          canonicalizeRuntimeRequest({
            timestampSeconds: 1_710_000_000,
            method: "POST",
            requestTarget:
              "/v2/runtime/forms/customer-feedback/submissions?surface=hosted",
            hostname: "forms.customer.example",
            bodySha256: "982842c0ba4a66ee8fb378baf574a73eac66f92cd142e4ff073b821111a3b842",
          }),
        )
        .digest("hex")}`,
    );
    expect(nowSpy).toHaveBeenCalled();
  });

  it("strips caller-supplied old and runtime trust headers", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_710_000_000_000);
    const fetchMock = mockFetch(Response.json({ success: true, data: { ok: true } }));

    await runtimeApiRequest({
      env: apiEnv,
      method: "POST",
      path: "/runtime/forms/customer-feedback/submissions?projectId=project_1",
      hostname: "forms.semblia.test",
      rawBody: '{"answers":{}}',
      headers: {
        "x-semblia-signature": "sha256=caller",
        "x-semblia-timestamp": "1710000100",
        "x-semblia-runtime-host": "attacker.example",
        "x-semblia-runtime-timestamp": "1710000100",
        "x-semblia-runtime-signature": "v1=bad",
      },
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(requestInit?.headers).toEqual(
      expect.objectContaining({
        "x-semblia-runtime-host": "forms.semblia.test",
        "x-semblia-runtime-timestamp": "1710000000",
      }),
    );
    expect(
      (requestInit?.headers as Record<string, string> | undefined)?.[
        "x-semblia-signature"
      ],
    ).toBeUndefined();
    expect(
      (requestInit?.headers as Record<string, string> | undefined)?.[
        "x-semblia-runtime-signature"
      ],
    ).toMatch(/^v1=[0-9a-f]{64}$/);
  });

  it("throws sanitized non-OK errors that include only the status", async () => {
    mockFetch(
      Response.json(
        { success: false, error: { message: "secret upstream detail" } },
        { status: 403 },
      ),
    );

    await expect(
      runtimeApiRequest({
        env: apiEnv,
      method: "GET",
      path: "/runtime/forms/customer-feedback/snapshot?projectId=project_1",
      hostname: "forms.semblia.test",
      }),
    ).rejects.toMatchObject({ name: "RuntimeApiError", status: 503 });
  });

  it.each([401, 404, 429])("preserves public runtime status %i", async (status) => {
    mockFetch(Response.json({ error: { message: "upstream secret" } }, { status }));
    await expect(
      runtimeApiRequest({
        env: apiEnv,
        method: "GET",
        path: "/runtime/forms/customer-feedback/snapshot?surface=hosted",
        hostname: "acme.forms.semblia.test",
      }),
    ).rejects.toMatchObject({ name: "RuntimeApiError", status });
  });

  it("maps network, malformed success, and 5xx failures to opaque 503", async () => {
    const inputs: Array<Promise<Response>> = [
      Promise.reject(new Error("upstream secret")),
      Promise.resolve(Response.json({ unexpected: "upstream secret" })),
      Promise.resolve(Response.json({ error: { message: "upstream secret" } }, { status: 500 })),
    ];
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(() => inputs.shift()!));
    for (let index = 0; index < 3; index += 1) {
      await expect(
        runtimeApiRequest({
          env: apiEnv,
          method: "GET",
          path: "/runtime/forms/customer-feedback/snapshot?surface=hosted",
          hostname: "acme.forms.semblia.test",
        }),
      ).rejects.toMatchObject({ name: "RuntimeApiError", status: 503 });
    }
  });

  it("signs GET requests as bodyless even if a caller supplies rawBody", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_710_000_000_000);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({ success: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const base = {
      method: "GET" as const,
      path: "/runtime/forms/a/snapshot?surface=hosted",
      hostname: "a.forms.semblia.test",
    };
    await runtimeApiRequest({ env: apiEnv, ...base });
    await runtimeApiRequest({ env: apiEnv, ...base, rawBody: "attacker-body" });
    const signatures = fetchMock.mock.calls.map(
      (call) => (call[1]?.headers as Record<string, string>)["x-semblia-runtime-signature"],
    );
    expect(signatures[0]).toBe(signatures[1]);
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBeUndefined();
  });

  it("changes the runtime signature when a bound method, target, host, or sent POST body changes", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_710_000_000_000);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({ success: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const requests = [
      { method: "POST" as const, path: "/runtime/forms/a/submissions", hostname: "a.forms.semblia.test", rawBody: "" },
      { method: "GET" as const, path: "/runtime/forms/a/submissions", hostname: "a.forms.semblia.test", rawBody: "" },
      { method: "POST" as const, path: "/runtime/forms/b/submissions", hostname: "a.forms.semblia.test", rawBody: "" },
      { method: "POST" as const, path: "/runtime/forms/a/submissions", hostname: "b.forms.semblia.test", rawBody: "" },
      { method: "POST" as const, path: "/runtime/forms/a/submissions", hostname: "a.forms.semblia.test", rawBody: "{}" },
    ];
    for (const request of requests) await runtimeApiRequest({ env: apiEnv, ...request });
    const signatures = fetchMock.mock.calls.map(
      (call) => (call[1]?.headers as Record<string, string>)["x-semblia-runtime-signature"],
    );
    expect(new Set(signatures).size).toBe(requests.length);
  });
});
