import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  defaultWidgetDefinition,
  publishWidgetDefinition,
} from "@workspace/widgets-core/schema";

const state = vi.hoisted(() => ({
  host: "alpha.walls.semblia.com",
  resolution: null as unknown,
  wall: null as unknown,
  legacyWall: null as unknown,
}));
const mocks = vi.hoisted(() => ({
  resolve: vi.fn(async () => state.resolution),
  fetchHostWall: vi.fn(async () => state.wall),
  fetchLegacyWall: vi.fn(async () => state.legacyWall),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: state.host }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/lib/walls/public-wall", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/walls/public-wall")>();
  return {
    ...actual,
    resolveProjectWallHost: mocks.resolve,
    fetchProjectWall: mocks.fetchHostWall,
    fetchPublicWall: mocks.fetchLegacyWall,
  };
});

const wall = (
  slug = "proof",
  canonicalUrl = "https://alpha.walls.semblia.com",
) => {
  const definition = {
    ...defaultWidgetDefinition(),
    kind: "wall" as const,
    layout: { preset: "wall" as const },
    wall: { slug, title: "Proof", subhead: "" },
  };
  return {
    widget: {
      id: "widget",
      name: "Proof",
      wall: definition.wall,
      definition,
      publishedSnapshot: publishWidgetDefinition(definition, {
        resolvedAt: new Date("2026-01-01"),
      }),
      behavior: { showBranding: true },
    },
    project: {
      name: canonicalUrl.includes("beta") ? "Beta" : "Alpha",
      websiteUrl: null,
    },
    testimonials: [],
    seo: { canonicalUrl, indexable: true, reason: "INDEXABLE" },
  };
};

const resolver = (
  walls: Array<{ wallSlug: string; isPrimaryWall: boolean }>,
) => ({
  walls: walls.map((item) => ({
    widgetId: item.wallSlug,
    title: item.wallSlug,
    subhead: "",
    endpoint: "",
    publicUrl: null,
    ...item,
  })),
});

describe("hosted wall pages", () => {
  beforeEach(() => {
    state.host = "alpha.walls.semblia.com";
    state.resolution = resolver([{ wallSlug: "proof", isPrimaryWall: true }]);
    state.wall = wall();
    state.legacyWall = wall(
      "proof",
      "https://activation-target.walls.semblia.com",
    );
    mocks.resolve.mockClear();
    mocks.fetchHostWall.mockClear();
    mocks.fetchLegacyWall.mockClear();
  });

  it("renders the resolver primary at root and exposes force-dynamic", async () => {
    const page = await import("@/app/%5Fwall-host/page");

    expect(page.dynamic).toBe("force-dynamic");
    expect(renderToStaticMarkup(await page.default())).toContain("Proof");
    expect(mocks.resolve).toHaveBeenCalledWith("alpha.walls.semblia.com");
    expect(mocks.fetchHostWall).toHaveBeenCalledWith(
      "alpha.walls.semblia.com",
      "proof",
    );
  });

  it("allows only resolver-owned additional walls", async () => {
    state.resolution = resolver([
      { wallSlug: "proof", isPrimaryWall: true },
      { wallSlug: "archive", isPrimaryWall: false },
    ]);
    state.wall = wall("archive", "https://alpha.walls.semblia.com/w/archive");
    const page = await import("@/app/%5Fwall-host/w/[wallSlug]/page");

    expect(page.dynamic).toBe("force-dynamic");
    expect(
      renderToStaticMarkup(
        await page.default({
          params: Promise.resolve({ wallSlug: "archive" }),
        }),
      ),
    ).toContain("Proof");
    await expect(
      page.default({ params: Promise.resolve({ wallSlug: "other" }) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(mocks.fetchHostWall).toHaveBeenCalledTimes(1);
  });

  it.each([
    "walls.semblia.com",
    "deep.alpha.walls.semblia.com",
    "app.semblia.com",
  ])("rejects direct internal page selection for Host %s", async (host) => {
    state.host = host;
    const root = await import("@/app/%5Fwall-host/page");
    const additional = await import("@/app/%5Fwall-host/w/[wallSlug]/page");

    await expect(root.default()).rejects.toThrow("NOT_FOUND");
    await expect(
      additional.default({ params: Promise.resolve({ wallSlug: "proof" }) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.fetchHostWall).not.toHaveBeenCalled();
  });

  it.each([
    { walls: [] },
    {
      walls: [
        { wallSlug: "proof", isPrimaryWall: true },
        { wallSlug: "other", isPrimaryWall: true },
      ],
    },
  ])(
    "fails closed unless there is exactly one primary wall",
    async ({ walls }) => {
      state.resolution = resolver(walls);
      const page = await import("@/app/%5Fwall-host/page");

      await expect(page.default()).rejects.toThrow("NOT_FOUND");
      expect(mocks.fetchHostWall).not.toHaveBeenCalled();
    },
  );

  it("keeps alternating same-slug host reads isolated", async () => {
    const page = await import("@/app/%5Fwall-host/page");

    state.host = "alpha.walls.semblia.com";
    state.wall = wall("proof", "https://alpha.walls.semblia.com");
    expect(renderToStaticMarkup(await page.default())).toContain("Alpha");
    state.host = "beta.walls.semblia.com";
    state.wall = wall("proof", "https://beta.walls.semblia.com");
    expect(renderToStaticMarkup(await page.default())).toContain("Beta");

    expect(mocks.resolve.mock.calls).toEqual([
      ["alpha.walls.semblia.com"],
      ["beta.walls.semblia.com"],
    ]);
    expect(mocks.fetchHostWall.mock.calls).toEqual([
      ["alpha.walls.semblia.com", "proof"],
      ["beta.walls.semblia.com", "proof"],
    ]);
  });

  it("keeps the legacy apex canonical while reusing the shared page", async () => {
    const page = await import("@/app/wall/[wallSlug]/page");
    const props = { params: Promise.resolve({ wallSlug: "proof" }) };

    const metadata = await page.generateMetadata(props);
    const html = renderToStaticMarkup(await page.default(props));

    expect(metadata.alternates?.canonical).toBe(
      "https://semblia.com/wall/proof",
    );
    expect(metadata.openGraph?.url).toBe("https://semblia.com/wall/proof");
    expect(html).toContain("https://semblia.com/wall/proof");
    expect(html).not.toContain("activation-target.walls.semblia.com");
    expect(mocks.fetchLegacyWall).toHaveBeenCalledTimes(2);
  });
});
