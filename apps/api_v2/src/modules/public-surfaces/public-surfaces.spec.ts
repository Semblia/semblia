import { RequestMethod } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service.js";
import { PublicSurfacesController } from "./public-surfaces.controller.js";
import { PublicSurfacesService } from "./public-surfaces.service.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

const mockPublicSurfaceHostFindFirst = vi.fn();
const mockWidgetFindMany = vi.fn();

const prismaMock = {
  client: {
    publicSurfaceHost: {
      findFirst: mockPublicSurfaceHostFindFirst,
    },
    widget: {
      findMany: mockWidgetFindMany,
    },
  },
} as unknown as PrismaService;

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
  it("resolves active collection hosts into project-scoped public endpoints", async () => {
    mockPublicSurfaceHostFindFirst.mockResolvedValue(
      publicSurfaceHostRecord({ feature: "COLLECTION" }),
    );

    const service = new PublicSurfacesService(prismaMock);
    await expect(
      service.resolve({
        hostname: "HTTPS://Acme.Testimonials.Tresta.App/collect",
      }),
    ).resolves.toMatchObject({
      hostname: "acme.testimonials.tresta.app",
      feature: "COLLECTION",
      canonicalUrl: "https://acme.testimonials.tresta.app",
      project: {
        slug: "acme",
      },
      endpoints: {
        forms: "/v2/forms/public/projects/acme",
        responses: "/v2/responses/public/projects/acme",
        wall: null,
      },
      walls: [],
    });

    expect(mockPublicSurfaceHostFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          hostname: "acme.testimonials.tresta.app",
          status: "ACTIVE",
        },
      }),
    );
    expect(mockWidgetFindMany).not.toHaveBeenCalled();
  });

  it("resolves wall hosts with available active wall resources", async () => {
    mockPublicSurfaceHostFindFirst.mockResolvedValue(
      publicSurfaceHostRecord({
        feature: "WALL",
        hostname: "acme.walls.tresta.app",
      }),
    );
    mockWidgetFindMany.mockResolvedValue([
      {
        id: "widget_1",
        wallSlug: "proof-wall",
        wallTitle: "Proof Wall",
        wallSubhead: "What teams say",
        name: "Wall",
      },
    ]);

    const service = new PublicSurfacesService(prismaMock);
    await expect(
      service.resolve({
        hostname: "acme.walls.tresta.app",
        feature: "WALL",
      }),
    ).resolves.toMatchObject({
      feature: "WALL",
      endpoints: {
        wall: "/v2/walls/proof-wall",
      },
      walls: [
        {
          widgetId: "widget_1",
          wallSlug: "proof-wall",
          endpoint: "/v2/walls/proof-wall",
        },
      ],
    });

    expect(mockWidgetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "project_1",
          kind: "WALL_OF_LOVE",
          isActive: true,
        }),
      }),
    );
  });
});

function publicSurfaceHostRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "host_1",
    projectId: "project_1",
    feature: "COLLECTION",
    resourceType: "PROJECT",
    resourceId: null,
    hostname: "acme.testimonials.tresta.app",
    isDefault: true,
    status: "ACTIVE",
    project: {
      id: "project_1",
      slug: "acme",
      name: "Acme",
      logoUrl: null,
      brandColorPrimary: "#111111",
      brandColorSecondary: "#ffffff",
      websiteUrl: "https://acme.example",
    },
    ...overrides,
  };
}
