import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  MemberRole,
  FormIntent,
  FormStatus,
  MediaAssetPurpose,
  MediaAssetStatus,
  NotificationType,
  Prisma,
  type ProjectMember,
  ProjectMemberInviteStatus,
  ProjectOwnershipTransferStatus,
} from "@workspace/database/prisma";
import { createFormTemplate } from "@workspace/forms-core";
import type {
  V2ProjectMemberInviteDTO,
  V2ProjectOwnershipTransferDTO,
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
import { EmailDeliveryService } from "../email/email-delivery.service.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { MediaService } from "../storage/media.service.js";
import type {
  AddProjectMemberBodyDto,
  CreateProjectMemberInviteBodyDto,
  CreateProjectBodyDto,
  InitiateOwnershipTransferBodyDto,
  ListProjectsQueryDto,
  ProjectInviteParamsDto,
  ProjectMemberInviteParamsDto,
  ProjectMemberParamsDto,
  ProjectSlugParamsDto,
  ProjectTransferParamsDto,
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
  logoAssetId: true,
  logoAsset: true,
  projectType: true,
  websiteUrl: true,
  brandColorPrimary: true,
  brandColorSecondary: true,
  socialLinks: true,
  tags: true,
  visibility: true,
  isActive: true,
  autoModeration: true,
  autoApproveVerified: true,
  profanityFilterLevel: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      widgets: true,
      apiKeys: true,
      formResponses: true,
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
  project: {
    select: {
      slug: true,
      name: true,
    },
  },
} satisfies Prisma.ProjectMemberInviteSelect;

const PROJECT_OWNERSHIP_TRANSFER_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

const PROJECT_OWNERSHIP_TRANSFER_SELECT = {
  id: true,
  projectId: true,
  fromUserId: true,
  toUserId: true,
  status: true,
  initiatedByUserId: true,
  respondedByUserId: true,
  respondedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      slug: true,
      name: true,
      userId: true,
    },
  },
  fromUser: {
    select: PROJECT_OWNERSHIP_TRANSFER_USER_SELECT,
  },
  toUser: {
    select: PROJECT_OWNERSHIP_TRANSFER_USER_SELECT,
  },
} satisfies Prisma.ProjectOwnershipTransferSelect;

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

type ProjectOwnershipTransferRow = Prisma.ProjectOwnershipTransferGetPayload<{
  select: typeof PROJECT_OWNERSHIP_TRANSFER_SELECT;
}>;

type PublicSurfaceHostRow = Prisma.PublicSurfaceHostGetPayload<{
  select: typeof PUBLIC_SURFACE_HOST_SELECT;
}>;

