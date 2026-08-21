import { describe, expect, it, vi } from "vitest";
import { SembliaApiError, SembliaClient } from "./client.js";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function clientWith(response: Response) {
  const fetchImpl = vi.fn().mockResolvedValue(response);
  const client = new SembliaClient({
    apiKey: "tsk_live_a1b2c3d4.secret",
    baseUrl: "https://api.example.test/v2",
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { client, fetchImpl };
}

describe("SembliaClient", () => {
  it("refuses a blank credential", () => {
    expect(() => new SembliaClient({ apiKey: "  " })).toThrow(
      "requires an apiKey",
    );
  });

  it("sends the bearer credential and unwraps the envelope", async () => {
    const { client, fetchImpl } = clientWith(
      jsonResponse({
        success: true,
        data: { items: [], total: 0, page: 1 },
        meta: { timestamp: "2026-08-21T00:00:00Z" },
      }),
    );

    const data = await client.projects.list({ page: 2 });

    expect(data).toEqual({ items: [], total: 0, page: 1 });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.test/v2/projects?page=2");
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer tsk_live_a1b2c3d4.secret",
    );
  });

  it("keeps the raw envelope available via requestRaw", async () => {
    const envelope = {
      success: true,
      data: [{ id: "form_1" }],
      meta: { timestamp: "2026-08-21T00:00:00Z" },
    };
    const { client } = clientWith(jsonResponse(envelope));

    await expect(client.requestRaw("/projects/acme/forms")).resolves.toEqual(
      envelope,
    );
  });

  it("maps the API error envelope onto SembliaApiError", async () => {
    const { client } = clientWith(
      jsonResponse(
        {
          success: false,
          error: { code: "FORM_NOT_HOSTED", message: "Form is not hosted" },
        },
        409,
      ),
    );

    const failure = await client.formRequests
      .create("acme", { formId: "form_1", emails: ["a@example.com"] })
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(failure).toBeInstanceOf(SembliaApiError);
    const apiError = failure as SembliaApiError;
    expect(apiError.status).toBe(409);
    expect(apiError.code).toBe("FORM_NOT_HOSTED");
    expect(apiError.message).toBe("Form is not hosted");
  });

  it("encodes path segments and serializes JSON bodies", async () => {
    const { client, fetchImpl } = clientWith(
      jsonResponse({ success: true, data: {}, meta: { timestamp: "t" } }),
    );

    await client.responses.annotate("my org/proj", "resp/1", {
      note: "great",
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.example.test/v2/projects/my%20org%2Fproj/responses/resp%2F1/annotations",
    );
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ note: "great" }));
    expect((init.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
  });

  it("returns non-envelope bodies as-is", async () => {
    const { client } = clientWith(jsonResponse([{ id: "req_1" }]));

    await expect(client.formRequests.list("acme")).resolves.toEqual([
      { id: "req_1" },
    ]);
  });
});
