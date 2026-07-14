import { NotFoundException, RequestMethod } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service.js";
import { PublicHostingObservabilityService } from "./public-hosting-observability.service.js";
import { PublicSurfacesController } from "./public-surfaces.controller.js";
import { PublicSurfacesService } from "./public-surfaces.service.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const mockHostFindFirst = vi.fn();
const mockHostFindMany = vi.fn();
const mockWidgetFindFirst = vi.fn();
const mockWidgetFindMany = vi.fn();
const mockFormFindFirst = vi.fn();

const prismaMock = {
  client: {
    publicSurfaceHost: {
      findFirst: mockHostFindFirst,
      findMany: mockHostFindMany,
    },
    widget: { findFirst: mockWidgetFindFirst, findMany: mockWidgetFindMany },
    form: { findFirst: mockFormFindFirst },
  },
} as unknown as PrismaService;

function host(overrides: Record<string, unknown> = {}) {
  return {
    id: "host_1",
    projectId: "project_1",
    feature: "COLLECTION",
    resourceType: "PROJECT",
    resourceId: "project_1",
    hostname: "acme.forms.semblia.com",
    isDefault: true,
    status: "ACTIVE",
    verifiedAt: new Date(),
    retiredAt: null,
    project: {
      id: "project_1",
      slug: "acme",
      name: "Acme",
      isActive: true,
      logoAsset: null,
      brandColorPrimary: "#111111",
      brandColorSecondary: "#ffffff",
    },
    ...overrides,
  };
}

function resolver(events = vi.fn()) {
  return {
    events,
    service: new PublicSurfacesService(
      prismaMock,
      undefined,
      new PublicHostingObservabilityService(events),
    ),
  };
}

function setValidHost(requested = host(), canonical = requested) {
  mockHostFindFirst.mockResolvedValue(requested);
  mockHostFindMany.mockResolvedValue([canonical]);
  mockWidgetFindMany.mockResolvedValue([]);
}

describe("PublicSurfacesController", () => {
  it("declares a public host resolution route", () => {
    expect(Reflect.getMetadata(PATH_METADATA, PublicSurfacesController)).toBe(
      "public-surfaces",
    );
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        PublicSurfacesController.prototype.resolve,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PublicSurfacesController.prototype.resolve,
      ),
    ).toBe("resolve");
  });
});

describe("PublicSurfacesService", () => {
  it("requires an explicit feature", async () => {
    const { publicSurfaceResolveQuerySchema } = await import(
      "./public-surfaces.dto.js"
    );
    expect(() =>
      publicSurfaceResolveQuerySchema.parse({
        hostname: "acme.forms.semblia.com",
      }),
    ).toThrow();
  });

  it("uses the exact normalized host and canonical default for an alias", async () => {
    const alias = host({
      hostname: "alias.forms.semblia.com",
      isDefault: false,
    });
    const canonical = host();
    setValidHost(alias, canonical);
    const { service, events } = resolver();

    await expect(
      service.resolveHost({
        hostname: "HTTPS://ALIAS.forms.semblia.com.:443",
        feature: "COLLECTION",
      }),
    ).resolves.toEqual({
      requestedHostname: "alias.forms.semblia.com",
      canonicalHostname: "acme.forms.semblia.com",
      canonicalUrl: "https://acme.forms.semblia.com",
      isCanonical: false,
      projectId: "project_1",
      feature: "COLLECTION",
      resourceType: "PROJECT",
      resourceId: "project_1",
    });
    expect(mockHostFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hostname: "alias.forms.semblia.com",
          feature: "COLLECTION",
        }),
      }),
    );
    expect(events).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "public_host_resolution",
        outcome: "hit",
        reason: "alias",
        metricValue: 1,
        hostname: "alias.forms.semblia.com",
        projectId: "project_1",
        feature: "COLLECTION",
      }),
    );
  });

  it("fails closed with the same opaque 404 for invalid host states and conflicting defaults", async () => {
    const invalidHosts = [
      host({ feature: "WALL" }),
      host({ status: "PENDING_VERIFICATION" }),
      host({ status: "DISABLED" }),
      host({ retiredAt: new Date() }),
      host({ verifiedAt: null }),
      host({ project: { ...host().project, isActive: false } }),
      host({ resourceType: "PROJECT", resourceId: "other_project" }),
      host({ projectId: null, project: null }),
    ];
    for (const candidate of invalidHosts) {
      vi.clearAllMocks();
      mockHostFindFirst.mockResolvedValue(candidate);
      mockHostFindMany.mockResolvedValue([candidate]);
      const { service } = resolver();
      await expect(
        service.resolveHost({
          hostname: "acme.forms.semblia.com",
          feature: "COLLECTION",
        }),
      ).rejects.toEqual(expect.any(NotFoundException));
    }

    vi.clearAllMocks();
    setValidHost();
    mockHostFindMany.mockResolvedValue([
      host(),
      host({ id: "host_2", hostname: "other.forms.semblia.com" }),
    ]);
    const { service } = resolver();
    await expect(
      service.resolveHost({
        hostname: "acme.forms.semblia.com",
        feature: "COLLECTION",
      }),
    ).rejects.toThrow("Public surface host not found");

    vi.clearAllMocks();
    mockHostFindFirst.mockResolvedValue(host());
    mockHostFindMany.mockResolvedValue([]);
    const { service: noDefaultService } = resolver();
    await expect(
      noDefaultService.resolveHost({
        hostname: "acme.forms.semblia.com",
        feature: "COLLECTION",
      }),
    ).rejects.toThrow("Public surface host not found");
  });

  it("rejects form and widget resource hosts whose resources belong to another project", async () => {
    for (const resourceType of ["FORM", "WIDGET"] as const) {
      vi.clearAllMocks();
      setValidHost(
        host({ resourceType, resourceId: `${resourceType.toLowerCase()}_1` }),
      );
      if (resourceType === "FORM") mockFormFindFirst.mockResolvedValue(null);
      else mockWidgetFindFirst.mockResolvedValue(null);
      const { service } = resolver();
      await expect(
        service.resolveHost({
          hostname: "acme.forms.semblia.com",
          feature: "COLLECTION",
        }),
      ).rejects.toThrow("Public surface host not found");
    }
  });

  it("returns safe branding and active published walls with a primary URL", async () => {
    setValidHost(host({ feature: "WALL", hostname: "acme.walls.semblia.com" }));
    mockWidgetFindMany.mockResolvedValue([
      {
        id: "wall_1",
        wallSlug: "proof",
        wallTitle: "Proof",
        wallSubhead: null,
        name: "Wall",
        isPrimaryWall: true,
      },
      {
        id: "wall_2",
        wallSlug: "more-proof",
        wallTitle: null,
        wallSubhead: "More",
        name: "More",
        isPrimaryWall: null,
      },
    ]);
    const { service } = resolver();
    await expect(
      service.resolve({ hostname: "acme.walls.semblia.com", feature: "WALL" }),
    ).resolves.toMatchObject({
      hostname: "acme.walls.semblia.com",
      canonicalHostname: "acme.walls.semblia.com",
      project: { name: "Acme", logo: null, brandColorPrimary: "#111111" },
      walls: [
        {
          widgetId: "wall_1",
          isPrimaryWall: true,
          publicUrl: "https://acme.walls.semblia.com",
        },
        {
          widgetId: "wall_2",
          isPrimaryWall: false,
          publicUrl: "https://acme.walls.semblia.com/w/more-proof",
        },
      ],
    });
    expect(mockWidgetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "project_1",
          isActive: true,
          publishedSnapshot: expect.anything(),
        }),
      }),
    );
  });
});
