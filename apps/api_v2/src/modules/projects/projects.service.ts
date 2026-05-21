import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  MemberRole,
  ModerationStatus,
  NotificationType,
  Prisma,
  type ProjectMember,
  ProjectMemberInviteStatus,
} from "@workspace/database/prisma";
import type {
  V2ProjectMemberInviteDTO,
  V2PublicSurfaceHostDTO,
} from "@workspace/types";
import type { ActorContext } from "../../common/authz/actor-context.js";
import {
  Capability,
  clerkOrgRoleCapabilities,
  credentialScopeCapabilities,
} from "../../common/authz/capabilities.js";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { ProjectAccessRole } from "../../common/authz/project-access.service.js";
import { paginate } from "../../common/utils/paginate.js";
import { parseAccountDefaults } from "../account-defaults/account-defaults.service.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  AddProjectMemberBodyDto,
  CreateProjectMemberInviteBodyDto,
  CreateProjectBodyDto,
  ListProjectsQueryDto,
  ProjectInviteParamsDto,
  ProjectMemberInviteParamsDto,
  ProjectMemberParamsDto,
  ProjectSlugParamsDto,
  UpdateProjectBodyDto,
  UpdateProjectMemberBodyDto,
} from "./projects.dto.js";

const PROJECT_SELECT = {
  id: true,
  userId: true,
  organizationId: true,
  name: true,
  shortDescription: true,
  description: true,
  slug: true,
  logoUrl: true,
  projectType: true,
  websiteUrl: true,
  collectionFormUrl: true,
  brandColorPrimary: true,
  brandColorSecondary: true,
  socialLinks: true,
  tags: true,
  visibility: true,
  isActive: true,
  autoModeration: true,
  autoApproveVerified: true,
  profanityFilterLevel: true,
  formConfig: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      testimonials: true,
      widgets: true,
      apiKeys: true,
    },
  },
} satisfies Prisma.ProjectSelect;

const PROJECT_MEMBER_SELECT = {
  id: true,
  userId: true,
  role: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true,
    },
  },
} satisfies Prisma.ProjectMemberSelect;

