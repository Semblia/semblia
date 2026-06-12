import { describe, expect, it, vi } from "vitest";
import { registerSembliaResources } from "./resources.js";

describe("registerSembliaResources", () => {
  it("registers project, summary, response, and delivery resources", async () => {
    const client = {
      listProjects: vi.fn().mockResolvedValue({ data: [{ slug: "demo" }] }),
      getProjectSummary: vi.fn().mockResolvedValue({ slug: "demo" }),
      listResponses: vi.fn().mockResolvedValue({ data: [] }),
      listDeliveryFailures: vi.fn().mockResolvedValue({ data: [] }),
    };
    const resources = new Map<string, ResourceRegistration>();
    const server = {
      registerResource: vi.fn(
        (
          name: string,
          uriOrTemplate: unknown,
          config: unknown,
          readCallback: ResourceRegistration["readCallback"],
        ) => {
          resources.set(name, { uriOrTemplate, config, readCallback });
        },
      ),
    };

    registerSembliaResources(server as never, client);

    expect([...resources.keys()]).toEqual([
      "semblia_projects",
      "semblia_project_summary",
      "semblia_project_responses",
      "semblia_project_delivery_failures",
    ]);

    const result = await resources
      .get("semblia_project_summary")
      ?.readCallback(new URL("semblia://projects/demo/summary"), {
        slug: "demo",
      });

    expect(client.getProjectSummary).toHaveBeenCalledWith("demo");
    expect(result?.contents[0]?.uri).toBe("semblia://projects/demo/summary");
    expect(result?.contents[0]?.text).toContain('"slug": "demo"');
  });
});

type ResourceRegistration = {
  uriOrTemplate: unknown;
  config: unknown;
  readCallback: (
    uri: URL,
    variables: Record<string, string>,
  ) => Promise<{ contents: Array<{ uri: string; text: string }> }>;
};
