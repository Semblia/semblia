import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  PublicSurfaceFeature,
  PublicSurfaceResourceType,
  WidgetType,
} from "@workspace/database/prisma";
import {
  normalizePublicHostname,
  type V2PublicSurfaceResolutionDTO,
} from "@workspace/types";
import { PrismaService } from "../prisma/prisma.service.js";
import { MediaService } from "../storage/media.service.js";
import type { PublicSurfaceResolveQueryDto } from "./public-surfaces.dto.js";
import { PublicHostingObservabilityService } from "./public-hosting-observability.service.js";
import type { PublicHostingEventReason } from "./public-hosting-observability.service.js";

const NOT_FOUND_MESSAGE = "Public surface host not found";

const HOST_SELECT = {
  id: true,
  projectId: true,
  feature: true,
  resourceType: true,
  resourceId: true,
  hostname: true,
  isDefault: true,
  status: true,
  verifiedAt: true,
  retiredAt: true,
  project: {
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      logoAsset: true,
      brandColorPrimary: true,
      brandColorSecondary: true,
      websiteUrl: true,
    },
  },
} as const;

export interface ResolvePublicSurfaceInput {
  hostname: string;
  feature: PublicSurfaceFeature;
}

export interface ResolvedPublicSurface {
  requestedHostname: string;
  canonicalHostname: string;
  canonicalUrl: string;
  isCanonical: boolean;
  projectId: string;
  feature: PublicSurfaceFeature;
  resourceType: PublicSurfaceResourceType;
  resourceId: string;
}

