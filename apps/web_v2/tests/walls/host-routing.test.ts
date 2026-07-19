import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  defaultWidgetDefinition,
  publishWidgetDefinition,
} from "@workspace/widgets-core/schema";
import {
  normalizeWallHostname,
  projectWallHostname,
} from "@/lib/walls/host-routing";

const clerkInvocation = vi.hoisted(() => vi.fn());
const response = (status: number, data?: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
  }) as unknown as Response;
const wallPayload = (slug: string) => {
  const definition = {
    ...defaultWidgetDefinition(),
    kind: "wall" as const,
    layout: { preset: "wall" as const },
    wall: { slug, title: "Proof", subhead: "" },
  };
  return {
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
      canonicalUrl: `https://acme.walls.semblia.com${slug === "proof" ? "" : `/w/${slug}`}`,
      indexable: true,
      reason: "INDEXABLE",
    },
  };
};
const resolver = (
  walls: Array<{ wallSlug: string; isPrimaryWall: boolean }>,
) => ({
  id: "host_1",
  hostname: "acme.walls.semblia.com",
  feature: "WALL",
  requestedHostname: "acme.walls.semblia.com",
  canonicalHostname: "acme.walls.semblia.com",
  canonicalUrl: "https://acme.walls.semblia.com",
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
  walls: walls.map((wall) => ({
    widgetId: `widget_${wall.wallSlug}`,
    title: wall.wallSlug,
    subhead: "",
    endpoint: `/v2/walls/${wall.wallSlug}`,
    publicUrl: wall.isPrimaryWall
      ? "https://acme.walls.semblia.com"
      : `https://acme.walls.semblia.com/w/${wall.wallSlug}`,
    ...wall,
  })),
});
vi.mock("@clerk/nextjs/server", () => ({
  createRouteMatcher: () => () => false,
  clerkMiddleware:
    (
      handler: (
        auth: () => Promise<{ isAuthenticated: boolean }>,
        request: NextRequest,
      ) => unknown,
    ) =>
    async (request: NextRequest) => {
      clerkInvocation();
      const auth = Object.assign(async () => ({ isAuthenticated: false }), {
        protect: vi.fn(),
      });
      return handler(auth, request);
    },
}));

describe("project wall host boundary", () => {
  it("uses only normalized exact one-label project hosts", () => {
    expect(normalizeWallHostname("ACME.walls.semblia.com.:3000")).toBe(
      "acme.walls.semblia.com",
    );
    expect(normalizeWallHostname("acme.walls.semblia.com:70000")).toBeNull();
    expect(projectWallHostname("ACME.walls.semblia.com.:443")).toBe(
      "acme.walls.semblia.com",
    );
    expect(projectWallHostname("walls.semblia.com")).toBeNull();
    expect(projectWallHostname("deep.acme.walls.semblia.com")).toBeNull();
    expect(projectWallHostname("acme.walls.semblia.com.evil.test")).toBeNull();
  });
});

describe("project wall proxy boundary", () => {
  beforeEach(() => clerkInvocation.mockClear());

  it.each([
    ["/robots.txt?source=bot", "/_wall-host/robots.txt?source=bot"],
    ["/sitemap.xml?source=bot", "/_wall-host/sitemap.xml?source=bot"],
  ])(
    "rewrites %s before Clerk while preserving query",
    async (path, expected) => {
      const { default: proxy } = await import("@/proxy");
      const response = await proxy(
        new NextRequest(`https://acme.walls.semblia.com${path}`, {
          headers: { host: "acme.walls.semblia.com" },
        }),
      );
      if (!response) throw new Error("proxy did not return a response");
      expect(response.headers.get("x-middleware-rewrite")).toContain(expected);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(clerkInvocation).not.toHaveBeenCalled();
    },
  );

  it("returns an opaque 404 before Clerk for unsupported project-host paths", async () => {
    const { default: proxy } = await import("@/proxy");
    const response = await proxy(
      new NextRequest("https://acme.walls.semblia.com/private?keep=1", {
        headers: {
          host: "acme.walls.semblia.com",
          "x-forwarded-host": "app.semblia.com",
        },
      }),
      {} as never,
    );
    if (!response) throw new Error("proxy did not return a response");
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(clerkInvocation).not.toHaveBeenCalled();
  });

  it("returns an opaque 404 before Clerk for the exact service host", async () => {
    const { default: proxy } = await import("@/proxy");
    const response = await proxy(
      new NextRequest("https://walls.semblia.com/robots.txt", {
        headers: {
          host: "walls.semblia.com",
          "x-forwarded-host": "acme.walls.semblia.com",
        },
      }),
    );
    if (!response) throw new Error("proxy did not return a response");
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(clerkInvocation).not.toHaveBeenCalled();
  });

  it.each([
    "app.semblia.com",
    "deep.acme.walls.semblia.com",
    "acme.walls.semblia.com.evil.test",
  ])(
    "keeps rejected project-wall lookalikes on the authenticated path: %s",
    async (host) => {
      const { default: proxy } = await import("@/proxy");
      await proxy(
        new NextRequest(`https://${host}/projects`, {
          headers: {
            host,
            "x-forwarded-host": "acme.walls.semblia.com",
          },
        }),
      );
      expect(clerkInvocation).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ["/?view=all", "/_wall-host?view=all", undefined],
    ["/w/archive?view=all", "/_wall-host/w/archive?view=all", "archive"],
  ])(
    "rewrites HTML %s only after host-bound preflight",
    async (path, expected, slug) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            response(200, {
              success: true,
              data: resolver([
                { wallSlug: "proof", isPrimaryWall: true },
                { wallSlug: "archive", isPrimaryWall: false },
              ]),
            }),
          )
          .mockResolvedValueOnce(
            response(200, {
              success: true,
              data: wallPayload(slug ?? "proof"),
            }),
          ),
      );
      const { default: proxy } = await import("@/proxy");
      const result = await proxy(
        new NextRequest(`https://acme.walls.semblia.com${path}`, {
          headers: { host: "acme.walls.semblia.com" },
        }),
      );
      if (!result) throw new Error("proxy did not return a response");
      expect(result.headers.get("x-middleware-rewrite")).toContain(expected);
      expect(result.headers.get("cache-control")).toBe("private, no-store");
      expect(clerkInvocation).not.toHaveBeenCalled();
    },
  );

  it.each([
    [response(404), undefined],
    [response(200, { success: true, data: resolver([]) }), undefined],
    [
      response(200, {
        success: true,
        data: resolver([
          { wallSlug: "proof", isPrimaryWall: true },
          { wallSlug: "other", isPrimaryWall: true },
        ]),
      }),
      undefined,
    ],
    [
      response(200, {
        success: true,
        data: resolver([{ wallSlug: "proof", isPrimaryWall: true }]),
      }),
      response(404),
    ],
    [response(503), undefined],
  ])(
    "returns private 404/503 for unavailable or invalid HTML preflight",
    async (first, second) => {
      const fetchMock = vi.fn().mockResolvedValueOnce(first);
      if (second) fetchMock.mockResolvedValueOnce(second);
      vi.stubGlobal("fetch", fetchMock);
      const { default: proxy } = await import("@/proxy");
      const result = await proxy(
        new NextRequest("https://acme.walls.semblia.com/?q=1", {
          headers: { host: "acme.walls.semblia.com" },
        }),
      );
      if (!result) throw new Error("proxy did not return a response");
      expect(result.headers.get("cache-control")).toBe("private, no-store");
      expect(result.status).toBe(first.status === 503 ? 503 : 404);
      expect(clerkInvocation).not.toHaveBeenCalled();
    },
  );
});
