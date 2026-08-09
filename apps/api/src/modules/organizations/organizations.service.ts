import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@workspace/database/prisma";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  CurrentOrganizationResponseDto,
  OrganizationResponseDto,
} from "./organizations.dto.js";

const ORGANIZATION_SELECT = {
  id: true,
  clerkOrgId: true,
  name: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganizationSelect;

type OrganizationRow = Prisma.OrganizationGetPayload<{
  select: typeof ORGANIZATION_SELECT;
}>;

@Injectable()
export class OrganizationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getCurrent(
    actor: ActorContext | null,
  ): Promise<CurrentOrganizationResponseDto> {
    if (!actor?.clerkOrgId) {
      return { active: false };
    }

    const organization = await this.ensureForActor(actor);

    return {
      active: true,
      organization: this.toResponse(organization),
      clerk: {
        orgId: actor.clerkOrgId,
        orgSlug: actor.clerkOrgSlug ?? null,
        orgRole: actor.clerkOrgRole ?? null,
      },
    };
  }

  async ensureForActor(actor: ActorContext): Promise<OrganizationRow> {
    if (!actor.clerkOrgId) {
      throw new Error("Cannot ensure organization without clerkOrgId");
    }

    return this.prisma.client.organization.upsert({
      where: { clerkOrgId: actor.clerkOrgId },
      update: {
        name: this.displayNameForActor(actor),
        slug: actor.clerkOrgSlug ?? null,
      },
      create: {
        clerkOrgId: actor.clerkOrgId,
        name: this.displayNameForActor(actor),
        slug: actor.clerkOrgSlug ?? null,
        createdByUserId: actor.userId,
      },
      select: ORGANIZATION_SELECT,
    });
  }

  private toResponse(row: OrganizationRow): OrganizationResponseDto {
    return row;
  }

  private displayNameForActor(actor: ActorContext): string {
    if (actor.clerkOrgSlug) {
      return actor.clerkOrgSlug
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }

    return `Organization ${actor.clerkOrgId}`;
  }
}
