import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  fetchWall: vi.fn(),
}));
const state = vi.hoisted(() => ({
  resolution: null as unknown,
  walls: new Map<string, unknown>(),
}));

vi.mock("@/lib/walls/public-wall", () => ({
  PublicWallUnavailableError: class PublicWallUnavailableError extends Error {},
  resolveProjectWallHost: mocks.resolve,
  fetchProjectWall: mocks.fetchWall,
}));

const resolver = (
  walls: Array<{ wallSlug: string; isPrimaryWall: boolean }>,
  canonicalHostname = "alpha.walls.semblia.com",
) => ({
  canonicalHostname,
  canonicalUrl: `https://${canonicalHostname}`,
  walls: walls.map((wall) => ({
    widgetId: wall.wallSlug,
    title: wall.wallSlug,
    subhead: "",
    endpoint: "",
    publicUrl: null,
    ...wall,
  })),
});

const payload = (canonicalUrl: string, indexable = true) => ({
  seo: { canonicalUrl, indexable, reason: indexable ? "INDEXABLE" : "PRIVATE" },
});

const request = (host: string, path = "/") =>
  new Request(`https://internal${path}`, { headers: { host } });

const oversizedResolverWalls = () => [
  ...Array.from({ length: 105 }, (_, index) => ({
    wallSlug: `wall-${index.toString().padStart(3, "0")}`,
    isPrimaryWall: false,
  })),
  { wallSlug: "primary", isPrimaryWall: true },
];

function installConcurrentFetchProbe() {
  let active = 0;
  let maximum = 0;
  mocks.fetchWall.mockImplementation(async (_host: string, slug: string) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await Promise.resolve();
    active -= 1;
    return payload(
      slug === "primary"
        ? "https://canonical.walls.semblia.com"
        : `https://canonical.walls.semblia.com/w/${slug}`,
    );
  });
  return () => maximum;
}

