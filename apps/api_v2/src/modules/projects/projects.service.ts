import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MemberRole,
  ModerationStatus,
  Prisma,
  type ProjectMember,
} from "@workspace/database/prisma";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { paginate } from "../../common/utils/paginate.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  AddProjectMemberBodyDto,
  CreateProjectBodyDto,
  ListProjectsQueryDto,
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

type ProjectWithCounts = Prisma.ProjectGetPayload<{
  select: typeof PROJECT_SELECT;
}>;

type ProjectMemberWithUser = Prisma.ProjectMemberGetPayload<{
  select: typeof PROJECT_MEMBER_SELECT;
}>;

type ProjectJsonShape = Prisma.JsonValue | null;

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrganizationsService)
    private readonly organizationsService: OrganizationsService,
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

    return paginate({
      data: projects.map((project) =>
        this.toProjectResponse(
          project,
          pendingModerationByProjectId.get(project.id) ?? 0,
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
    try {
      const organization = actor?.clerkOrgId
        ? await this.organizationsService.ensureForActor(actor)
        : null;

      const project = await this.prisma.client.$transaction(
        async (tx): Promise<ProjectWithCounts> => {
          const createdProject = await tx.project.create({
            data: this.buildProjectCreateData(userId, body, organization?.id),
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

      return this.toProjectResponse(project, 0);
    } catch (error: unknown) {
      if (this.isPrismaUniqueViolation(error)) {
        throw new ConflictException("Project slug already exists");
      }

      throw error;
    }
  }

  async getBySlug(_userId: string, params: ProjectSlugParamsDto) {
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

    return this.toProjectResponse(project, pendingModeration);
  }

  async update(
    _userId: string,
    params: ProjectSlugParamsDto,
    body: UpdateProjectBodyDto,
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

      return this.toProjectResponse(updatedProject, pendingModeration);
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

  private buildProjectAccessWhere(
    userId: string,
    actor?: ActorContext | null,
  ): Prisma.ProjectWhereInput {
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
  ): Prisma.ProjectUncheckedCreateInput {
    return {
      userId,
      organizationId,
      name: body.name,
      slug: body.slug,
      shortDescription: body.shortDescription,
      description: body.description,
      logoUrl: body.logoUrl,
      projectType: body.projectType ?? undefined,
      websiteUrl: body.websiteUrl,
      collectionFormUrl: body.collectionFormUrl,
      brandColorPrimary: body.brandColorPrimary,
      brandColorSecondary: body.brandColorSecondary,
      socialLinks: this.toNullableJsonInput(body.socialLinks),
      tags: body.tags,
      visibility: body.visibility,
      autoModeration: body.autoModeration,
      autoApproveVerified: body.autoApproveVerified,
      profanityFilterLevel: body.profanityFilterLevel,
      formConfig: this.toNullableJsonInput(body.formConfig),
    };
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
