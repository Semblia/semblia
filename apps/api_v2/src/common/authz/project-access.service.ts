import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MemberRole } from "@workspace/database/prisma";
import { PrismaService } from "../../modules/prisma/prisma.service.js";
import type { ActorContext } from "./actor-context.js";
import {
  Capability,
  ROLE_CAPABILITIES,
  clerkOrgRoleCapabilities,
} from "./capabilities.js";

export type ProjectAccessRole = MemberRole | "ORG_ADMIN" | "ORG_MEMBER";

export type ResolvedProjectAccess = {
  project: {
    id: string;
    slug: string;
    userId: string;
    organizationId: string | null;
  };
  role: ProjectAccessRole;
  capabilities: ReadonlySet<Capability>;
};

@Injectable()
export class ProjectAccessService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resolveBySlug(
    actorOrUserId: ActorContext | string,
    slug: string,
  ): Promise<ResolvedProjectAccess> {
    const actor =
      typeof actorOrUserId === "string"
        ? {
            actorType: "user" as const,
            userId: actorOrUserId,
            clerkOrgPermissions: [],
            scopes: [],
          }
        : actorOrUserId;

    const project = await this.prisma.client.project.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        userId: true,
        organizationId: true,
        organization: {
          select: {
            clerkOrgId: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    if (actor.clerkOrgId) {
      if (project.organization?.clerkOrgId !== actor.clerkOrgId) {
        throw new ForbiddenException("You do not have access to this project");
      }

      return {
        project,
        role: actor.clerkOrgRole === "admin" ? "ORG_ADMIN" : "ORG_MEMBER",
        capabilities: clerkOrgRoleCapabilities(actor.clerkOrgRole),
      };
    }

    const userId = actor.userId;
    if (!userId) {
      throw new ForbiddenException("You do not have access to this project");
    }

    const membership = await this.prisma.client.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId,
        },
      },
      select: { role: true },
    });

    const role =
      membership?.role ??
      (project.userId === userId ? MemberRole.OWNER : undefined);

    if (!role) {
      throw new ForbiddenException("You do not have access to this project");
    }

    return {
      project,
      role,
      capabilities: ROLE_CAPABILITIES[role],
    };
  }
}