describe("hosted robots and sitemap", () => {
  beforeEach(() => {
    state.resolution = resolver([{ wallSlug: "proof", isPrimaryWall: true }]);
    state.walls.clear();
    state.walls.set("proof", payload("https://alpha.walls.semblia.com"));
    mocks.resolve.mockReset();
    mocks.resolve.mockImplementation(async () => state.resolution);
    mocks.fetchWall.mockReset();
    mocks.fetchWall.mockImplementation(
      async (_host: string, slug: string) => state.walls.get(slug) ?? null,
    );
  });

  it("is force-dynamic and rejects exact, deep, and control-plane hosts", async () => {
    const robots = await import("@/app/%5Fwall-host/robots.txt/route");
    const sitemap = await import("@/app/%5Fwall-host/sitemap.xml/route");

    expect(robots.dynamic).toBe("force-dynamic");
    expect(sitemap.dynamic).toBe("force-dynamic");
    for (const host of [
      "walls.semblia.com",
      "deep.alpha.walls.semblia.com",
      "app.semblia.com",
    ]) {
      const robotsResponse = await robots.GET(
        request(host, "/_wall-host/robots.txt"),
      );
      const sitemapResponse = await sitemap.GET(
        request(host, "/_wall-host/sitemap.xml"),
      );

      expect(robotsResponse.status).toBe(404);
      expect(robotsResponse.headers.get("cache-control")).toBe(
        "private, no-store",
      );
      expect(robotsResponse.headers.get("content-type")).toContain(
        "text/plain",
      );
      expect(sitemapResponse.status).toBe(404);
      expect(sitemapResponse.headers.get("cache-control")).toBe(
        "private, no-store",
      );
      expect(sitemapResponse.headers.get("content-type")).toContain(
        "application/xml",
      );
    }
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.fetchWall).not.toHaveBeenCalled();
  });

  it("returns no-store 404 when the actual resolver reports an unknown or retired host", async () => {
    mocks.resolve.mockResolvedValue(null);
    const robots = await import("@/app/%5Fwall-host/robots.txt/route");
    const sitemap = await import("@/app/%5Fwall-host/sitemap.xml/route");

    const robotsResponse = await robots.GET(
      request("unknown.walls.semblia.com", "/robots.txt"),
    );
    const sitemapResponse = await sitemap.GET(
      request("unknown.walls.semblia.com", "/sitemap.xml"),
    );

    expect(robotsResponse.status).toBe(404);
    expect(sitemapResponse.status).toBe(404);
    expect(robotsResponse.headers.get("cache-control")).toBe(
      "private, no-store",
    );
    expect(sitemapResponse.headers.get("cache-control")).toBe(
      "private, no-store",
    );
    expect(mocks.fetchWall).not.toHaveBeenCalled();
  });

  it("returns no-store 503 when the actual resolver is unavailable", async () => {
    mocks.resolve.mockRejectedValue(new Error("resolver unavailable"));
    const robots = await import("@/app/%5Fwall-host/robots.txt/route");
    const sitemap = await import("@/app/%5Fwall-host/sitemap.xml/route");

    const robotsResponse = await robots.GET(
      request("alpha.walls.semblia.com", "/robots.txt"),
    );
    const sitemapResponse = await sitemap.GET(
      request("alpha.walls.semblia.com", "/sitemap.xml"),
    );

    expect(robotsResponse.status).toBe(503);
    expect(sitemapResponse.status).toBe(503);
    expect(robotsResponse.headers.get("cache-control")).toBe(
      "private, no-store",
    );
    expect(sitemapResponse.headers.get("cache-control")).toBe(
      "private, no-store",
    );
    expect(robotsResponse.headers.get("content-type")).toContain("text/plain");
    expect(sitemapResponse.headers.get("content-type")).toContain(
      "application/xml",
    );
  });

  it("allows an eligible host and advertises only its canonical sitemap", async () => {
    state.resolution = resolver(
      [
        { wallSlug: "proof", isPrimaryWall: true },
        { wallSlug: "private", isPrimaryWall: false },
      ],
      "canonical.walls.semblia.com",
    );
    state.walls.set("proof", payload("https://canonical.walls.semblia.com"));
    state.walls.set(
      "private",
      payload("https://canonical.walls.semblia.com/w/private", false),
    );
    const robots = await import("@/app/%5Fwall-host/robots.txt/route");

    const response = await robots.GET(
      request("alpha.walls.semblia.com", "/robots.txt"),
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(text).toContain("Allow: /");
    expect(text).not.toContain("Disallow: /");
    expect(text).toContain(
      "Sitemap: https://canonical.walls.semblia.com/sitemap.xml",
    );
    expect(text).not.toContain("alpha.walls.semblia.com/sitemap.xml");
    expect(mocks.fetchWall.mock.calls).toEqual([
      ["alpha.walls.semblia.com", "proof"],
      ["alpha.walls.semblia.com", "private"],
    ]);
  });

  it("disallows an active host when none of its bounded wall list is indexable", async () => {
    state.resolution = resolver([
      { wallSlug: "proof", isPrimaryWall: true },
      { wallSlug: "private", isPrimaryWall: false },
    ]);
    state.walls.set("proof", payload("https://alpha.walls.semblia.com", false));
    state.walls.set(
      "private",
      payload("https://alpha.walls.semblia.com/w/private", false),
    );
    const robots = await import("@/app/%5Fwall-host/robots.txt/route");

    const response = await robots.GET(
      request("alpha.walls.semblia.com", "/robots.txt"),
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("Disallow: /");
    expect(text).not.toContain("Sitemap:");
    expect(mocks.fetchWall).toHaveBeenCalledTimes(2);
  });

  it("emits only query-free canonical indexable URLs with bounded fan-out and XML escaping", async () => {
    state.resolution = resolver(
      [
        { wallSlug: "proof", isPrimaryWall: true },
        { wallSlug: "private", isPrimaryWall: false },
        { wallSlug: "case-study", isPrimaryWall: false },
        { wallSlug: "customer's-choice", isPrimaryWall: false },
      ],
      "canonical.walls.semblia.com",
    );
    state.walls.set("proof", payload("https://canonical.walls.semblia.com"));
    state.walls.set(
      "private",
      payload("https://canonical.walls.semblia.com/w/private", false),
    );
    state.walls.set(
      "case-study",
      payload("https://canonical.walls.semblia.com/w/case-study?a=1&b=2"),
    );
    state.walls.set(
      "customer's-choice",
      payload("https://canonical.walls.semblia.com/w/customer's-choice"),
    );
    const sitemap = await import("@/app/%5Fwall-host/sitemap.xml/route");

    const response = await sitemap.GET(
      request("alpha.walls.semblia.com", "/sitemap.xml"),
    );
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(xml).toContain("https://canonical.walls.semblia.com");
    expect(xml).toContain(
      "https://canonical.walls.semblia.com/w/customer&apos;s-choice",
    );
    expect(xml).not.toContain("/w/private");
    expect(xml).not.toContain("/w/case-study");
    expect(xml).not.toContain("?a=1");
    expect(xml).not.toContain("alpha.walls.semblia.com");
    expect(mocks.fetchWall.mock.calls).toEqual([
      ["alpha.walls.semblia.com", "proof"],
      ["alpha.walls.semblia.com", "private"],
      ["alpha.walls.semblia.com", "case-study"],
      ["alpha.walls.semblia.com", "customer's-choice"],
    ]);
  });

  it("returns an empty successful sitemap when no resolver-owned wall is indexable", async () => {
    state.walls.set("proof", payload("https://alpha.walls.semblia.com", false));
    const sitemap = await import("@/app/%5Fwall-host/sitemap.xml/route");

    const response = await sitemap.GET(
      request("alpha.walls.semblia.com", "/sitemap.xml"),
    );
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
    expect(mocks.fetchWall).toHaveBeenCalledTimes(1);
  });

  it("caps sitemap fan-out, retains a late primary, and loads at most four walls concurrently", async () => {
    state.resolution = resolver(
      oversizedResolverWalls(),
      "canonical.walls.semblia.com",
    );
    const maximumConcurrency = installConcurrentFetchProbe();
    const sitemap = await import("@/app/%5Fwall-host/sitemap.xml/route");

    const response = await sitemap.GET(
      request("alpha.walls.semblia.com", "/sitemap.xml"),
    );
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(mocks.fetchWall).toHaveBeenCalledTimes(100);
    expect(maximumConcurrency()).toBe(4);
    expect(mocks.fetchWall.mock.calls[0]).toEqual([
      "alpha.walls.semblia.com",
      "primary",
    ]);
    expect(mocks.fetchWall).toHaveBeenCalledWith(
      "alpha.walls.semblia.com",
      "wall-098",
    );
    expect(mocks.fetchWall).not.toHaveBeenCalledWith(
      "alpha.walls.semblia.com",
      "wall-099",
    );
    expect(xml).toContain("https://canonical.walls.semblia.com</loc>");
    expect(xml).toContain("/w/wall-098</loc>");
    expect(xml).not.toContain("/w/wall-099");
  });

  it("uses the same capped, primary-first, four-wide loader for robots eligibility", async () => {
    state.resolution = resolver(
      oversizedResolverWalls(),
      "canonical.walls.semblia.com",
    );
    const maximumConcurrency = installConcurrentFetchProbe();
    const robots = await import("@/app/%5Fwall-host/robots.txt/route");

    const response = await robots.GET(
      request("alpha.walls.semblia.com", "/robots.txt"),
    );

    expect(response.status).toBe(200);
    expect(mocks.fetchWall).toHaveBeenCalledTimes(100);
    expect(maximumConcurrency()).toBe(4);
    expect(mocks.fetchWall.mock.calls[0]).toEqual([
      "alpha.walls.semblia.com",
      "primary",
    ]);
    expect(mocks.fetchWall).toHaveBeenCalledWith(
      "alpha.walls.semblia.com",
      "wall-098",
    );
    expect(mocks.fetchWall).not.toHaveBeenCalledWith(
      "alpha.walls.semblia.com",
      "wall-099",
    );
  });

  it("returns 503 when a resolver-owned wall lookup is unavailable", async () => {
    mocks.fetchWall.mockRejectedValue(new Error("wall unavailable"));
    const robots = await import("@/app/%5Fwall-host/robots.txt/route");
    const sitemap = await import("@/app/%5Fwall-host/sitemap.xml/route");

    const robotsResponse = await robots.GET(
      request("alpha.walls.semblia.com", "/robots.txt"),
    );
    const sitemapResponse = await sitemap.GET(
      request("alpha.walls.semblia.com", "/sitemap.xml"),
    );

    expect(robotsResponse.status).toBe(503);
    expect(sitemapResponse.status).toBe(503);
    expect(robotsResponse.headers.get("cache-control")).toBe(
      "private, no-store",
    );
    expect(sitemapResponse.headers.get("cache-control")).toBe(
      "private, no-store",
    );
  });

  it("keeps the control plane denied while precisely allowing legacy apex walls", async () => {
    const { default: controlPlaneRobots } = await import("@/app/robots");

    expect(controlPlaneRobots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/wall/",
        disallow: "/",
      },
    });
  });
});
