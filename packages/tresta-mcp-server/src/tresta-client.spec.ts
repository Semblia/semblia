import { beforeEach, describe, expect, it, vi } from "vitest";
import { TrestaApiError, TrestaClient } from "./tresta-client.js";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("TrestaClient", () => {
  it("sends JSON requests with the configured agent key", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ slug: "launch" }] }));

    const client = new TrestaClient({
      baseUrl: "https://api.tresta.test/v2/",
      agentKey: "tr_agent_secret",
    });

    await client.get("/projects", {
      query: { page: 1, pageSize: 20, search: "launch board" },
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.tresta.test/v2/projects?page=1&pageSize=20&search=launch+board",
    );
    expect(init).toMatchObject({
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: "Bearer tr_agent_secret",
      },
    });
  });

  it("serializes POST bodies as JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "ann_1" }));

    const client = new TrestaClient({
      baseUrl: "https://api.tresta.test",
      agentKey: "tr_agent_secret",
    });

    await client.post("/projects/demo/responses/sub_1/annotations", {
      note: "Needs follow-up",
      labels: ["urgent"],
    });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      "content-type": "application/json",
    });
    expect(init?.body).toBe(
      JSON.stringify({ note: "Needs follow-up", labels: ["urgent"] }),
    );
  });

  it("throws a structured error for non-2xx API responses", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Missing capability: VIEW_PROJECT" }, 403),
    );

    const client = new TrestaClient({
      baseUrl: "https://api.tresta.test",
      agentKey: "tr_agent_secret",
    });

    await expect(client.get("/projects/demo")).rejects.toMatchObject({
      status: 403,
      message: "Missing capability: VIEW_PROJECT",
      body: { message: "Missing capability: VIEW_PROJECT" },
    } satisfies Partial<TrestaApiError>);
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