type ProjectJsonShape = Prisma.JsonValue | null;
export type ProjectResponseAccess = {
  role: ProjectAccessRole;
  capabilities: ReadonlySet<Capability>;
  isPrimaryOwner: boolean;
};

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrganizationsService)
    private readonly organizationsService: OrganizationsService,
    @Inject(ProjectActionAuditService)
    private readonly actionAudit: ProjectActionAuditService,
    @Optional()
    @Inject(MediaService)
    private readonly mediaService?: MediaService,
    @Optional()
    @Inject(NotificationsService)
    private readonly notificationsService?: NotificationsService,
    @Optional()
    @Inject(EmailDeliveryService)
    private readonly emailDeliveryService?: EmailDeliveryService,
    @Optional()
    @Inject(ConfigService)
    private readonly configService?: ConfigService,
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

    const pendingModerationByProjectId =
      await this.countPendingModerationByProject(projects.map((p) => p.id));

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
      // Project defaults are platform-governed (not user-settable); always
      // derive from the canonical system defaults.
      const accountDefaults = parseAccountDefaults(null);
      const explicitLogoAsset = await this.resolveProjectLogoAssetId(
        body.logoAssetId,
        undefined,
      );

      const project = await this.prisma.client.$transaction(
        async (tx): Promise<ProjectWithCounts> => {
          const createdProject = await tx.project.create({
            data: this.buildProjectCreateData(
              userId,
              body,
              organization?.id,
              accountDefaults,
              explicitLogoAsset,
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

          await this.createDefaultForm(tx, {
            projectId: createdProject.id,
            userId,
          });

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

    return this.toProjectResponse(
      project,
      await this.countPendingModeration(project.id),
      access,
    );
  }

  async update(
    _userId: string,
    params: ProjectSlugParamsDto,
    body: UpdateProjectBodyDto,
    access: ProjectResponseAccess,
  ) {
    const project = await this.getProjectOrThrow(params.slug);
    const logoAssetId =
      body.logoAssetId !== undefined
        ? await this.resolveProjectLogoAssetId(body.logoAssetId, project.id)
        : undefined;

    try {
      const updatedProject = await this.prisma.client.project.update({
        where: { id: project.id },
        data: this.buildProjectUpdateData(body, logoAssetId),
        select: PROJECT_SELECT,
      });

      return this.toProjectResponse(
        updatedProject,
        await this.countPendingModeration(project.id),
        access,
      );
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
    const inviter = this.emailDeliveryService
      ? await this.prisma.client.user.findUnique({
          where: { id: userId },
          select: { email: true },
        })
      : null;

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
          await this.notificationsService?.createForUsers(
            [existingUser.id],
            {
              type: NotificationType.PROJECT_INVITE_RECEIVED,
              title: "Project invitation",
              message: `You were invited to join ${project.name}.`,
              link: "/projects",
              metadata: {
                projectId: project.id,
                projectSlug: project.slug,
                inviteId: createdInvite.id,
                role,
              },
            },
            tx,
          );
        }

        await this.emailDeliveryService?.createProjectInviteDeliveryWith(
          tx,
          createdInvite,
          { id: project.id, name: project.name },
          inviter,
        );

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

      await this.notificationsService?.createForProjectManagers(
        invite.projectId,
        {
          type: "PROJECT_INVITE_ACCEPTED",
          title: "Project invitation accepted",
          message: `${user.email} joined ${invite.project.name}.`,
          link: `/projects/${invite.project.slug}/settings/members`,
          metadata: {
            projectId: invite.projectId,
            projectSlug: invite.project.slug,
            inviteId: invite.id,
            memberId: member.id,
            userId: user.id,
            role: invite.role,
          },
        },
        { excludeUserIds: [user.id] },
        tx,
      );

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

  async getOwnershipTransfer(
    _userId: string,
    params: ProjectSlugParamsDto,
  ): Promise<V2ProjectOwnershipTransferDTO | null> {
    const project = await this.getProjectOrThrow(params.slug);
    const now = new Date();

    await this.expirePendingOwnershipTransfersForProject(project.id, now);

    const transfer =
      await this.prisma.client.projectOwnershipTransfer.findFirst({
        where: {
          projectId: project.id,
          status: ProjectOwnershipTransferStatus.PENDING,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
        select: PROJECT_OWNERSHIP_TRANSFER_SELECT,
      });

    return transfer ? this.toProjectOwnershipTransferResponse(transfer) : null;
  }

  async initiateOwnershipTransfer(
    userId: string,
    params: ProjectSlugParamsDto,
    body: InitiateOwnershipTransferBodyDto,
    actor?: ActorContext | null,
  ): Promise<V2ProjectOwnershipTransferDTO> {
    const project = await this.getProjectOrThrow(params.slug);
    this.assertPrimaryProjectOwner(userId, project, actor);

    if (body.confirmName !== project.name) {
      throw new UnprocessableEntityException(
        "Project name confirmation does not match",
      );
    }

    if (body.toUserId === project.userId) {
      throw new UnprocessableEntityException(
        "Project ownership cannot be transferred to the current owner",
      );
    }

    const recipientMember = await this.prisma.client.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: body.toUserId,
        },
      },
      select: {
        userId: true,
        role: true,
        user: {
          select: PROJECT_OWNERSHIP_TRANSFER_USER_SELECT,
        },
      },
    });

    if (!recipientMember) {
      throw new UnprocessableEntityException(
        "Ownership recipient must be an existing project member",
      );
    }

    const now = new Date();
    await this.expirePendingOwnershipTransfersForProject(project.id, now);

    const existingTransfer =
      await this.prisma.client.projectOwnershipTransfer.findFirst({
        where: {
          projectId: project.id,
          status: ProjectOwnershipTransferStatus.PENDING,
        },
        select: { id: true },
      });

    if (existingTransfer) {
      throw new ConflictException(
        "A pending ownership transfer already exists",
      );
    }

    try {
      const transfer = await this.prisma.client.$transaction(async (tx) => {
        const createdTransfer = await tx.projectOwnershipTransfer.create({
          data: {
            projectId: project.id,
            fromUserId: project.userId,
            toUserId: recipientMember.userId,
            initiatedByUserId: userId,
          },
          select: PROJECT_OWNERSHIP_TRANSFER_SELECT,
        });

        await this.actionAudit.recordWith(tx, {
          projectId: project.id,
          actor: this.actorOrUser(actor, userId),
          action: "project.ownership_transfer_requested",
          targetType: "project_ownership_transfer",
          targetId: createdTransfer.id,
          metadata: {
            fromUserId: project.userId,
            toUserId: recipientMember.userId,
          },
        });

        await this.notificationsService?.createForUsers(
          [recipientMember.userId],
          {
            type: NotificationType.PROJECT_TRANSFER_REQUESTED,
            title: "Ownership transfer requested",
            message: `${createdTransfer.fromUser.email} asked you to take ownership of ${project.name}.`,
            link: "/projects",
            metadata: {
              projectId: project.id,
              projectSlug: project.slug,
              transferId: createdTransfer.id,
              fromUserId: project.userId,
              toUserId: recipientMember.userId,
            },
          },
          tx,
        );

        return createdTransfer;
      });

      return this.toProjectOwnershipTransferResponse(transfer);
    } catch (error: unknown) {
      if (this.isPrismaUniqueViolation(error)) {
        throw new ConflictException(
          "A pending ownership transfer already exists",
        );
      }

      throw error;
    }
  }

  async cancelOwnershipTransfer(
    userId: string,
    params: ProjectSlugParamsDto,
    actor?: ActorContext | null,
  ): Promise<V2ProjectOwnershipTransferDTO | null> {
    const project = await this.getProjectOrThrow(params.slug);
    this.assertPrimaryProjectOwner(userId, project, actor);
    const now = new Date();

    await this.expirePendingOwnershipTransfersForProject(project.id, now);

    const transfer =
      await this.prisma.client.projectOwnershipTransfer.findFirst({
        where: {
          projectId: project.id,
          status: ProjectOwnershipTransferStatus.PENDING,
          expiresAt: { gt: now },
        },
        select: PROJECT_OWNERSHIP_TRANSFER_SELECT,
      });

    if (!transfer) {
      return null;
    }

    const cancelledTransfer = await this.prisma.client.$transaction(
      async (tx) => {
        const updatedTransfer = await tx.projectOwnershipTransfer.update({
          where: { id: transfer.id },
          data: { status: ProjectOwnershipTransferStatus.CANCELLED },
          select: PROJECT_OWNERSHIP_TRANSFER_SELECT,
        });

        await this.actionAudit.recordWith(tx, {
          projectId: project.id,
          actor: this.actorOrUser(actor, userId),
          action: "project.ownership_transfer_cancelled",
          targetType: "project_ownership_transfer",
          targetId: transfer.id,
          metadata: {
            fromUserId: transfer.fromUserId,
            toUserId: transfer.toUserId,
          },
        });

        await this.notificationsService?.createForUsers(
          [transfer.toUserId],
          {
            type: NotificationType.PROJECT_TRANSFER_CANCELLED,
            title: "Ownership transfer cancelled",
            message: `${project.name}'s ownership transfer was cancelled.`,
            link: `/projects/${project.slug}/settings/danger`,
            metadata: {
              projectId: project.id,
              projectSlug: project.slug,
              transferId: transfer.id,
              fromUserId: transfer.fromUserId,
              toUserId: transfer.toUserId,
            },
          },
          tx,
        );

        return updatedTransfer;
      },
    );

    return this.toProjectOwnershipTransferResponse(cancelledTransfer);
  }

  async listIncomingOwnershipTransfers(
    userId: string,
  ): Promise<V2ProjectOwnershipTransferDTO[]> {
    const now = new Date();
    await this.expirePendingOwnershipTransfersForUser(userId, now);

    const transfers =
      await this.prisma.client.projectOwnershipTransfer.findMany({
        where: {
          toUserId: userId,
          status: ProjectOwnershipTransferStatus.PENDING,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
        select: PROJECT_OWNERSHIP_TRANSFER_SELECT,
      });

    return transfers.map((transfer) =>
      this.toProjectOwnershipTransferResponse(transfer),
    );
  }

  async acceptOwnershipTransfer(
    userId: string,
    params: ProjectTransferParamsDto,
    actor?: ActorContext | null,
  ): Promise<V2ProjectOwnershipTransferDTO> {
    this.assertUserActorForOwnershipTransfer(actor);

    const transfer = await this.getOwnershipTransferByIdOrThrow(
      params.transferId,
    );
    this.assertTransferRecipient(transfer, userId);
    this.assertTransferPending(transfer);

    const now = new Date();
    if (transfer.expiresAt <= now) {
      await this.expireOwnershipTransfer(transfer.id);
      throw new ConflictException("Project ownership transfer has expired");
    }

    const acceptedTransfer = await this.prisma.client.$transaction(
      async (tx) => {
        const ownerUpdate = await tx.project.updateMany({
          where: {
            id: transfer.projectId,
            userId: transfer.fromUserId,
          },
          data: { userId: transfer.toUserId },
        });

        if (ownerUpdate.count !== 1) {
          throw new ConflictException(
            "Project ownership transfer is no longer valid",
          );
        }

        const recipientMember = await tx.projectMember.upsert({
          where: {
            projectId_userId: {
              projectId: transfer.projectId,
              userId: transfer.toUserId,
            },
          },
          update: { role: MemberRole.OWNER },
          create: {
            projectId: transfer.projectId,
            userId: transfer.toUserId,
            role: MemberRole.OWNER,
          },
          select: { id: true },
        });

        const formerOwnerMember = await tx.projectMember.upsert({
          where: {
            projectId_userId: {
              projectId: transfer.projectId,
              userId: transfer.fromUserId,
            },
          },
          update: { role: MemberRole.ADMIN },
          create: {
            projectId: transfer.projectId,
            userId: transfer.fromUserId,
            role: MemberRole.ADMIN,
          },
          select: { id: true },
        });

        const updatedTransfer = await tx.projectOwnershipTransfer.update({
          where: { id: transfer.id },
          data: {
            status: ProjectOwnershipTransferStatus.ACCEPTED,
            respondedByUserId: userId,
            respondedAt: now,
          },
          select: PROJECT_OWNERSHIP_TRANSFER_SELECT,
        });

        await this.actionAudit.recordWith(tx, {
          projectId: transfer.projectId,
          actor: this.actorOrUser(actor, userId),
          action: "project.ownership_transfer_accepted",
          targetType: "project_ownership_transfer",
          targetId: transfer.id,
          metadata: {
            fromUserId: transfer.fromUserId,
            toUserId: transfer.toUserId,
            recipientMemberId: recipientMember.id,
            formerOwnerMemberId: formerOwnerMember.id,
          },
        });

        await this.notificationsService?.createForProjectManagers(
          transfer.projectId,
          {
            type: NotificationType.PROJECT_TRANSFER_ACCEPTED,
            title: "Ownership transfer accepted",
            message: `${transfer.toUser.email} accepted ownership of ${transfer.project.name}.`,
            link: `/projects/${transfer.project.slug}/settings/danger`,
            metadata: {
              projectId: transfer.projectId,
              projectSlug: transfer.project.slug,
              transferId: transfer.id,
              fromUserId: transfer.fromUserId,
              toUserId: transfer.toUserId,
            },
          },
          { excludeUserIds: [userId] },
          tx,
        );

        return updatedTransfer;
      },
    );

    return this.toProjectOwnershipTransferResponse(acceptedTransfer);
  }

  async declineOwnershipTransfer(
    userId: string,
    params: ProjectTransferParamsDto,
    actor?: ActorContext | null,
  ): Promise<V2ProjectOwnershipTransferDTO> {
    this.assertUserActorForOwnershipTransfer(actor);

    const transfer = await this.getOwnershipTransferByIdOrThrow(
      params.transferId,
    );
    this.assertTransferRecipient(transfer, userId);
    this.assertTransferPending(transfer);

    const now = new Date();
    if (transfer.expiresAt <= now) {
      await this.expireOwnershipTransfer(transfer.id);
      throw new ConflictException("Project ownership transfer has expired");
    }

    const declinedTransfer = await this.prisma.client.$transaction(
      async (tx) => {
        const updatedTransfer = await tx.projectOwnershipTransfer.update({
          where: { id: transfer.id },
          data: {
            status: ProjectOwnershipTransferStatus.DECLINED,
            respondedByUserId: userId,
            respondedAt: now,
          },
          select: PROJECT_OWNERSHIP_TRANSFER_SELECT,
        });

        await this.actionAudit.recordWith(tx, {
          projectId: transfer.projectId,
          actor: this.actorOrUser(actor, userId),
          action: "project.ownership_transfer_declined",
          targetType: "project_ownership_transfer",
          targetId: transfer.id,
          metadata: {
            fromUserId: transfer.fromUserId,
            toUserId: transfer.toUserId,
          },
        });

        await this.notificationsService?.createForUsers(
          [transfer.fromUserId],
          {
            type: NotificationType.PROJECT_TRANSFER_DECLINED,
            title: "Ownership transfer declined",
            message: `${transfer.toUser.email} declined ownership of ${transfer.project.name}.`,
            link: `/projects/${transfer.project.slug}/settings/danger`,
            metadata: {
              projectId: transfer.projectId,
              projectSlug: transfer.project.slug,
              transferId: transfer.id,
              fromUserId: transfer.fromUserId,
              toUserId: transfer.toUserId,
            },
          },
          tx,
        );

        return updatedTransfer;
      },
    );

    return this.toProjectOwnershipTransferResponse(declinedTransfer);
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
        accessByProjectId.set(project.id, {
          role,
          capabilities,
          isPrimaryOwner: false,
        });
      }
      return accessByProjectId;
    }

    if (actor?.clerkOrgId) {
      const role: ProjectAccessRole =
        actor.clerkOrgRole === "admin" ? "ORG_ADMIN" : "ORG_MEMBER";
      const capabilities = clerkOrgRoleCapabilities(actor.clerkOrgRole);
      for (const project of projects) {
        accessByProjectId.set(project.id, {
          role,
          capabilities,
          isPrimaryOwner: project.userId === userId,
        });
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
        isPrimaryOwner: project.userId === userId,
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
        isPrimaryOwner: true,
      };
    }

    return {
      role: MemberRole.OWNER,
      capabilities: this.capabilitiesForRole(MemberRole.OWNER),
      isPrimaryOwner: true,
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
        name: true,
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

    await this.notificationsService?.createForProjectManagers(projectId, {
      type: "SECURITY_ALERT",
      title: "Trusted origins changed",
      message: "Trusted collection origins were updated.",
      link: "/projects",
      metadata: {
        projectId,
        action: "allowed_origins.replaced",
        origins: normalizedOrigins,
      },
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

  private assertPrimaryProjectOwner(
    userId: string,
    project: { userId: string },
    actor?: ActorContext | null,
  ) {
    this.assertUserActorForOwnershipTransfer(actor);

    if (project.userId !== userId) {
      throw new ForbiddenException(
        "Only the primary project owner can manage ownership transfers",
      );
    }
  }

  private assertUserActorForOwnershipTransfer(actor?: ActorContext | null) {
    if (actor && actor.actorType !== "user") {
      throw new ForbiddenException(
        "Project credentials cannot manage ownership transfers",
      );
    }
  }

  private assertTransferRecipient(
    transfer: ProjectOwnershipTransferRow,
    userId: string,
  ) {
    if (transfer.toUserId !== userId) {
      throw new ForbiddenException(
        "Project ownership transfer belongs to another user",
      );
    }
  }

  private assertTransferPending(transfer: ProjectOwnershipTransferRow) {
    if (transfer.status !== ProjectOwnershipTransferStatus.PENDING) {
      throw new ConflictException("Project ownership transfer is not pending");
    }
  }

  private async getOwnershipTransferByIdOrThrow(transferId: string) {
    const transfer =
      await this.prisma.client.projectOwnershipTransfer.findUnique({
        where: { id: transferId },
        select: PROJECT_OWNERSHIP_TRANSFER_SELECT,
      });

    if (!transfer) {
      throw new NotFoundException("Project ownership transfer not found");
    }

    return transfer;
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

  private expirePendingOwnershipTransfersForProject(
    projectId: string,
    now: Date,
  ) {
    return this.prisma.client.projectOwnershipTransfer.updateMany({
      where: {
        projectId,
        status: ProjectOwnershipTransferStatus.PENDING,
        expiresAt: { lte: now },
      },
      data: { status: ProjectOwnershipTransferStatus.EXPIRED },
    });
  }

  private expirePendingOwnershipTransfersForUser(toUserId: string, now: Date) {
    return this.prisma.client.projectOwnershipTransfer.updateMany({
      where: {
        toUserId,
        status: ProjectOwnershipTransferStatus.PENDING,
        expiresAt: { lte: now },
      },
      data: { status: ProjectOwnershipTransferStatus.EXPIRED },
    });
  }

  private expireOwnershipTransfer(transferId: string) {
    return this.prisma.client.projectOwnershipTransfer.update({
      where: { id: transferId },
      data: { status: ProjectOwnershipTransferStatus.EXPIRED },
      select: { id: true },
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
    const formsRuntimeBaseDomain = this.getFormsRuntimeBaseDomain();

    return tx.publicSurfaceHost.createMany({
      data: [
        {
          projectId,
          feature: "COLLECTION",
          resourceType: "PROJECT",
          hostname: `${slug}.testimonials.semblia.com`,
          isDefault: true,
          status: "ACTIVE",
          verifiedAt,
        },
        {
          projectId,
          feature: "COLLECTION",
          resourceType: "PROJECT",
          hostname: `${slug}.${formsRuntimeBaseDomain}`,
          isDefault: true,
          status: "ACTIVE",
          verifiedAt,
        },
        {
          projectId,
          feature: "WALL",
          resourceType: "PROJECT",
          hostname: `${slug}.walls.semblia.com`,
          isDefault: true,
          status: "ACTIVE",
          verifiedAt,
        },
      ],
      skipDuplicates: true,
    });
  }

  private createDefaultForm(
    tx: Prisma.TransactionClient,
    input: { projectId: string; userId: string },
  ) {
    const draft = createFormTemplate("TESTIMONIAL");
    return tx.form.create({
      data: {
        projectId: input.projectId,
        intent: FormIntent.TESTIMONIAL,
        name: draft.content.title || "Testimonials",
        slug: "testimonials",
        status: FormStatus.DRAFT,
        open: true,
        draft: draft as unknown as Prisma.InputJsonValue,
        draftVersion: 1,
        updatedByUserId: input.userId,
      },
      select: { id: true },
    });
  }

  private async countPendingModerationByProject(projectIds: string[]) {
    if (projectIds.length === 0) return new Map<string, number>();
    const rows = await this.prisma.client.formResponse.groupBy({
      by: ["projectId"],
      where: {
        projectId: { in: projectIds },
        reviewStatus: "PENDING",
      },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.projectId, row._count._all]));
  }

  private async countPendingModeration(projectId: string) {
    return this.prisma.client.formResponse.count({
      where: { projectId, reviewStatus: "PENDING" },
    });
  }

  private getFormsRuntimeBaseDomain() {
    return (
      this.configService?.get<string>("FORMS_RUNTIME_PUBLIC_BASE_DOMAIN") ??
      "collect.semblia.com"
    )
      .trim()
      .toLowerCase();
  }

  private buildProjectCreateData(
    userId: string,
    body: CreateProjectBodyDto,
    organizationId?: string,
    accountDefaults = parseAccountDefaults(null),
    logoAssetId?: string | null,
  ): Prisma.ProjectUncheckedCreateInput {
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
      logoAssetId: logoAssetId ?? undefined,
      projectType: body.projectType ?? undefined,
      websiteUrl: body.websiteUrl,
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
      autoModeration: body.autoModeration ?? moderationDefaults?.autoModeration,
      autoApproveVerified:
        body.autoApproveVerified ?? moderationDefaults?.autoApproveVerified,
      profanityFilterLevel:
        body.profanityFilterLevel !== undefined
          ? body.profanityFilterLevel
          : (moderationDefaults?.profanityFilterLevel ?? undefined),
    };
  }

  private buildProjectUpdateData(
    body: UpdateProjectBodyDto,
    logoAssetId?: string | null,
  ): Prisma.ProjectUpdateInput {
    const data: Prisma.ProjectUpdateInput = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.shortDescription !== undefined)
      data.shortDescription = body.shortDescription;
    if (body.description !== undefined) data.description = body.description;
    if (logoAssetId !== undefined)
      data.logoAsset = logoAssetId
        ? { connect: { id: logoAssetId } }
        : { disconnect: true };
    if (body.projectType !== undefined) data.projectType = body.projectType;
    if (body.websiteUrl !== undefined) data.websiteUrl = body.websiteUrl;
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
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.autoModeration !== undefined) {
      data.autoModeration = body.autoModeration;
    }
    if (body.autoApproveVerified !== undefined) {
      data.autoApproveVerified = body.autoApproveVerified;
    }
    if (body.profanityFilterLevel !== undefined) {
      data.profanityFilterLevel = body.profanityFilterLevel;
    }
    return data;
  }

  private toNullableJsonInput(value: Prisma.InputJsonValue | null | undefined) {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;
    return value;
  }

  private stripFormConfigHydratedLogo<T>(value: T): T {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return value;
    }
    const record = { ...(value as Record<string, unknown>) };
    if (
      record.branding &&
      typeof record.branding === "object" &&
      !Array.isArray(record.branding)
    ) {
      const branding = { ...(record.branding as Record<string, unknown>) };
      delete branding.logo;
      delete branding.logoUrl;
      record.branding = branding;
    }
    return record as T;
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
      logo: this.mediaService?.toDto(project.logoAsset) ?? null,
      projectType: project.projectType,
      websiteUrl: project.websiteUrl,
      collectionFormUrl: null,
      brandColorPrimary: project.brandColorPrimary,
      brandColorSecondary: project.brandColorSecondary,
      socialLinks: project.socialLinks as ProjectJsonShape,
      tags: project.tags,
      visibility: project.visibility,
      isActive: project.isActive,
      autoModeration: project.autoModeration,
      autoApproveVerified: project.autoApproveVerified,
      profanityFilterLevel: project.profanityFilterLevel,
      formConfig: null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      _count: {
        responses: project._count.formResponses ?? 0,
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
      isPrimaryOwner: access?.isPrimaryOwner ?? false,
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

  private toProjectOwnershipTransferResponse(
    transfer: ProjectOwnershipTransferRow,
  ): V2ProjectOwnershipTransferDTO {
    return {
      id: transfer.id,
      projectId: transfer.projectId,
      projectSlug: transfer.project.slug,
      projectName: transfer.project.name,
      fromUser: transfer.fromUser,
      toUser: transfer.toUser,
      status: transfer.status as V2ProjectOwnershipTransferDTO["status"],
      expiresAt: transfer.expiresAt.toISOString(),
      createdAt: transfer.createdAt.toISOString(),
      respondedAt: transfer.respondedAt?.toISOString() ?? null,
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

  private async resolveProjectLogoAssetId(
    logoAssetId: string | null | undefined,
    projectId: string | undefined,
  ) {
    if (logoAssetId === undefined) return undefined;
    if (logoAssetId === null) return null;
    await this.mediaService?.getAssetForOwner({
      assetId: logoAssetId,
      purpose: MediaAssetPurpose.PROJECT_LOGO,
      projectId,
      statuses: [MediaAssetStatus.ACTIVE],
    });
    return logoAssetId;
  }
}