@Injectable()
export class PublicSurfacesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MediaService) private readonly mediaService?: MediaService,
    @Inject(PublicHostingObservabilityService)
    private readonly observability = new PublicHostingObservabilityService(),
  ) {}

  async resolve(
    query: PublicSurfaceResolveQueryDto,
  ): Promise<V2PublicSurfaceResolutionDTO> {
    const resolved = await this.resolveHost(query);
    const host = await this.findHostOrThrow(
      resolved.requestedHostname,
      query.feature,
    );
    const walls =
      resolved.feature === PublicSurfaceFeature.WALL
        ? await this.listWallResources(resolved)
        : [];

    return {
      id: host.id,
      hostname: resolved.requestedHostname,
      requestedHostname: resolved.requestedHostname,
      canonicalHostname: resolved.canonicalHostname,
      isCanonical: resolved.isCanonical,
      feature: resolved.feature,
      resourceType: resolved.resourceType,
      resourceId: resolved.resourceId,
      isDefault: host.isDefault,
      canonicalUrl: resolved.canonicalUrl,
      project: {
        id: resolved.projectId,
        slug: host.project?.slug ?? "",
        name: host.project?.name ?? "",
        logo: this.mediaService?.toDto(host.project?.logoAsset ?? null) ?? null,
        brandColorPrimary: host.project?.brandColorPrimary ?? null,
        brandColorSecondary: host.project?.brandColorSecondary ?? null,
        websiteUrl: host.project?.websiteUrl ?? null,
      },
      walls,
    };
  }

  async resolveHost(
    input: ResolvePublicSurfaceInput,
  ): Promise<ResolvedPublicSurface> {
    const requestedHostname = normalizePublicHostname(input.hostname);
    if (!requestedHostname) {
      return this.miss(input.feature, "invalid_hostname");
    }

    const host = await this.findHostOrThrow(requestedHostname, input.feature);
    if (host.feature !== input.feature || !this.isLiveHost(host)) {
      return this.miss(input.feature, "ineligible_host", requestedHostname);
    }

    const projectId = host.projectId;
    const resourceId = host.resourceId;
    if (!projectId || !resourceId || !host.project || !host.project.isActive) {
      return this.miss(input.feature, "missing_project", requestedHostname);
    }
    if (
      host.resourceType === PublicSurfaceResourceType.PROJECT &&
      resourceId !== projectId
    ) {
      return this.miss(
        input.feature,
        "project_resource_mismatch",
        requestedHostname,
        projectId,
      );
    }
    if (
      !(await this.isResourceOwnedByProject(
        host.resourceType,
        resourceId,
        projectId,
      ))
    ) {
      this.observability.record({
        event: "public_host_cross_project_rejection",
        outcome: "rejected",
        reason: "resource_owner_mismatch",
        hostname: requestedHostname,
        projectId,
        feature: input.feature,
      });
      return this.miss(
        input.feature,
        "resource_owner_mismatch",
        requestedHostname,
        projectId,
      );
    }

    const defaults = await this.prisma.client.publicSurfaceHost.findMany({
      where: {
        projectId,
        feature: input.feature,
        resourceType: host.resourceType,
        resourceId,
        isDefault: true,
        status: "ACTIVE",
        verifiedAt: { not: null },
        retiredAt: null,
      },
      select: { hostname: true },
      take: 2,
    });
    if (defaults.length !== 1 || !defaults[0]) {
      return this.miss(
        input.feature,
        "default_conflict",
        requestedHostname,
        projectId,
      );
    }

    const canonicalHostname = defaults[0].hostname;
    const isCanonical = requestedHostname === canonicalHostname;
    this.observability.record({
      event: "public_host_resolution",
      outcome: "hit",
      reason: isCanonical ? "canonical" : "alias",
      hostname: requestedHostname,
      projectId,
      feature: input.feature,
    });
    return {
      requestedHostname,
      canonicalHostname,
      canonicalUrl: `https://${canonicalHostname}`,
      isCanonical,
      projectId,
      feature: input.feature,
      resourceType: host.resourceType,
      resourceId,
    };
  }

  private async findHostOrThrow(
    hostname: string,
    feature: PublicSurfaceFeature,
  ) {
    const host = await this.prisma.client.publicSurfaceHost.findFirst({
      where: { hostname, feature },
      select: HOST_SELECT,
    });
    if (!host) this.miss(feature, "host_not_found", hostname);
    return host!;
  }

  private isLiveHost(host: {
    status: string;
    verifiedAt: Date | null;
    retiredAt: Date | null;
  }) {
    return (
      host.status === "ACTIVE" &&
      host.verifiedAt !== null &&
      host.retiredAt === null
    );
  }

  private async isResourceOwnedByProject(
    resourceType: PublicSurfaceResourceType,
    resourceId: string,
    projectId: string,
  ) {
    if (resourceType === PublicSurfaceResourceType.PROJECT)
      return resourceId === projectId;
    if (resourceType === PublicSurfaceResourceType.FORM) {
      return Boolean(
        await this.prisma.client.form.findFirst({
          where: { id: resourceId, projectId },
          select: { id: true },
        }),
      );
    }
    return Boolean(
      await this.prisma.client.widget.findFirst({
        where: { id: resourceId, projectId },
        select: { id: true },
      }),
    );
  }

  private async listWallResources(resolved: ResolvedPublicSurface) {
    const widgets = await this.prisma.client.widget.findMany({
      where: {
        projectId: resolved.projectId,
        kind: WidgetType.WALL_OF_LOVE,
        isActive: true,
        publishedSnapshot: { not: Prisma.DbNull },
        wallSlug: { not: null },
        ...(resolved.resourceType === PublicSurfaceResourceType.WIDGET
          ? { id: resolved.resourceId }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        wallSlug: true,
        wallTitle: true,
        wallSubhead: true,
        name: true,
        isPrimaryWall: true,
      },
    });
    const hasPrimary = widgets.some((widget) => widget.isPrimaryWall === true);
    if (!hasPrimary) {
      this.observability.record({
        event: "public_wall_missing_primary",
        outcome: "miss",
        reason: "no_primary_wall",
        hostname: resolved.canonicalHostname,
        projectId: resolved.projectId,
        feature: resolved.feature,
      });
    }
    return widgets.flatMap((widget) =>
      widget.wallSlug
        ? [
            {
              widgetId: widget.id,
              wallSlug: widget.wallSlug,
              title: widget.wallTitle ?? widget.name,
              subhead: widget.wallSubhead ?? "",
              endpoint: `/v2/walls/${widget.wallSlug}`,
              isPrimaryWall: widget.isPrimaryWall === true,
              publicUrl:
                widget.isPrimaryWall === true
                  ? resolved.canonicalUrl
                  : `${resolved.canonicalUrl}/w/${widget.wallSlug}`,
            },
          ]
        : [],
    );
  }

  private miss(
    feature: PublicSurfaceFeature,
    reason: PublicHostingEventReason,
    hostname?: string,
    projectId?: string,
  ): never {
    this.observability.record({
      event: "public_host_resolution",
      outcome: "miss",
      reason,
      hostname,
      projectId,
      feature,
    });
    throw new NotFoundException(NOT_FOUND_MESSAGE);
  }
}
