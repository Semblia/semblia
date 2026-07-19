import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultWidgetDefinition,
  publishWidgetDefinition,
} from "@workspace/widgets-core/schema";
import {
  fetchProjectWall,
  PublicWallUnavailableError,
  resolveProjectWallHost,
} from "@/lib/walls/public-wall";

const hostname = "acme.walls.semblia.com";
const resolution = {
  id: "host_1",
  hostname,
  feature: "WALL",
  requestedHostname: hostname,
  canonicalHostname: hostname,
  canonicalUrl: `https://${hostname}`,
  isCanonical: true,
  resourceType: "PROJECT",
  resourceId: "project_1",
  isDefault: true,
  project: {
    id: "project_1",
    slug: "acme",
    name: "Acme",
    logo: null,
    brandColorPrimary: null,
    brandColorSecondary: null,
    websiteUrl: null,
  },
  walls: [
    {
      widgetId: "widget_1",
      wallSlug: "proof",
      title: "Proof",
      subhead: "",
      endpoint: "/v2/walls/proof",
      isPrimaryWall: true,
      publicUrl: `https://${hostname}`,
    },
  ],
};
const envelope = (data: unknown) =>
  ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ success: true, data }),
  }) as unknown as Response;

afterEach(() => vi.unstubAllGlobals());

describe("host-bound public wall data", () => {
  it("normalizes the host, uses no-store resolution, and rejects a malformed envelope", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(envelope(resolution))
      .mockResolvedValueOnce(envelope({ success: false }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      resolveProjectWallHost("ACME.walls.semblia.com.:3000"),
    ).resolves.toMatchObject({ requestedHostname: hostname });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`hostname=${hostname}`),
      expect.objectContaining({ cache: "no-store" }),
    );
    await expect(resolveProjectWallHost(hostname)).rejects.toBeInstanceOf(
      PublicWallUnavailableError,
    );
  });

  it("fails closed for exact/deep hosts, network failures, and malformed payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      resolveProjectWallHost("walls.semblia.com"),
    ).resolves.toBeNull();
    await expect(
      resolveProjectWallHost("deep.acme.walls.semblia.com"),
    ).resolves.toBeNull();
    await expect(fetchProjectWall(hostname, "proof")).rejects.toBeInstanceOf(
      PublicWallUnavailableError,
    );
  });

  it("rejects malformed successful resolver and wall payloads", async () => {
    const definition = {
      ...defaultWidgetDefinition(),
      kind: "wall" as const,
      layout: { preset: "wall" as const },
      wall: { slug: "proof", title: "Proof", subhead: "" },
    };
    const validWall = {
      widget: {
        id: "widget_1",
        name: "Proof",
        wall: definition.wall,
        definition,
        publishedSnapshot: publishWidgetDefinition(definition, {
          resolvedAt: new Date("2026-01-01"),
        }),
        behavior: { showBranding: true },
      },
      project: { name: "Acme", websiteUrl: null },
      testimonials: [],
      seo: {
        canonicalUrl: `https://${hostname}`,
        indexable: true,
        reason: "INDEXABLE",
      },
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          envelope({ ...resolution, canonicalUrl: "http://unsafe" }),
        )
        .mockResolvedValueOnce(
          envelope({
            ...validWall,
            widget: { ...validWall.widget, definition: {} },
          }),
        ),
    );
    await expect(resolveProjectWallHost(hostname)).rejects.toBeInstanceOf(
      PublicWallUnavailableError,
    );
    await expect(fetchProjectWall(hostname, "proof")).rejects.toBeInstanceOf(
      PublicWallUnavailableError,
    );
  });
});