const PROJECT_MEMBER_INVITE_SELECT = {
  id: true,
  projectId: true,
  email: true,
  role: true,
  status: true,
  invitedByUserId: true,
  acceptedByUserId: true,
  acceptedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectMemberInviteSelect;

const PUBLIC_SURFACE_HOST_SELECT = {
  id: true,
  projectId: true,
  feature: true,
  resourceType: true,
  resourceId: true,
  hostname: true,
  isDefault: true,
  status: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PublicSurfaceHostSelect;

type ProjectWithCounts = Prisma.ProjectGetPayload<{
  select: typeof PROJECT_SELECT;
}>;

type ProjectMemberWithUser = Prisma.ProjectMemberGetPayload<{
  select: typeof PROJECT_MEMBER_SELECT;
}>;

type ProjectMemberInviteRow = Prisma.ProjectMemberInviteGetPayload<{
  select: typeof PROJECT_MEMBER_INVITE_SELECT;
}>;

type PublicSurfaceHostRow = Prisma.PublicSurfaceHostGetPayload<{
  select: typeof PUBLIC_SURFACE_HOST_SELECT;
}>;

type ProjectJsonShape = Prisma.JsonValue | null;
export type ProjectResponseAccess = {
  role: ProjectAccessRole;
  capabilities: ReadonlySet<Capability>;
};

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrganizationsService)
    private readonly organizationsService: OrganizationsService,
    @Inject(ProjectActionAuditService)
    private readonly actionAudit: ProjectActionAuditService,
  ) {}

  async list(
    userId: string,
    query: ListProjectsQueryDto,
    actor?: ActorContext | null,
  ) {
    const { page, pageSize } = query;
    const where = this.buildProjectAccessWhere(userId, actor);
    const skip = (page - 1) * pageSize;

    const [total, projects] = await Promise.all([
      this.prisma.client.project.count({ where }),
      this.prisma.client.project.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
        select: PROJECT_SELECT,
      }),
    ]);

    const projectIds = projects.map((project) => project.id);
    const pendingModerationCounts =
      projectIds.length === 0
        ? []
        : await this.prisma.client.testimonial.groupBy({
            by: ["projectId"],
            where: {
              moderationStatus: ModerationStatus.PENDING,
              projectId: { in: projectIds },
            },
            _count: { _all: true },
          });

    const pendingModerationByProjectId = new Map(
      pendingModerationCounts.map((entry) => [
        entry.projectId,
        entry._count._all,
      ]),
    );

    const accessByProjectId = await this.buildAccessByProjectId(
      userId,
      projects,
      actor,
    );

    return paginate({
      data: projects.map((project) =>
        this.toProjectResponse(
          project,
          pendingModerationByProjectId.get(project.id) ?? 0,
          accessByProjectId.get(project.id),
        ),
      ),
      total,
      page,
      pageSize,
    });
  }

  async create(
    userId: string,
    body: CreateProjectBodyDto,
    actor?: ActorContext | null,
  ) {
    if (actor && actor.actorType !== "user") {
      throw new ForbiddenException(
        "Project credentials cannot create projects",
      );
    }

    try {
      const organization = actor?.clerkOrgId
        ? await this.organizationsService.ensureForActor(actor)
        : null;
      const accountDefaults = await this.getAccountDefaults(userId);

      const project = await this.prisma.client.$transaction(
        async (tx): Promise<ProjectWithCounts> => {
          const createdProject = await tx.project.create({
            data: this.buildProjectCreateData(
              userId,
              body,
              organization?.id,
              accountDefaults,
            ),
            select: PROJECT_SELECT,
          });

          await tx.projectMember.create({
            data: {
              projectId: createdProject.id,
              userId,
              role: MemberRole.OWNER,
            },
          });

          await this.createDefaultPublicSurfaceHosts(
            tx,
            createdProject.id,
            createdProject.slug,
          );

          return createdProject;
        },
      );

      return this.toProjectResponse(
        project,
        0,
        this.buildNewProjectAccess(actor),
      );
    } catch (error: unknown) {
      if (this.isPrismaUniqueViolation(error)) {
        throw new ConflictException("Project slug already exists");
      }

      throw error;
    }
  }

  async getBySlug(
    _userId: string,
    params: ProjectSlugParamsDto,
    access: ProjectResponseAccess,
  ) {
    const project = await this.prisma.client.project.findUnique({
      where: { slug: params.slug },
      select: PROJECT_SELECT,
    });

    if (!project) throw new NotFoundException("Project not found");

    const pendingModeration = await this.prisma.client.testimonial.count({
      where: {
        projectId: project.id,
        moderationStatus: ModerationStatus.PENDING,
      },
    });

    return this.toProjectResponse(project, pendingModeration, access);
  }

  async update(
    _userId: string,
    params: ProjectSlugParamsDto,
    body: UpdateProjectBodyDto,
    access: ProjectResponseAccess,
  ) {
    const project = await this.getProjectOrThrow(params.slug);

    try {
      const updatedProject = await this.prisma.client.project.update({
        where: { id: project.id },
        data: this.buildProjectUpdateData(body),
        select: PROJECT_SELECT,
      });

      const pendingModeration = await this.prisma.client.testimonial.count({
        where: {
          projectId: updatedProject.id,
          moderationStatus: ModerationStatus.PENDING,
        },
      });

      return this.toProjectResponse(updatedProject, pendingModeration, access);
    } catch (error: unknown) {
      if (this.isPrismaNotFoundError(error)) {
        throw new NotFoundException("Project not found");
      }

      if (this.isPrismaUniqueViolation(error)) {
        throw new ConflictException("Project slug already exists");
      }

      throw error;
    }
  }

  async delete(_userId: string, params: ProjectSlugParamsDto) {
    const project = await this.getProjectOrThrow(params.slug);

    try {
      const deletedProject = await this.prisma.client.project.delete({
        where: { id: project.id },
        select: {
          id: true,
          slug: true,
        },
      });

      return deletedProject;
    } catch (error: unknown) {
      if (this.isPrismaNotFoundError(error)) {
        throw new NotFoundException("Project not found");
      }

      throw error;
    }
  }

  async listMembers(_userId: string, params: ProjectSlugParamsDto) {
    const project = await this.getProjectOrThrow(params.slug);

    const members = await this.prisma.client.projectMember.findMany({
      where: { projectId: project.id },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: PROJECT_MEMBER_SELECT,
    });

    return members.map((member) => this.toProjectMemberResponse(member));
  }

  async addMember(
    _userId: string,
    params: ProjectSlugParamsDto,
    body: AddProjectMemberBodyDto,
  ) {
    const project = await this.getProjectOrThrow(params.slug);

    const targetUser = await this.prisma.client.user.findUnique({
      where: { id: body.userId },
      select: { id: true },
    });

    if (!targetUser) throw new NotFoundException("User not found");

    const member = await this.prisma.client.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: body.userId,
        },
      },
      update: { role: body.role },
      create: {
        projectId: project.id,
        userId: body.userId,
        role: body.role,
      },
      select: PROJECT_MEMBER_SELECT,
    });

    return this.toProjectMemberResponse(member);
  }

  async updateMember(
    _userId: string,
    params: ProjectMemberParamsDto,
    body: UpdateProjectMemberBodyDto,
  ) {
    const project = await this.getProjectOrThrow(params.slug);

    const existingMember = await this.prisma.client.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: params.userId,
        },
      },
    });

    if (!existingMember)
      throw new NotFoundException("Project member not found");

    await this.assertCanChangeOwnerRole(project.id, existingMember, body.role);

    try {
      const member = await this.prisma.client.projectMember.update({
        where: { id: existingMember.id },
        data: { role: body.role },
        select: PROJECT_MEMBER_SELECT,
      });

      return this.toProjectMemberResponse(member);
    } catch (error: unknown) {
      if (this.isPrismaNotFoundError(error)) {
        throw new NotFoundException("Project member not found");
      }

      throw error;
    }
  }

  async removeMember(_userId: string, params: ProjectMemberParamsDto) {
    const project = await this.getProjectOrThrow(params.slug);

    const existingMember = await this.prisma.client.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: params.userId,
        },
      },
    });

    if (!existingMember)
      throw new NotFoundException("Project member not found");

    await this.assertCanRemoveOwner(project.id, existingMember);

    try {
      const member = await this.prisma.client.projectMember.delete({
        where: { id: existingMember.id },
        select: PROJECT_MEMBER_SELECT,
      });

      return this.toProjectMemberResponse(member);
    } catch (error: unknown) {
      if (this.isPrismaNotFoundError(error)) {
        throw new NotFoundException("Project member not found");
      }

      throw error;
    }
  }

  async listMemberInvites(
    _userId: string,
    params: ProjectSlugParamsDto,
  ): Promise<V2ProjectMemberInviteDTO[]> {
    const project = await this.getProjectOrThrow(params.slug);
    const now = new Date();

    await this.expirePendingInvitesForProject(project.id, now);

    const invites = await this.prisma.client.projectMemberInvite.findMany({
      where: {
        projectId: project.id,
        status: ProjectMemberInviteStatus.PENDING,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
      select: PROJECT_MEMBER_INVITE_SELECT,
    });

    return invites.map((invite) => this.toProjectMemberInviteResponse(invite));
  }

  async createMemberInvite(
    userId: string,
    params: ProjectSlugParamsDto,
    body: CreateProjectMemberInviteBodyDto,
    actor?: ActorContext | null,
  ): Promise<V2ProjectMemberInviteDTO> {
    if (body.role === MemberRole.OWNER) {
      throw new UnprocessableEntityException(
        "Project owner role cannot be invited",
      );
    }

    const project = await this.getProjectOrThrow(params.slug);
    const email = this.normalizeEmail(body.email);
    const role = body.role as MemberRole;
    const now = new Date();

    await this.expirePendingInvitesByEmail(project.id, email, now);

    const existingUser = await this.prisma.client.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true },
    });

    if (existingUser) {
      const existingMember = await this.prisma.client.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: existingUser.id,
          },
        },
        select: { id: true },
      });

      if (existingMember) {
        throw new ConflictException("User is already a project member");
      }
    }

    const existingInvite =
      await this.prisma.client.projectMemberInvite.findFirst({
        where: {
          projectId: project.id,
          email,
          status: ProjectMemberInviteStatus.PENDING,
        },
        select: { id: true },
      });

    if (existingInvite) {
      throw new ConflictException("A pending invite already exists");
    }

    try {
      const invite = await this.prisma.client.$transaction(async (tx) => {
        const createdInvite = await tx.projectMemberInvite.create({
          data: {
            projectId: project.id,
            email,
            role,
            invitedByUserId: userId,
          },
          select: PROJECT_MEMBER_INVITE_SELECT,
        });

        await this.actionAudit.recordWith(tx, {
          projectId: project.id,
          actor: this.actorOrUser(actor, userId),
          action: "member.invite_sent",
          targetType: "project_member_invite",
          targetId: createdInvite.id,
          metadata: {
            email,
            role,
          },
        });

        if (existingUser) {
          await tx.notification.create({
            data: {
              userId: existingUser.id,
              type: NotificationType.PROJECT_INVITE_RECEIVED,
              title: "Project invitation",
              message: `You were invited to join ${project.slug}.`,
              link: "/projects",
              metadata: {
                projectId: project.id,
                projectSlug: project.slug,
                inviteId: createdInvite.id,
                role,
              },
            },
          });
        }

        // TODO: Queue an email invite when transactional email sending is in scope.
        return createdInvite;
      });

      return this.toProjectMemberInviteResponse(invite);
    } catch (error: unknown) {
      if (this.isPrismaUniqueViolation(error)) {
        throw new ConflictException("A pending invite already exists");
      }

      throw error;
    }
  }

  async revokeMemberInvite(
    userId: string,
    params: ProjectMemberInviteParamsDto,
    actor?: ActorContext | null,
  ): Promise<V2ProjectMemberInviteDTO> {
    const project = await this.getProjectOrThrow(params.slug);
    const invite = await this.prisma.client.projectMemberInvite.findFirst({
      where: {
        id: params.inviteId,
        projectId: project.id,
      },
      select: PROJECT_MEMBER_INVITE_SELECT,
    });

    if (!invite) {
      throw new NotFoundException("Project member invite not found");
    }

    if (
      invite.status === ProjectMemberInviteStatus.REVOKED ||
      invite.status === ProjectMemberInviteStatus.EXPIRED
    ) {
      return this.toProjectMemberInviteResponse(invite);
    }

    if (invite.status !== ProjectMemberInviteStatus.PENDING) {
      throw new ConflictException("Project member invite is not pending");
    }

    if (invite.expiresAt <= new Date()) {
      const expiredInvite = await this.prisma.client.projectMemberInvite.update(
        {
          where: { id: invite.id },
          data: { status: ProjectMemberInviteStatus.EXPIRED },
          select: PROJECT_MEMBER_INVITE_SELECT,
        },
      );

      return this.toProjectMemberInviteResponse(expiredInvite);
    }

    const revokedInvite = await this.prisma.client.$transaction(async (tx) => {
      const updatedInvite = await tx.projectMemberInvite.update({
        where: { id: invite.id },
        data: { status: ProjectMemberInviteStatus.REVOKED },
        select: PROJECT_MEMBER_INVITE_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId: project.id,
        actor: this.actorOrUser(actor, userId),
        action: "member.invite_revoked",
        targetType: "project_member_invite",
        targetId: updatedInvite.id,
        metadata: {
          email: updatedInvite.email,
          role: updatedInvite.role,
        },
      });

      return updatedInvite;
    });

    return this.toProjectMemberInviteResponse(revokedInvite);
  }

  async acceptMemberInvite(
    userId: string,
    params: ProjectInviteParamsDto,
    actor?: ActorContext | null,
  ) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const invite = await this.prisma.client.projectMemberInvite.findUnique({
      where: { id: params.inviteId },
      select: PROJECT_MEMBER_INVITE_SELECT,
    });

    if (!invite) {
      throw new NotFoundException("Project member invite not found");
    }

    if (this.normalizeEmail(user.email) !== invite.email) {
      throw new ForbiddenException(
        "Project member invite belongs to another email",
      );
    }

    if (invite.status !== ProjectMemberInviteStatus.PENDING) {
      throw new ConflictException("Project member invite is not pending");
    }

    if (invite.expiresAt <= new Date()) {
      await this.prisma.client.projectMemberInvite.update({
        where: { id: invite.id },
        data: { status: ProjectMemberInviteStatus.EXPIRED },
        select: { id: true },
      });
      throw new ConflictException("Project member invite has expired");
    }

    const result = await this.prisma.client.$transaction(async (tx) => {
      const acceptedInvite = await tx.projectMemberInvite.update({
        where: { id: invite.id },
        data: {
          status: ProjectMemberInviteStatus.ACCEPTED,
          acceptedByUserId: user.id,
          acceptedAt: new Date(),
        },
        select: PROJECT_MEMBER_INVITE_SELECT,
      });

      const member = await tx.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: invite.projectId,
            userId: user.id,
          },
        },
        update: { role: invite.role },
        create: {
          projectId: invite.projectId,
          userId: user.id,
          role: invite.role,
        },
        select: PROJECT_MEMBER_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId: invite.projectId,
        actor: this.actorOrUser(actor, userId),
        action: "member.invite_accepted",
        targetType: "project_member_invite",
        targetId: invite.id,
        metadata: {
          email: invite.email,
          role: invite.role,
          memberId: member.id,
        },
      });

      return {
        invite: acceptedInvite,
        member,
      };
    });

    return {
      invite: this.toProjectMemberInviteResponse(result.invite),
      member: this.toProjectMemberResponse(result.member),
    };
  }

  private buildProjectAccessWhere(
    userId: string,
    actor?: ActorContext | null,
  ): Prisma.ProjectWhereInput {
    if (actor && actor.actorType !== "user") {
      if (!actor.projectId) {
        throw new ForbiddenException(
          "Project credentials must be bound to a project",
        );
      }

      return { id: actor.projectId };
    }

    if (actor?.clerkOrgId) {
      return {
        organization: {
          clerkOrgId: actor.clerkOrgId,
        },
      };
    }

    return {
      OR: [{ userId }, { members: { some: { userId } } }],
    };
  }

  private async buildAccessByProjectId(
    userId: string,
    projects: ProjectWithCounts[],
    actor?: ActorContext | null,
  ) {
    const accessByProjectId = new Map<string, ProjectResponseAccess>();

    if (projects.length === 0) {
      return accessByProjectId;
    }

    if (actor && actor.actorType !== "user") {
      const role: ProjectAccessRole =
        actor.actorType === "agent_key" ? "AGENT_KEY" : "API_KEY";
      const capabilities = credentialScopeCapabilities(actor.scopes);
      for (const project of projects) {
        accessByProjectId.set(project.id, { role, capabilities });
      }
      return accessByProjectId;
    }

    if (actor?.clerkOrgId) {
      const role: ProjectAccessRole =
        actor.clerkOrgRole === "admin" ? "ORG_ADMIN" : "ORG_MEMBER";
      const capabilities = clerkOrgRoleCapabilities(actor.clerkOrgRole);
      for (const project of projects) {
        accessByProjectId.set(project.id, { role, capabilities });
      }
      return accessByProjectId;
    }

    const memberships = await this.prisma.client.projectMember.findMany({
      where: {
        projectId: { in: projects.map((project) => project.id) },
        userId,
      },
      select: {
        projectId: true,
        role: true,
      },
    });
    const roleByProjectId = new Map(
      memberships.map((membership) => [
        membership.projectId,
        membership.role as ProjectAccessRole,
      ]),
    );

    for (const project of projects) {
      const role =
        roleByProjectId.get(project.id) ??
        (project.userId === userId ? MemberRole.OWNER : undefined);
      if (!role) continue;
      accessByProjectId.set(project.id, {
        role,
        capabilities: this.capabilitiesForRole(role),
      });
    }

    return accessByProjectId;
  }

  private buildNewProjectAccess(
    actor?: ActorContext | null,
  ): ProjectResponseAccess {
    if (actor?.clerkOrgId) {
      const role: ProjectAccessRole =
        actor.clerkOrgRole === "admin" ? "ORG_ADMIN" : "ORG_MEMBER";
      return {
        role,
        capabilities: clerkOrgRoleCapabilities(actor.clerkOrgRole),
      };
    }

    return {
      role: MemberRole.OWNER,
      capabilities: this.capabilitiesForRole(MemberRole.OWNER),
    };
  }

  private capabilitiesForRole(role: ProjectAccessRole) {
    switch (role) {
      case MemberRole.OWNER:
      case MemberRole.ADMIN:
        return clerkOrgRoleCapabilities("admin");
      case MemberRole.EDITOR:
      case "ORG_MEMBER":
        return clerkOrgRoleCapabilities("member");
      case MemberRole.VIEWER:
        return new Set<Capability>([Capability.VIEW_PROJECT]);
      case "ORG_ADMIN":
        return clerkOrgRoleCapabilities("admin");
      case "API_KEY":
      case "AGENT_KEY":
        return new Set<Capability>([Capability.VIEW_PROJECT]);
    }
  }

  private async getProjectOrThrow(slug: string) {
    const project = await this.prisma.client.project.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        userId: true,
        organizationId: true,
      },
    });

    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async listAllowedOrigins(projectId: string): Promise<string[]> {
    const [project, trustedOrigins] = await Promise.all([
      this.prisma.client.project.findUnique({
        where: { id: projectId },
        select: { allowedOrigins: true },
      }),
      this.prisma.client.projectTrustedOrigin.findMany({
        where: { projectId, status: "ACTIVE" },
        orderBy: { origin: "asc" },
        select: { origin: true },
      }),
    ]);

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return [
      ...new Set([
        ...project.allowedOrigins,
        ...trustedOrigins.map((entry) => entry.origin),
      ]),
    ].sort((left, right) => left.localeCompare(right));
  }

  async listPublicSurfaceHosts(
    projectId: string,
  ): Promise<V2PublicSurfaceHostDTO[]> {
    const hosts = await this.prisma.client.publicSurfaceHost.findMany({
      where: { projectId },
      orderBy: [{ feature: "asc" }, { hostname: "asc" }],
      select: PUBLIC_SURFACE_HOST_SELECT,
    });

    return hosts.map((host) => this.toPublicSurfaceHostResponse(host));
  }

  async replaceAllowedOrigins(
    projectId: string,
    origins: string[],
  ): Promise<string[]> {
    const normalizedOrigins = [
      ...new Map(
        origins.map((origin) => {
          const url = new URL(origin);
          const hostname = url.hostname.toLowerCase();
          const port = url.port ? `:${url.port}` : "";
          const normalizedOrigin = `${url.protocol}//${hostname}${port}`;
          return [normalizedOrigin, normalizedOrigin] as const;
        }),
      ).values(),
    ].sort((left, right) => left.localeCompare(right));

    const updatedProject = await this.prisma.client.$transaction(async (tx) => {
      await tx.projectTrustedOrigin.updateMany({
        where: {
          projectId,
          status: "ACTIVE",
          origin: { notIn: normalizedOrigins },
        },
        data: { status: "DISABLED" },
      });

      await Promise.all(
        normalizedOrigins.map((origin) =>
          tx.projectTrustedOrigin.upsert({
            where: {
              projectId_origin: {
                projectId,
                origin,
              },
            },
            update: {
              kind: "COLLECTION",
              status: "ACTIVE",
            },
            create: {
              projectId,
              origin,
              kind: "COLLECTION",
              status: "ACTIVE",
            },
          }),
        ),
      );

      return tx.project.update({
        where: { id: projectId },
        data: { allowedOrigins: normalizedOrigins },
        select: { allowedOrigins: true },
      });
    });

    return updatedProject.allowedOrigins;
  }

  private async assertCanChangeOwnerRole(
    projectId: string,
    existingMember: ProjectMember,
    nextRole: MemberRole,
  ) {
    if (
      existingMember.role !== MemberRole.OWNER ||
      nextRole === MemberRole.OWNER
    ) {
      return;
    }

    const ownerCount = await this.countOwners(projectId);
    if (ownerCount <= 1) {
      throw new ConflictException("Cannot demote the last owner");
    }
  }

  private async assertCanRemoveOwner(
    projectId: string,
    existingMember: ProjectMember,
  ) {
    if (existingMember.role !== MemberRole.OWNER) return;

    const ownerCount = await this.countOwners(projectId);
    if (ownerCount <= 1) {
      throw new ConflictException("Cannot remove the last owner");
    }
  }

  private countOwners(projectId: string) {
    return this.prisma.client.projectMember.count({
      where: {
        projectId,
        role: MemberRole.OWNER,
      },
    });
  }

  private expirePendingInvitesForProject(projectId: string, now: Date) {
    return this.prisma.client.projectMemberInvite.updateMany({
      where: {
        projectId,
        status: ProjectMemberInviteStatus.PENDING,
        expiresAt: { lte: now },
      },
      data: { status: ProjectMemberInviteStatus.EXPIRED },
    });
  }

  private expirePendingInvitesByEmail(
    projectId: string,
    email: string,
    now: Date,
  ) {
    return this.prisma.client.projectMemberInvite.updateMany({
      where: {
        projectId,
        email,
        status: ProjectMemberInviteStatus.PENDING,
        expiresAt: { lte: now },
      },
      data: { status: ProjectMemberInviteStatus.EXPIRED },
    });
  }

  private actorOrUser(
    actor: ActorContext | null | undefined,
    userId: string,
  ): ActorContext {
    return (
      actor ?? {
        actorType: "user",
        userId,
        clerkOrgPermissions: [],
        scopes: [],
      }
    );
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private createDefaultPublicSurfaceHosts(
    tx: Prisma.TransactionClient,
    projectId: string,
    slug: string,
  ) {
    const verifiedAt = new Date();

    return tx.publicSurfaceHost.createMany({
      data: [
        {
          projectId,
          feature: "COLLECTION",
          resourceType: "PROJECT",
          hostname: `${slug}.testimonials.tresta.app`,
          isDefault: true,
          status: "ACTIVE",
          verifiedAt,
        },
        {
          projectId,
          feature: "WALL",
          resourceType: "PROJECT",
          hostname: `${slug}.walls.tresta.app`,
          isDefault: true,
          status: "ACTIVE",
          verifiedAt,
        },
      ],
      skipDuplicates: true,
    });
  }

  private buildProjectCreateData(
    userId: string,
    body: CreateProjectBodyDto,
    organizationId?: string,
    accountDefaults = parseAccountDefaults(null),
  ): Prisma.ProjectUncheckedCreateInput {
    const formDefaults = accountDefaults.form;
    const moderationDefaults = accountDefaults.moderation;
    const visibilityAccessDefaults = accountDefaults.visibilityAccess;
    const brandDefaults = accountDefaults.brand;

    return {
      userId,
      organizationId,
      name: body.name,
      slug: body.slug,
      shortDescription: body.shortDescription,
      description: body.description,
      logoUrl:
        body.logoUrl !== undefined
          ? body.logoUrl
          : (brandDefaults?.logoUrl ?? undefined),
      projectType: body.projectType ?? undefined,
      websiteUrl: body.websiteUrl,
      collectionFormUrl: body.collectionFormUrl,
      brandColorPrimary:
        body.brandColorPrimary !== undefined
          ? body.brandColorPrimary
          : (brandDefaults?.brandColorPrimary ?? undefined),
      brandColorSecondary:
        body.brandColorSecondary !== undefined
          ? body.brandColorSecondary
          : (brandDefaults?.brandColorSecondary ?? undefined),
      socialLinks: this.toNullableJsonInput(body.socialLinks),
      tags: body.tags,
      visibility: body.visibility ?? visibilityAccessDefaults?.visibility,
      isActive: body.isActive ?? visibilityAccessDefaults?.isActive,
      autoModeration:
        body.autoModeration ?? moderationDefaults?.autoModeration,
      autoApproveVerified:
        body.autoApproveVerified ?? moderationDefaults?.autoApproveVerified,
      profanityFilterLevel:
        body.profanityFilterLevel !== undefined
          ? body.profanityFilterLevel
          : (moderationDefaults?.profanityFilterLevel ?? undefined),
      formConfig: this.toNullableJsonInput(
        body.formConfig !== undefined ? body.formConfig : formDefaults,
      ),
    };
  }

  private async getAccountDefaults(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { defaults: true },
    });

    return parseAccountDefaults(user?.defaults);
  }

  private buildProjectUpdateData(
    body: UpdateProjectBodyDto,
  ): Prisma.ProjectUpdateInput {
    const data: Prisma.ProjectUpdateInput = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.shortDescription !== undefined)
      data.shortDescription = body.shortDescription;
    if (body.description !== undefined) data.description = body.description;
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl;
    if (body.projectType !== undefined) data.projectType = body.projectType;
    if (body.websiteUrl !== undefined) data.websiteUrl = body.websiteUrl;
    if (body.collectionFormUrl !== undefined) {
      data.collectionFormUrl = body.collectionFormUrl;
    }
    if (body.brandColorPrimary !== undefined) {
      data.brandColorPrimary = body.brandColorPrimary;
    }
    if (body.brandColorSecondary !== undefined) {
      data.brandColorSecondary = body.brandColorSecondary;
    }
    if (body.socialLinks !== undefined) {
      data.socialLinks = this.toNullableJsonInput(body.socialLinks);
    }
    if (body.tags !== undefined) data.tags = body.tags;
    if (body.visibility !== undefined) data.visibility = body.visibility;
    if (body.autoModeration !== undefined) {
      data.autoModeration = body.autoModeration;
    }
    if (body.autoApproveVerified !== undefined) {
      data.autoApproveVerified = body.autoApproveVerified;
    }
    if (body.profanityFilterLevel !== undefined) {
      data.profanityFilterLevel = body.profanityFilterLevel;
    }
    if (body.formConfig !== undefined) {
      data.formConfig = this.toNullableJsonInput(body.formConfig);
    }

    return data;
  }

  private toNullableJsonInput(value: Prisma.InputJsonValue | null | undefined) {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;
    return value;
  }

  private toProjectResponse(
    project: ProjectWithCounts,
    pendingModeration: number,
    access?: ProjectResponseAccess,
  ) {
    return {
      id: project.id,
      userId: project.userId,
      organizationId: project.organizationId,
      name: project.name,
      shortDescription: project.shortDescription,
      description: project.description,
      slug: project.slug,
      logoUrl: project.logoUrl,
      projectType: project.projectType,
      websiteUrl: project.websiteUrl,
      collectionFormUrl: project.collectionFormUrl,
      brandColorPrimary: project.brandColorPrimary,
      brandColorSecondary: project.brandColorSecondary,
      socialLinks: project.socialLinks as ProjectJsonShape,
      tags: project.tags,
      visibility: project.visibility,
      isActive: project.isActive,
      autoModeration: project.autoModeration,
      autoApproveVerified: project.autoApproveVerified,
      profanityFilterLevel: project.profanityFilterLevel,
      formConfig: project.formConfig as ProjectJsonShape,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      _count: {
        testimonials: project._count.testimonials,
        pendingModeration,
        widgets: project._count.widgets,
        apiKeys: project._count.apiKeys,
      },
      access: this.serializeAccess(access),
    };
  }

  private serializeAccess(access?: ProjectResponseAccess) {
    return {
      role: access?.role ?? "VIEWER",
      capabilities: [...(access?.capabilities ?? new Set<Capability>())].sort(),
    };
  }

  private toProjectMemberResponse(member: ProjectMemberWithUser) {
    return {
      id: member.id,
      userId: member.userId,
      role: member.role,
      createdAt: member.createdAt,
      user: member.user,
    };
  }

  private toProjectMemberInviteResponse(
    invite: ProjectMemberInviteRow,
  ): V2ProjectMemberInviteDTO {
    return {
      id: invite.id,
      projectId: invite.projectId,
      email: invite.email,
      role: invite.role as V2ProjectMemberInviteDTO["role"],
      status: invite.status as V2ProjectMemberInviteDTO["status"],
      invitedByUserId: invite.invitedByUserId,
      acceptedByUserId: invite.acceptedByUserId,
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      updatedAt: invite.updatedAt.toISOString(),
    };
  }

  private toPublicSurfaceHostResponse(
    host: PublicSurfaceHostRow,
  ): V2PublicSurfaceHostDTO {
    return {
      id: host.id,
      projectId: host.projectId,
      feature: host.feature,
      resourceType: host.resourceType,
      resourceId: host.resourceId,
      hostname: host.hostname,
      isDefault: host.isDefault,
      status: host.status,
      verifiedAt: host.verifiedAt?.toISOString() ?? null,
      createdAt: host.createdAt.toISOString(),
      updatedAt: host.updatedAt.toISOString(),
    };
  }

  private isPrismaNotFoundError(error: unknown): error is { code: string } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    );
  }

  private isPrismaUniqueViolation(error: unknown): error is { code: string } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}
