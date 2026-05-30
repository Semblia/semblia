import { afterEach, describe, expect, it, vi } from "vitest";
import { runtimeApiPost, signRuntimeRequest } from "./api-client.js";
import type { FormsRuntimeEnv } from "./env.js";

const apiEnv: FormsRuntimeEnv = {
  FORMS_RUNTIME_MODE: "api",
  FORMS_RUNTIME_API_BASE_URL: "https://api.tresta.test/v2",
  FORMS_RUNTIME_SIGNING_SECRET: "s".repeat(32),
  FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: "collect.tresta.test",
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

describe("signRuntimeRequest", () => {
  it("creates a v1 HMAC signature over method, path, timestamp, and body hash", () => {
    const headers = signRuntimeRequest({
      method: "POST",
      path: "/runtime/forms/resolve",
      timestamp: 1710000000000,
      body: '{"ok":true}',
      secret: "x".repeat(32),
    });

    expect(headers["x-tresta-runtime"]).toBe("forms");
    expect(headers["x-tresta-runtime-timestamp"]).toBe("1710000000000");
    expect(headers["x-tresta-runtime-signature"]).toMatch(/^v1=[a-f0-9]{64}$/);
  });
});

describe("runtimeApiPost", () => {
  it("unwraps successful api_v2 response envelopes", async () => {
    mockFetch(
      Response.json({
        success: true,
        data: { formId: "form_123" },
        meta: { requestId: "req_123" },
      }),
    );

    const result = await runtimeApiPost<{ formId: string }>(
      apiEnv,
      "/runtime/forms/resolve",
      { host: "acme.collect.tresta.test" },
    );

    expect(result).toEqual({ formId: "form_123" });
  });

  it("preserves raw responses and runtime signing headers", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1710000000000);
    const fetchMock = mockFetch(Response.json({ redirectTo: null }));

    const result = await runtimeApiPost<{ redirectTo: string | null }>(
      apiEnv,
      "/runtime/forms/submit",
      { formId: "form_123" },
      { "x-tresta-original-path": "/feedback" },
    );

    expect(result).toEqual({ redirectTo: null });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.tresta.test/v2/runtime/forms/submit",
      expect.objectContaining({
        method: "POST",
        body: '{"formId":"form_123"}',
      }),
    );

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(requestInit?.headers).toEqual(
      expect.objectContaining({
        "content-type": "application/json",
        "x-tresta-runtime": "forms",
        "x-tresta-runtime-timestamp": "1710000000000",
        "x-tresta-original-path": "/feedback",
      }),
    );
    expect(
      (requestInit?.headers as Record<string, string> | undefined)?.[
        "x-tresta-runtime-signature"
      ],
    ).toMatch(/^v1=[a-f0-9]{64}$/);
    expect(nowSpy).toHaveBeenCalled();
  });

  it("throws sanitized non-OK errors that include the status only", async () => {
    mockFetch(
      Response.json(
        { success: false, error: { message: "secret upstream detail" } },
        { status: 403 },
      ),
    );

    await expect(
      runtimeApiPost(apiEnv, "/runtime/forms/resolve", {
        host: "acme.collect.tresta.test",
      }),
    ).rejects.toThrow("api_v2 request failed: 403");
  });
});
