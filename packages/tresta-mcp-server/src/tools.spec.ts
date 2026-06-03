import { describe, expect, it, vi } from "vitest";
import { registerTrestaTools, TRESTA_TOOL_NAMES } from "./tools.js";

describe("registerTrestaTools", () => {
  it("registers the launch-safe Task 6 MCP tools and excludes unsafe actions", () => {
    const { tools } = registerWithFakeServer();

    expect([...tools.keys()]).toEqual(TRESTA_TOOL_NAMES);
    expect(tools.has("delete_project")).toBe(false);
    expect(tools.has("manage_billing")).toBe(false);
    expect(tools.has("rewrite_response")).toBe(false);
    expect(tools.has("reveal_secret")).toBe(false);
    expect(tools.has("tresta_publish_response")).toBe(false);
  });

  it("maps read tools to existing private API client calls", async () => {
    const client = fakeClient({
      listResponses: vi.fn().mockResolvedValue({ data: [{ id: "sub_1" }] }),
    });
    const { tools } = registerWithFakeServer(client);

    const result = await tools.get("tresta_list_responses")?.handler({
      slug: "demo",
      limit: 5,
    });

    expect(client.listResponses).toHaveBeenCalledWith("demo", {
      pageSize: 5,
    });
    expect(result?.content[0]?.text).toContain("sub_1");
  });

  it("routes CSV and native export triggers to the existing API shapes", async () => {
    const client = fakeClient({
      createCsvExport: vi.fn().mockResolvedValue({ id: "csv_1" }),
      createNativeIntegrationExport: vi
        .fn()
        .mockResolvedValue({ id: "native_1" }),
    });
    const { tools } = registerWithFakeServer(client);

    await tools.get("tresta_trigger_export")?.handler({
      slug: "demo",
      destinationType: "csv",
      filename: "feedback.csv",
    });
    await tools.get("tresta_trigger_export")?.handler({
      slug: "demo",
      destinationType: "native_integration",
      connectionId: "conn_1",
      eventType: "submission.moderated",
      payload: { title: "Great feedback" },
    });

    expect(client.createCsvExport).toHaveBeenCalledWith("demo", {
      filename: "feedback.csv",
    });
    expect(client.createNativeIntegrationExport).toHaveBeenCalledWith(
      "demo",
      "conn_1",
      {
        eventType: "submission.moderated",
        payload: { title: "Great feedback" },
      },
    );
  });

  it("returns MCP tool errors without hiding API failures", async () => {
    const client = fakeClient({
      getProjectAnalytics: vi
        .fn()
        .mockRejectedValue(new Error("HTTP 404: Not Found")),
    });
    const { tools } = registerWithFakeServer(client);

    const result = await tools
      .get("tresta_get_project_analytics")
      ?.handler({ slug: "demo" });

    expect(result).toMatchObject({
      isError: true,
      content: [{ type: "text", text: "HTTP 404: Not Found" }],
    });
  });
});

function registerWithFakeServer(client = fakeClient()) {
  const tools = new Map<
    string,
    {
      config: unknown;
      handler: (args: Record<string, unknown>) => Promise<{
        content: Array<{ type: "text"; text: string }>;
        isError?: boolean;
      }>;
    }
  >();
  const server = {
    registerTool: vi.fn((name: string, config: unknown, handler: never) => {
      tools.set(name, { config, handler });
    }),
  };

  registerTrestaTools(server as never, client);
  return { tools, server };
}

function fakeClient(overrides: Record<string, unknown> = {}) {
  return {
    listProjects: vi.fn().mockResolvedValue({ data: [] }),
    getProject: vi.fn().mockResolvedValue({ id: "project_1" }),
    listResponses: vi.fn().mockResolvedValue({ data: [] }),
    getResponse: vi.fn().mockResolvedValue({ id: "submission_1" }),
    annotateResponse: vi.fn().mockResolvedValue({ id: "annotation_1" }),
    moderateResponse: vi.fn().mockResolvedValue({ id: "submission_1" }),
    getProjectAnalytics: vi.fn().mockResolvedValue({ totals: {} }),
    listExportDestinations: vi.fn().mockResolvedValue({ data: [] }),
    createCsvExport: vi.fn().mockResolvedValue({ id: "csv_1" }),
    createNativeIntegrationExport: vi
      .fn()
      .mockResolvedValue({ id: "native_1" }),
    listDeliveryFailures: vi.fn().mockResolvedValue({ data: [] }),
    ...overrides,
  };
}
