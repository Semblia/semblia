import { describe, expect, it, vi } from "vitest";
import { registerTrestaResources } from "./resources.js";

describe("registerTrestaResources", () => {
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

    registerTrestaResources(server as never, client);

    expect([...resources.keys()]).toEqual([
      "tresta_projects",
      "tresta_project_summary",
      "tresta_project_responses",
      "tresta_project_delivery_failures",
    ]);

    const result = await resources
      .get("tresta_project_summary")
      ?.readCallback(new URL("tresta://projects/demo/summary"), {
        slug: "demo",
      });

    expect(client.getProjectSummary).toHaveBeenCalledWith("demo");
    expect(result?.contents[0]?.uri).toBe("tresta://projects/demo/summary");
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
