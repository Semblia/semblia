import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PublicSurfaceFeature, WidgetType } from "@workspace/database/prisma";
import { PrismaService } from "../prisma/prisma.service.js";
import { MediaService } from "../storage/media.service.js";
import type { PublicSurfaceResolveQueryDto } from "./public-surfaces.dto.js";

const HOST_SELECT = {
  id: true,
  projectId: true,
  feature: true,
  resourceType: true,
  resourceId: true,
  hostname: true,
  isDefault: true,
  status: true,
  project: {
    select: {
      id: true,
      slug: true,
      name: true,
      logoAsset: true,
      brandColorPrimary: true,
      brandColorSecondary: true,
      websiteUrl: true,
    },
  },
} as const;

@Injectable()
export class PublicSurfacesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MediaService) private readonly mediaService?: MediaService,
  ) {}

  async resolve(query: PublicSurfaceResolveQueryDto) {
    const hostname = normalizeHostname(query.hostname);
    const host = await this.prisma.client.publicSurfaceHost.findFirst({
      where: {
        hostname,
        status: "ACTIVE",
        ...(query.feature ? { feature: query.feature } : {}),
      },
      select: HOST_SELECT,
    });

    if (!host || !host.projectId || !host.project) {
      throw new NotFoundException("Public surface host not found");
    }

    const walls =
      host.feature === PublicSurfaceFeature.WALL
        ? await this.listWallResources(host.projectId, host.resourceId)
        : [];

    return {
      id: host.id,
      hostname: host.hostname,
      feature: host.feature,
      resourceType: host.resourceType,
      resourceId: host.resourceId,
      isDefault: host.isDefault,
      canonicalUrl: `https://${host.hostname}`,
      project: {
        ...host.project,
        logo: this.mediaService?.toDto(host.project.logoAsset) ?? null,
        logoAsset: undefined,
      },
      endpoints: {
        forms:
          host.feature === PublicSurfaceFeature.COLLECTION
            ? `/v2/forms/public/projects/${host.project.slug}`
            : null,
        responses:
          host.feature === PublicSurfaceFeature.COLLECTION
            ? `/v2/responses/public/projects/${host.project.slug}`
            : null,
        wall: walls.length === 1 ? `/v2/walls/${walls[0]?.wallSlug}` : null,
      },
      walls,
    };
  }

  private async listWallResources(
    projectId: string,
    resourceId: string | null,
  ) {
    const widgets = await this.prisma.client.widget.findMany({
      where: {
        projectId,
        kind: WidgetType.WALL_OF_LOVE,
        isActive: true,
        wallSlug: { not: null },
        ...(resourceId ? { id: resourceId } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        wallSlug: true,
        wallTitle: true,
        wallSubhead: true,
        name: true,
      },
    });

    return widgets.flatMap((widget) => {
      if (!widget.wallSlug) {
        return [];
      }

      return [
        {
          widgetId: widget.id,
          wallSlug: widget.wallSlug,
          title: widget.wallTitle ?? widget.name,
          subhead: widget.wallSubhead ?? "",
          endpoint: `/v2/walls/${widget.wallSlug}`,
        },
      ];
    });
  }
}

function normalizeHostname(value: string) {
  const trimmed = value.trim().toLowerCase().replace(/\.$/, "");
  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`)
      .hostname;
  } catch {
    return trimmed;
  }
}
