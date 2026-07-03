import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runtimeApiRequest, signSembliaPayload } from "./api-client.js";
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

describe("signSembliaPayload", () => {
  it("creates the public-submit HMAC header format api_v2 expects", () => {
    const rawBody = '{"answers":{"message":"Great"}}';
    const headers = signSembliaPayload({
      timestampSeconds: 1_710_000_000,
      rawBody,
      secret: "x".repeat(32),
    });
    const expected = createHmac("sha256", "x".repeat(32))
      .update(`v1.1710000000.${rawBody}`, "utf8")
      .digest("base64");

    expect(headers).toEqual({
      "x-semblia-signature": `sha256=${expected}`,
      "x-semblia-timestamp": "1710000000",
    });
  });
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
    });

    expect(result).toEqual({ snapshotId: "snapshot_123" });
  });

  it("signs unsigned JSON proxy requests with x-semblia-signature", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_710_000_000_000);
    const fetchMock = mockFetch(Response.json({ ok: true }));

    await runtimeApiRequest({
      env: apiEnv,
      method: "POST",
      path: "/runtime/forms/customer-feedback/submissions?projectId=project_1",
      rawBody: '{"answers":{"message":"Great"}}',
      headers: { origin: "https://forms.semblia.test" },
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.semblia.test/v2/runtime/forms/customer-feedback/submissions?projectId=project_1",
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
        "x-semblia-timestamp": "1710000000",
      }),
    );
    expect(
      (requestInit?.headers as Record<string, string> | undefined)?.[
        "x-semblia-signature"
      ],
    ).toMatch(/^sha256=/);
    expect(nowSpy).toHaveBeenCalled();
  });

  it("replaces caller-supplied signature headers with runtime signatures", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_710_000_000_000);
    const fetchMock = mockFetch(Response.json({ ok: true }));

    await runtimeApiRequest({
      env: apiEnv,
      method: "POST",
      path: "/runtime/forms/customer-feedback/submissions?projectId=project_1",
      rawBody: '{"answers":{}}',
      headers: {
        "x-semblia-signature": "sha256=caller",
        "x-semblia-timestamp": "1710000100",
      },
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(requestInit?.headers).toEqual(
      expect.objectContaining({
        "x-semblia-timestamp": "1710000000",
      }),
    );
    expect(
      (requestInit?.headers as Record<string, string> | undefined)?.[
        "x-semblia-signature"
      ],
    ).toMatch(/^sha256=/);
    expect(
      (requestInit?.headers as Record<string, string> | undefined)?.[
        "x-semblia-signature"
      ],
    ).not.toBe("sha256=caller");
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
      }),
    ).rejects.toThrow("api_v2 request failed: 403");
  });
});
