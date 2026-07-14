import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  MemberRole,
  NotificationType,
  ProjectMemberInviteStatus,
  ProjectOwnershipTransferStatus,
} from "@workspace/database/prisma";
import { Capability } from "../../common/authz/capabilities.js";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { ProjectsService } from "./projects.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { OrganizationsService } from "../organizations/organizations.service.js";
import type { NotificationsService } from "../notifications/notifications.service.js";
import type { EmailDeliveryService } from "../email/email-delivery.service.js";
import type { ConfigService } from "@nestjs/config";

const mockProjectFindUnique = vi.fn();
const mockProjectFindMany = vi.fn();
const mockProjectCount = vi.fn();
const mockProjectUpdate = vi.fn();
const mockProjectUpdateMany = vi.fn();
const mockProjectCreate = vi.fn();
const mockProjectDelete = vi.fn();
const mockProjectMemberCreate = vi.fn();
const mockProjectMemberFindUnique = vi.fn();
const mockProjectMemberFindMany = vi.fn();
const mockProjectMemberUpsert = vi.fn();
const mockProjectMemberDelete = vi.fn();
const mockProjectTrustedOriginFindMany = vi.fn();
const mockProjectMemberInviteCreate = vi.fn();
const mockProjectMemberInviteFindFirst = vi.fn();
const mockProjectMemberInviteFindMany = vi.fn();
const mockProjectMemberInviteFindUnique = vi.fn();
const mockProjectMemberInviteUpdate = vi.fn();
const mockProjectMemberInviteUpdateMany = vi.fn();
const mockProjectOwnershipTransferCreate = vi.fn();
const mockProjectOwnershipTransferFindFirst = vi.fn();
const mockProjectOwnershipTransferFindMany = vi.fn();
const mockProjectOwnershipTransferFindUnique = vi.fn();
const mockProjectOwnershipTransferUpdate = vi.fn();
const mockProjectOwnershipTransferUpdateMany = vi.fn();
const mockPublicSurfaceHostCreate = vi.fn();
const mockPublicSurfaceHostFindMany = vi.fn();
const mockPublicSurfaceHostUpdateMany = vi.fn();
const mockFormResponseGroupBy = vi.fn();
const mockFormResponseCount = vi.fn();
const mockFormCreate = vi.fn();
const mockUserFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockUserUpdateMany = vi.fn();
const mockNotificationCreate = vi.fn();
const mockCreateForUsers = vi.fn();
const mockCreateForProjectManagers = vi.fn();
const mockCreateProjectInviteDeliveryWith = vi.fn();
const mockProjectActionAuditCreate = vi.fn();
const mockTransaction = vi.fn();
const mockEnsureOrganizationForActor = vi.fn();

const prismaMock = {
  client: {
    $transaction: mockTransaction,
    project: {
      findUnique: mockProjectFindUnique,
      findMany: mockProjectFindMany,
      count: mockProjectCount,
      update: mockProjectUpdate,
      updateMany: mockProjectUpdateMany,
      create: mockProjectCreate,
      delete: mockProjectDelete,
    },
    formResponse: {
      groupBy: mockFormResponseGroupBy,
      count: mockFormResponseCount,
    },
    form: {
      create: mockFormCreate,
    },
    projectMember: {
      create: mockProjectMemberCreate,
      findUnique: mockProjectMemberFindUnique,
      findMany: mockProjectMemberFindMany,
      upsert: mockProjectMemberUpsert,
      delete: mockProjectMemberDelete,
    },
    projectMemberInvite: {
      create: mockProjectMemberInviteCreate,
      findFirst: mockProjectMemberInviteFindFirst,
      findMany: mockProjectMemberInviteFindMany,
      findUnique: mockProjectMemberInviteFindUnique,
      update: mockProjectMemberInviteUpdate,
      updateMany: mockProjectMemberInviteUpdateMany,
    },
    projectOwnershipTransfer: {
      create: mockProjectOwnershipTransferCreate,
      findFirst: mockProjectOwnershipTransferFindFirst,
      findMany: mockProjectOwnershipTransferFindMany,
      findUnique: mockProjectOwnershipTransferFindUnique,
      update: mockProjectOwnershipTransferUpdate,
      updateMany: mockProjectOwnershipTransferUpdateMany,
    },
    projectTrustedOrigin: {
      findMany: mockProjectTrustedOriginFindMany,
    },
    user: {
      findFirst: mockUserFindFirst,
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
      updateMany: mockUserUpdateMany,
    },
    notification: {
      create: mockNotificationCreate,
    },
    projectActionAudit: {
      create: mockProjectActionAuditCreate,
    },
    publicSurfaceHost: {
      create: mockPublicSurfaceHostCreate,
      findMany: mockPublicSurfaceHostFindMany,
      updateMany: mockPublicSurfaceHostUpdateMany,
    },
  },
} as unknown as PrismaService;

const organizationsServiceMock = {
  ensureForActor: mockEnsureOrganizationForActor,
} as unknown as OrganizationsService;

const notificationsServiceMock = {
  createForUsers: mockCreateForUsers,
  createForProjectManagers: mockCreateForProjectManagers,
} as unknown as NotificationsService;

const emailDeliveryServiceMock = {
  createProjectInviteDeliveryWith: mockCreateProjectInviteDeliveryWith,
} as unknown as EmailDeliveryService;

const configServiceMock = {
  get: vi.fn((key: string) =>
    key === "FORMS_RUNTIME_PUBLIC_BASE_DOMAIN"
      ? "collect.staging.semblia.com"
      : undefined,
  ),
} as unknown as ConfigService;

describe("ProjectsService allowed origins", () => {
  let service: ProjectsService;

  beforeEach(() => {
    service = new ProjectsService(
      prismaMock,
      organizationsServiceMock,
      new ProjectActionAuditService(prismaMock),
      undefined,
      notificationsServiceMock,
      undefined,
      configServiceMock,
    );
    vi.clearAllMocks();
    mockTransaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(prismaMock.client),
    );
    mockProjectMemberFindMany.mockResolvedValue([]);
    mockProjectMemberInviteUpdateMany.mockResolvedValue({ count: 0 });
    mockProjectOwnershipTransferUpdateMany.mockResolvedValue({ count: 0 });
    mockFormResponseCount.mockResolvedValue(0);
    mockFormResponseGroupBy.mockResolvedValue([]);
    mockFormCreate.mockResolvedValue({ id: "form_1" });
    mockPublicSurfaceHostCreate.mockResolvedValue({ id: "host_1" });
    mockUserUpdate.mockResolvedValue({ id: "user_1" });
    mockUserUpdateMany.mockResolvedValue({ count: 0 });
    mockProjectFindUnique.mockImplementation(async (args: { where?: { id?: string } }) => {
      if (args.where?.id !== "project_1") return undefined;
      const result = mockProjectCreate.mock.results.at(-1)?.value;
      return result ? await result : undefined;
    });
  });

  it("lists active normalized origins merged with legacy project origins", async () => {
    mockProjectFindUnique.mockResolvedValue({
      allowedOrigins: ["https://legacy.example.com"],
    });
    mockProjectTrustedOriginFindMany.mockResolvedValue([
      { origin: "https://normalized.example.com" },
    ]);

    await expect(service.listAllowedOrigins("project_1")).resolves.toEqual([
      "https://legacy.example.com",
      "https://normalized.example.com",
    ]);
  });

  it("throws when listing allowed origins for a missing project", async () => {
    mockProjectFindUnique.mockResolvedValue(null);

    await expect(service.listAllowedOrigins("project_1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("replaces normalized origins and keeps the project shim synchronized", async () => {
    mockProjectUpdate.mockResolvedValue({
      allowedOrigins: ["https://alpha.example.com", "https://beta.example.com"],
    });
    const tx = {
      projectTrustedOrigin: {
        updateMany: vi.fn(),
        upsert: vi.fn(),
      },
      project: {
        update: mockProjectUpdate,
      },
    };
    mockTransaction.mockImplementation(
      async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx),
    );

    const result = await service.replaceAllowedOrigins("project_1", [
      "https://beta.example.com",
      "https://ALPHA.example.com",
      "https://alpha.example.com",
      "https://alpha.example.com",
    ]);

    expect(tx.projectTrustedOrigin.updateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        status: "ACTIVE",
        origin: {
          notIn: ["https://alpha.example.com", "https://beta.example.com"],
        },
      },
      data: { status: "DISABLED" },
    });
    expect(tx.projectTrustedOrigin.upsert).toHaveBeenCalledTimes(2);
    expect(tx.projectTrustedOrigin.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_origin: {
            projectId: "project_1",
            origin: "https://alpha.example.com",
          },
        },
        update: expect.objectContaining({ status: "ACTIVE" }),
        create: expect.objectContaining({
          projectId: "project_1",
          origin: "https://alpha.example.com",
          kind: "COLLECTION",
          status: "ACTIVE",
        }),
      }),
    );
    expect(mockProjectUpdate).toHaveBeenCalledWith({
      where: { id: "project_1" },
      data: {
        allowedOrigins: [
          "https://alpha.example.com",
          "https://beta.example.com",
        ],
      },
      select: { allowedOrigins: true },
    });
    expect(result).toEqual([
      "https://alpha.example.com",
      "https://beta.example.com",
    ]);
    expect(mockCreateForProjectManagers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "SECURITY_ALERT",
        metadata: expect.objectContaining({
          projectId: "project_1",
          action: "allowed_origins.replaced",
          origins: ["https://alpha.example.com", "https://beta.example.com"],
        }),
      }),
    );
  });

  it("creates default public surface hosts for new projects", async () => {
    mockProjectCreate.mockResolvedValue({
      id: "project_1",
      userId: "user_1",
      organizationId: null,
      name: "Acme",
      shortDescription: null,
      description: null,
      slug: "acme",
      logoUrl: null,
      projectType: null,
      websiteUrl: null,
      collectionFormUrl: null,
      brandColorPrimary: null,
      brandColorSecondary: null,
      socialLinks: null,
      tags: [],
      visibility: "PRIVATE",
      isActive: true,
      autoModeration: true,
      autoApproveVerified: false,
      profanityFilterLevel: "MODERATE",
      formConfig: null,
      createdAt: new Date("2026-05-02T00:00:00.000Z"),
      updatedAt: new Date("2026-05-02T00:00:00.000Z"),
      _count: {
        formResponses: 0,
        widgets: 0,
        apiKeys: 0,
      },
    });

    await service.create("user_1", {
      name: "Acme",
      slug: "acme",
      tags: [],
    });

    expect(mockProjectMemberCreate).toHaveBeenCalledWith({
      data: {
        projectId: "project_1",
        userId: "user_1",
        role: MemberRole.OWNER,
      },
    });
    expect(mockPublicSurfaceHostCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        projectId: "project_1",
        feature: "COLLECTION",
        resourceType: "PROJECT",
        resourceId: "project_1",
        hostname: "acme.collect.staging.semblia.com",
        isDefault: true,
        status: "ACTIVE",
        verifiedAt: expect.any(Date),
      }),
    });
    expect(mockPublicSurfaceHostCreate).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        projectId: "project_1",
        feature: "WALL",
        resourceType: "PROJECT",
        resourceId: "project_1",
        hostname: "acme.walls.semblia.com",
        isDefault: true,
        status: "ACTIVE",
        verifiedAt: expect.any(Date),
      }),
    });
    expect(mockFormCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        intent: "TESTIMONIAL",
        slug: "testimonials",
        status: "DRAFT",
        open: true,
        draft: expect.objectContaining({
          intent: "TESTIMONIAL",
        }),
        draftVersion: 1,
        updatedByUserId: "user_1",
      }),
      select: { id: true },
    });
  });

  it("creates projects from platform defaults and never reads user-set defaults", async () => {
    // Project defaults are platform-governed (2026-06-13): creation must NOT read
    // `User.defaults`. Explicit create fields are preserved; unset fields fall
    // through to the DB column defaults rather than any per-user override.
    mockProjectCreate.mockResolvedValue({
      id: "project_1",
      userId: "user_1",
      organizationId: null,
      name: "Acme",
      shortDescription: null,
      description: null,
      slug: "acme",
      logoAssetId: null,
      logoAsset: null,
      projectType: null,
      websiteUrl: null,
      collectionFormUrl: null,
      brandColorPrimary: "#abcdef",
      brandColorSecondary: null,
      socialLinks: null,
      tags: [],
      visibility: "PRIVATE",
      isActive: true,
      autoModeration: true,
      autoApproveVerified: false,
      profanityFilterLevel: "MODERATE",
      formConfig: null,
      createdAt: new Date("2026-05-02T00:00:00.000Z"),
      updatedAt: new Date("2026-05-02T00:00:00.000Z"),
      _count: {
        formResponses: 0,
        widgets: 0,
        apiKeys: 0,
      },
    });

    await service.create("user_1", {
      name: "Acme",
      slug: "acme",
      tags: [],
      brandColorPrimary: "#abcdef",
      isActive: true,
    });

    // No `User.defaults` read at creation time.
    expect(mockUserFindUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ select: { defaults: true } }),
    );
    expect(mockProjectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Acme",
          slug: "acme",
          brandColorPrimary: "#abcdef",
          isActive: true,
        }),
      }),
    );
    // Unset fields are not prefilled from any per-user override.
    const createArg = mockProjectCreate.mock.calls[0]![0];
    expect(createArg.data.brandColorSecondary).toBeUndefined();
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { lastUsedProjectId: "project_1" },
      select: { id: true },
    });
  });

  it("returns a hosted-address conflict when an immutable hostname is tombstoned", async () => {
    mockProjectCreate.mockResolvedValue(projectRecord());
    mockPublicSurfaceHostCreate.mockRejectedValue({
      code: "P2002",
      meta: { target: ["hostname"] },
    });

    await expect(
      service.create("user_1", { name: "Acme", slug: "acme", tags: [] }),
    ).rejects.toThrow("Hosted address already exists");
    expect(mockProjectMemberCreate).toHaveBeenCalledTimes(1);
    expect(mockPublicSurfaceHostCreate).toHaveBeenCalledTimes(1);
  });

  it("retires and detaches all hosts before deleting a project", async () => {
    mockProjectFindUnique.mockResolvedValueOnce({
      id: "project_1",
      slug: "acme",
      name: "Acme",
      userId: "user_1",
      organizationId: null,
    });
    mockProjectDelete.mockResolvedValue({ id: "project_1", slug: "acme" });

    await expect(service.delete("user_1", { slug: "acme" })).resolves.toEqual({
      id: "project_1",
      slug: "acme",
    });

    expect(mockPublicSurfaceHostUpdateMany).toHaveBeenCalledWith({
      where: { projectId: "project_1" },
      data: expect.objectContaining({
        status: "DISABLED",
        isDefault: false,
        projectId: null,
        retiredAt: expect.any(Date),
      }),
    });
    expect(mockProjectDelete).toHaveBeenCalledWith({
      where: { id: "project_1" },
      select: { id: true, slug: true },
    });
  });

  it("lists the default public surface hosts for a project as DTO-shaped rows", async () => {
    mockProjectCreate.mockResolvedValue({
      id: "project_1",
      userId: "user_1",
      organizationId: null,
      name: "Acme",
      shortDescription: null,
      description: null,
      slug: "acme",
      logoUrl: null,
      projectType: null,
      websiteUrl: null,
      collectionFormUrl: null,
      brandColorPrimary: null,
      brandColorSecondary: null,
      socialLinks: null,
      tags: [],
      visibility: "PRIVATE",
      isActive: true,
      autoModeration: true,
      autoApproveVerified: false,
      profanityFilterLevel: "MODERATE",
      formConfig: null,
      createdAt: new Date("2026-05-02T00:00:00.000Z"),
      updatedAt: new Date("2026-05-02T00:00:00.000Z"),
      _count: {
        formResponses: 0,
        widgets: 0,
        apiKeys: 0,
      },
    });
    mockPublicSurfaceHostFindMany.mockResolvedValue([
      publicSurfaceHostRecord({
        id: "host_collection",
        feature: "COLLECTION",
        hostname: "acme.testimonials.semblia.com",
      }),
      publicSurfaceHostRecord({
        id: "host_wall",
        feature: "WALL",
        hostname: "acme.walls.semblia.com",
      }),
    ]);

    await service.create("user_1", {
      name: "Acme",
      slug: "acme",
      tags: [],
    });

    const hosts = await service.listPublicSurfaceHosts("project_1");

    expect(mockPublicSurfaceHostFindMany).toHaveBeenCalledWith({
      where: { projectId: "project_1" },
      orderBy: [{ feature: "asc" }, { hostname: "asc" }],
      select: {
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
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(hosts).toEqual([
      {
        id: "host_collection",
        projectId: "project_1",
        feature: "COLLECTION",
        resourceType: "PROJECT",
        resourceId: null,
        hostname: "acme.testimonials.semblia.com",
        isDefault: true,
        status: "ACTIVE",
        verifiedAt: "2026-05-02T00:00:00.000Z",
        retiredAt: null,
        createdAt: "2026-05-02T00:00:00.000Z",
        updatedAt: "2026-05-02T00:00:00.000Z",
      },
      {
        id: "host_wall",
        projectId: "project_1",
        feature: "WALL",
        resourceType: "PROJECT",
        resourceId: null,
        hostname: "acme.walls.semblia.com",
        isDefault: true,
        status: "ACTIVE",
        verifiedAt: "2026-05-02T00:00:00.000Z",
        retiredAt: null,
        createdAt: "2026-05-02T00:00:00.000Z",
        updatedAt: "2026-05-02T00:00:00.000Z",
      },
    ]);
  });

  it("creates new projects under the active Clerk organization when present", async () => {
    mockEnsureOrganizationForActor.mockResolvedValue({
      id: "org_1",
      clerkOrgId: "org_clerk_1",
      name: "Acme",
      slug: "acme",
      createdAt: new Date("2026-05-02T00:00:00.000Z"),
      updatedAt: new Date("2026-05-02T00:00:00.000Z"),
    });
    mockProjectCreate.mockResolvedValue({
      id: "project_1",
      userId: "user_1",
      organizationId: "org_1",
      name: "Acme",
      shortDescription: null,
      description: null,
      slug: "acme",
      logoUrl: null,
      projectType: null,
      websiteUrl: null,
      collectionFormUrl: null,
      brandColorPrimary: null,
      brandColorSecondary: null,
      socialLinks: null,
      tags: [],
      visibility: "PRIVATE",
      isActive: true,
      autoModeration: true,
      autoApproveVerified: false,
      profanityFilterLevel: "MODERATE",
      formConfig: null,
      createdAt: new Date("2026-05-02T00:00:00.000Z"),
      updatedAt: new Date("2026-05-02T00:00:00.000Z"),
      _count: {
        formResponses: 0,
        widgets: 0,
        apiKeys: 0,
      },
    });

    await service.create(
      "user_1",
      {
        name: "Acme",
        slug: "acme",
        tags: [],
      },
      {
        actorType: "user",
        userId: "user_1",
        clerkOrgId: "org_clerk_1",
        clerkOrgSlug: "acme",
        clerkOrgRole: "admin",
        clerkOrgPermissions: [],
        scopes: [],
      },
    );

    expect(mockEnsureOrganizationForActor).toHaveBeenCalledWith(
      expect.objectContaining({ clerkOrgId: "org_clerk_1" }),
    );
    expect(mockProjectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_1",
          organizationId: "org_1",
          slug: "acme",
        }),
      }),
    );
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { lastUsedProjectId: "project_1" },
      select: { id: true },
    });
  });

  it("clears a removed member's last-used pointer when it targets the project", async () => {
    mockProjectFindUnique.mockResolvedValue(projectRecord());
    mockProjectMemberFindUnique.mockResolvedValue(
      projectMemberRecord({ id: "member_1", userId: "member_1" }),
    );
    mockProjectMemberFindMany.mockResolvedValue([
      projectMemberRecord({ id: "owner_1", userId: "owner_1" }),
    ]);
    mockProjectMemberDelete.mockResolvedValue(
      projectMemberRecord({ id: "member_1", userId: "member_1" }),
    );

    await service.removeMember("owner_1", {
      slug: "acme",
      userId: "member_1",
    });

    expect(mockProjectMemberDelete).toHaveBeenCalledWith({
      where: { id: "member_1" },
      select: expect.any(Object),
    });
    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "member_1",
        lastUsedProjectId: "project_1",
      },
      data: { lastUsedProjectId: null },
    });
  });

  it("restricts credential project lists to the bound project", async () => {
    mockProjectCount.mockResolvedValue(1);
    mockProjectFindMany.mockResolvedValue([
      projectRecord({ id: "project_scoped", slug: "scoped" }),
    ]);
    mockFormResponseGroupBy.mockResolvedValue([]);

    const result = await service.list(
      "user_1",
      { page: 1, pageSize: 10 },
      {
        actorType: "agent_key",
        userId: "user_1",
        projectId: "project_scoped",
        credentialId: "key_1",
        clerkOrgPermissions: [],
        scopes: ["project:read"],
      },
    );

    expect(mockProjectCount).toHaveBeenCalledWith({
      where: { id: "project_scoped" },
    });
    expect(mockProjectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "project_scoped" },
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.access).toEqual({
      role: "AGENT_KEY",
      capabilities: ["VIEW_PROJECT"],
      isPrimaryOwner: false,
    });
  });

  it("projects legacy membership capabilities in project list responses", async () => {
    mockProjectCount.mockResolvedValue(1);
    mockProjectFindMany.mockResolvedValue([
      projectRecord({ id: "project_1", userId: "other_user" }),
    ]);
    mockFormResponseGroupBy.mockResolvedValue([]);
    mockProjectMemberFindMany.mockResolvedValue([
      { projectId: "project_1", role: MemberRole.EDITOR },
    ]);

    const result = await service.list("user_1", { page: 1, pageSize: 10 });

    expect(mockProjectMemberFindMany).toHaveBeenCalledWith({
      where: {
        projectId: { in: ["project_1"] },
        userId: "user_1",
      },
      select: {
        projectId: true,
        role: true,
      },
    });
    expect(result.items[0]?.access).toEqual({
      role: MemberRole.EDITOR,
      capabilities: [
        "OPERATE_PROJECT",
        "PUBLISH_RESPONSES",
        "REVIEW_RESPONSES",
        "VIEW_PROJECT",
      ],
      isPrimaryOwner: false,
    });
  });

  it("uses the resolved route access block for project detail responses", async () => {
    mockProjectFindUnique.mockResolvedValue(projectRecord());
    mockProjectMemberFindMany.mockResolvedValue([]);
    mockFormResponseGroupBy.mockResolvedValue([]);

    await expect(
      service.getBySlug(
        "user_1",
        { slug: "acme" },
        {
          role: "ORG_ADMIN",
          capabilities: new Set([
            Capability.VIEW_PROJECT,
            Capability.MANAGE_PROJECT,
          ]),
          isPrimaryOwner: true,
        },
      ),
    ).resolves.toMatchObject({
      slug: "acme",
      access: {
        role: "ORG_ADMIN",
        capabilities: ["MANAGE_PROJECT", "VIEW_PROJECT"],
      },
    });
  });

  it("blocks project creation from scoped API or agent credentials", async () => {
    await expect(
      service.create(
        "user_1",
        {
          name: "Acme",
          slug: "acme",
          tags: [],
        },
        {
          actorType: "agent_key",
          userId: "user_1",
          projectId: "project_1",
          credentialId: "key_1",
          clerkOrgPermissions: [],
          scopes: ["project:read"],
        },
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(mockProjectCreate).not.toHaveBeenCalled();
  });

  it("rejects OWNER role when creating a project member invite", async () => {
    mockProjectFindUnique.mockResolvedValue(projectRecord());

    await expect(
      service.createMemberInvite(
        "admin_1",
        { slug: "acme" },
        { email: "invitee@example.com", role: MemberRole.OWNER },
      ),
    ).rejects.toThrow(UnprocessableEntityException);

    expect(mockProjectMemberInviteCreate).not.toHaveBeenCalled();
  });

  it("rejects duplicate pending project member invites", async () => {
    mockProjectFindUnique.mockResolvedValue(projectRecord());
    mockUserFindFirst.mockResolvedValue(null);
    mockProjectMemberInviteFindFirst.mockResolvedValue({ id: "invite_1" });

    await expect(
      service.createMemberInvite(
        "admin_1",
        { slug: "acme" },
        {
          email: "invitee@example.com",
          role: MemberRole.EDITOR,
        },
      ),
    ).rejects.toThrow(ConflictException);

    expect(mockProjectMemberInviteCreate).not.toHaveBeenCalled();
  });

  it("rejects invites for emails that already belong to project members", async () => {
    mockProjectFindUnique.mockResolvedValue(projectRecord());
    mockUserFindFirst.mockResolvedValue({
      id: "member_1",
      email: "member@example.com",
    });
    mockProjectMemberFindUnique.mockResolvedValue({ id: "membership_1" });

    await expect(
      service.createMemberInvite(
        "admin_1",
        { slug: "acme" },
        {
          email: "member@example.com",
          role: MemberRole.VIEWER,
        },
      ),
    ).rejects.toThrow(ConflictException);

    expect(mockProjectMemberInviteCreate).not.toHaveBeenCalled();
  });

  it("creates normalized email invites, records audit, and notifies existing users", async () => {
    mockProjectFindUnique.mockResolvedValue(projectRecord());
    mockUserFindFirst.mockResolvedValue({
      id: "invitee_1",
      email: "Invitee@Example.com",
    });
    mockProjectMemberFindUnique.mockResolvedValue(null);
    mockProjectMemberInviteFindFirst.mockResolvedValue(null);
    mockProjectMemberInviteCreate.mockResolvedValue(
      inviteRecord({
        email: "invitee@example.com",
        role: MemberRole.ADMIN,
      }),
    );

    const invite = await service.createMemberInvite(
      "admin_1",
      { slug: "acme" },
      { email: "  Invitee@Example.com  ", role: MemberRole.ADMIN },
    );

    expect(mockProjectMemberInviteUpdateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        email: "invitee@example.com",
        status: ProjectMemberInviteStatus.PENDING,
        expiresAt: { lte: expect.any(Date) },
      },
      data: { status: ProjectMemberInviteStatus.EXPIRED },
    });
    expect(mockProjectMemberInviteCreate).toHaveBeenCalledWith({
      data: {
        projectId: "project_1",
        email: "invitee@example.com",
        role: MemberRole.ADMIN,
        invitedByUserId: "admin_1",
      },
      select: expect.any(Object),
    });
    expect(mockProjectActionAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        actorType: "user",
        actorId: "admin_1",
        action: "member.invite_sent",
        targetType: "project_member_invite",
        targetId: "invite_1",
      }),
    });
    expect(mockCreateForUsers).toHaveBeenCalledWith(
      ["invitee_1"],
      expect.objectContaining({
        type: NotificationType.PROJECT_INVITE_RECEIVED,
        link: "/projects",
        metadata: expect.objectContaining({ inviteId: "invite_1" }),
      }),
      expect.any(Object),
    );
    expect(invite).toMatchObject({
      id: "invite_1",
      email: "invitee@example.com",
      role: MemberRole.ADMIN,
      status: ProjectMemberInviteStatus.PENDING,
    });
  });

  it("creates a project invite email delivery for invited addresses", async () => {
    const serviceWithEmail = new ProjectsService(
      prismaMock,
      organizationsServiceMock,
      new ProjectActionAuditService(prismaMock),
      undefined,
      notificationsServiceMock,
      emailDeliveryServiceMock,
    );
    mockProjectFindUnique.mockResolvedValue(projectRecord());
    mockUserFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({
      id: "admin_1",
      email: "admin@example.com",
    });
    mockProjectMemberInviteFindFirst.mockResolvedValue(null);
    mockProjectMemberInviteCreate.mockResolvedValue(
      inviteRecord({
        email: "outsider@example.com",
        role: MemberRole.VIEWER,
      }),
    );
    mockCreateProjectInviteDeliveryWith.mockResolvedValue({ id: "email_1" });

    await serviceWithEmail.createMemberInvite(
      "admin_1",
      { slug: "acme" },
      { email: "Outsider@Example.com", role: MemberRole.VIEWER },
    );

    expect(mockCreateProjectInviteDeliveryWith).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        id: "invite_1",
        email: "outsider@example.com",
        role: MemberRole.VIEWER,
      }),
      expect.objectContaining({
        id: "project_1",
        name: "Acme",
      }),
      expect.objectContaining({ email: "admin@example.com" }),
    );
  });

  it("lists only active pending project member invites ordered newest first", async () => {
    mockProjectFindUnique.mockResolvedValue(projectRecord());
    mockProjectMemberInviteFindMany.mockResolvedValue([
      inviteRecord({ id: "invite_new", createdAt: date("2026-05-03") }),
      inviteRecord({ id: "invite_old", createdAt: date("2026-05-02") }),
    ]);

    const invites = await service.listMemberInvites("user_1", {
      slug: "acme",
    });

    expect(mockProjectMemberInviteUpdateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        status: ProjectMemberInviteStatus.PENDING,
        expiresAt: { lte: expect.any(Date) },
      },
      data: { status: ProjectMemberInviteStatus.EXPIRED },
    });
    expect(mockProjectMemberInviteFindMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        status: ProjectMemberInviteStatus.PENDING,
        expiresAt: { gt: expect.any(Date) },
      },
      orderBy: { createdAt: "desc" },
      select: expect.any(Object),
    });
    expect(invites.map((invite) => invite.id)).toEqual([
      "invite_new",
      "invite_old",
    ]);
  });

  it("revokes pending project member invites and records audit", async () => {
    mockProjectFindUnique.mockResolvedValue(projectRecord());
    mockProjectMemberInviteFindFirst.mockResolvedValue(inviteRecord());
    mockProjectMemberInviteUpdate.mockResolvedValue(
      inviteRecord({ status: ProjectMemberInviteStatus.REVOKED }),
    );

    const invite = await service.revokeMemberInvite(
      "admin_1",
      { slug: "acme", inviteId: "invite_1" },
      {
        actorType: "user",
        userId: "admin_1",
        clerkOrgPermissions: [],
        scopes: [],
      },
    );

    expect(mockProjectMemberInviteUpdate).toHaveBeenCalledWith({
      where: { id: "invite_1" },
      data: { status: ProjectMemberInviteStatus.REVOKED },
      select: expect.any(Object),
    });
    expect(mockProjectActionAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "member.invite_revoked",
        targetId: "invite_1",
      }),
    });
    expect(invite.status).toBe(ProjectMemberInviteStatus.REVOKED);
  });

  it.each([
    ProjectMemberInviteStatus.REVOKED,
    ProjectMemberInviteStatus.EXPIRED,
  ])("treats %s project member invite revoke as idempotent", async (status) => {
    mockProjectFindUnique.mockResolvedValue(projectRecord());
    mockProjectMemberInviteFindFirst.mockResolvedValue(
      inviteRecord({ status }),
    );

    const invite = await service.revokeMemberInvite("admin_1", {
      slug: "acme",
      inviteId: "invite_1",
    });

    expect(mockProjectMemberInviteUpdate).not.toHaveBeenCalled();
    expect(mockProjectActionAuditCreate).not.toHaveBeenCalled();
    expect(invite.status).toBe(status);
  });

  it("accepts matching pending invites and creates project membership", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "invitee_1",
      email: "Invitee@Example.com",
    });
    mockProjectMemberInviteFindUnique.mockResolvedValue(inviteRecord());
    mockProjectMemberInviteUpdate.mockResolvedValue(
      inviteRecord({
        status: ProjectMemberInviteStatus.ACCEPTED,
        acceptedByUserId: "invitee_1",
        acceptedAt: date("2026-05-04"),
      }),
    );
    mockProjectMemberUpsert.mockResolvedValue(
      projectMemberRecord({
        id: "membership_1",
        userId: "invitee_1",
        role: MemberRole.EDITOR,
      }),
    );

    const result = await service.acceptMemberInvite("invitee_1", {
      inviteId: "invite_1",
    });

    expect(mockProjectMemberInviteUpdate).toHaveBeenCalledWith({
      where: { id: "invite_1" },
      data: {
        status: ProjectMemberInviteStatus.ACCEPTED,
        acceptedByUserId: "invitee_1",
        acceptedAt: expect.any(Date),
      },
      select: expect.any(Object),
    });
    expect(mockProjectMemberUpsert).toHaveBeenCalledWith({
      where: {
        projectId_userId: {
          projectId: "project_1",
          userId: "invitee_1",
        },
      },
      update: { role: MemberRole.EDITOR },
      create: {
        projectId: "project_1",
        userId: "invitee_1",
        role: MemberRole.EDITOR,
      },
      select: expect.any(Object),
    });
    expect(mockProjectActionAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "member.invite_accepted",
        actorId: "invitee_1",
        targetId: "invite_1",
      }),
    });
    expect(mockCreateForProjectManagers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "PROJECT_INVITE_ACCEPTED",
        link: "/projects/acme/settings/members",
        metadata: expect.objectContaining({
          inviteId: "invite_1",
          memberId: "membership_1",
          userId: "invitee_1",
        }),
      }),
      { excludeUserIds: ["invitee_1"] },
      expect.any(Object),
    );
    expect(result).toMatchObject({
      invite: { status: ProjectMemberInviteStatus.ACCEPTED },
      member: { id: "membership_1", userId: "invitee_1" },
    });
  });

  it("rejects invite accept when the current user email does not match", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "wrong_user",
      email: "wrong@example.com",
    });
    mockProjectMemberInviteFindUnique.mockResolvedValue(inviteRecord());

    await expect(
      service.acceptMemberInvite("wrong_user", { inviteId: "invite_1" }),
    ).rejects.toThrow(ForbiddenException);

    expect(mockProjectMemberUpsert).not.toHaveBeenCalled();
  });

  it("rejects non-pending invite accept attempts", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "invitee_1",
      email: "invitee@example.com",
    });
    mockProjectMemberInviteFindUnique.mockResolvedValue(
      inviteRecord({ status: ProjectMemberInviteStatus.REVOKED }),
    );

    await expect(
      service.acceptMemberInvite("invitee_1", { inviteId: "invite_1" }),
    ).rejects.toThrow(ConflictException);

    expect(mockProjectMemberUpsert).not.toHaveBeenCalled();
  });

  it("rejects expired invite accept attempts and marks the invite expired", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "invitee_1",
      email: "invitee@example.com",
    });
    mockProjectMemberInviteFindUnique.mockResolvedValue(
      inviteRecord({ expiresAt: date("2000-01-01") }),
    );

    await expect(
      service.acceptMemberInvite("invitee_1", { inviteId: "invite_1" }),
    ).rejects.toThrow(ConflictException);

    expect(mockProjectMemberInviteUpdate).toHaveBeenCalledWith({
      where: { id: "invite_1" },
      data: { status: ProjectMemberInviteStatus.EXPIRED },
      select: { id: true },
    });
    expect(mockProjectMemberUpsert).not.toHaveBeenCalled();
  });

  it("creates pending ownership transfers for existing members and notifies the recipient", async () => {
    mockProjectFindUnique.mockResolvedValue(
      projectRecord({ userId: "owner_1" }),
    );
    mockProjectMemberFindUnique.mockResolvedValue(
      projectMemberRecord({ userId: "member_1", role: MemberRole.ADMIN }),
    );
    mockProjectOwnershipTransferFindFirst.mockResolvedValue(null);
    mockProjectOwnershipTransferCreate.mockResolvedValue(transferRecord());

    const transfer = await service.initiateOwnershipTransfer(
      "owner_1",
      { slug: "acme" },
      { toUserId: "member_1", confirmName: "Acme" },
    );

    expect(mockProjectOwnershipTransferUpdateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        status: ProjectOwnershipTransferStatus.PENDING,
        expiresAt: { lte: expect.any(Date) },
      },
      data: { status: ProjectOwnershipTransferStatus.EXPIRED },
    });
    expect(mockProjectOwnershipTransferCreate).toHaveBeenCalledWith({
      data: {
        projectId: "project_1",
        fromUserId: "owner_1",
        toUserId: "member_1",
        initiatedByUserId: "owner_1",
      },
      select: expect.any(Object),
    });
    expect(mockProjectActionAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "project.ownership_transfer_requested",
        targetType: "project_ownership_transfer",
        targetId: "transfer_1",
      }),
    });
    expect(mockCreateForUsers).toHaveBeenCalledWith(
      ["member_1"],
      expect.objectContaining({
        type: NotificationType.PROJECT_TRANSFER_REQUESTED,
        link: "/projects",
        metadata: expect.objectContaining({ transferId: "transfer_1" }),
      }),
      expect.any(Object),
    );
    expect(transfer).toMatchObject({
      id: "transfer_1",
      projectSlug: "acme",
      fromUser: { id: "owner_1" },
      toUser: { id: "member_1" },
      status: ProjectOwnershipTransferStatus.PENDING,
    });
  });

  it("rejects ownership transfer initiation by non-primary owners", async () => {
    mockProjectFindUnique.mockResolvedValue(
      projectRecord({ userId: "owner_1" }),
    );

    await expect(
      service.initiateOwnershipTransfer(
        "admin_1",
        { slug: "acme" },
        { toUserId: "member_1", confirmName: "Acme" },
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(mockProjectOwnershipTransferCreate).not.toHaveBeenCalled();
  });

  it("rejects ownership transfers to non-members", async () => {
    mockProjectFindUnique.mockResolvedValue(
      projectRecord({ userId: "owner_1" }),
    );
    mockProjectMemberFindUnique.mockResolvedValue(null);

    await expect(
      service.initiateOwnershipTransfer(
        "owner_1",
        { slug: "acme" },
        { toUserId: "stranger_1", confirmName: "Acme" },
      ),
    ).rejects.toThrow(UnprocessableEntityException);

    expect(mockProjectOwnershipTransferCreate).not.toHaveBeenCalled();
  });

  it("cancels the pending ownership transfer and notifies the recipient", async () => {
    mockProjectFindUnique.mockResolvedValue(
      projectRecord({ userId: "owner_1" }),
    );
    mockProjectOwnershipTransferFindFirst.mockResolvedValue(transferRecord());
    mockProjectOwnershipTransferUpdate.mockResolvedValue(
      transferRecord({ status: ProjectOwnershipTransferStatus.CANCELLED }),
    );

    const transfer = await service.cancelOwnershipTransfer("owner_1", {
      slug: "acme",
    });

    expect(mockProjectOwnershipTransferUpdate).toHaveBeenCalledWith({
      where: { id: "transfer_1" },
      data: { status: ProjectOwnershipTransferStatus.CANCELLED },
      select: expect.any(Object),
    });
    expect(mockProjectActionAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "project.ownership_transfer_cancelled",
        targetId: "transfer_1",
      }),
    });
    expect(mockCreateForUsers).toHaveBeenCalledWith(
      ["member_1"],
      expect.objectContaining({
        type: NotificationType.PROJECT_TRANSFER_CANCELLED,
        link: "/projects/acme/settings/danger",
      }),
      expect.any(Object),
    );
    expect(transfer?.status).toBe(ProjectOwnershipTransferStatus.CANCELLED);
  });

  it("lists pending ownership transfers addressed to the current user", async () => {
    mockProjectOwnershipTransferFindMany.mockResolvedValue([
      transferRecord({ id: "transfer_new", createdAt: date("2026-05-04") }),
      transferRecord({ id: "transfer_old", createdAt: date("2026-05-03") }),
    ]);

    const transfers = await service.listIncomingOwnershipTransfers("member_1");

    expect(mockProjectOwnershipTransferUpdateMany).toHaveBeenCalledWith({
      where: {
        toUserId: "member_1",
        status: ProjectOwnershipTransferStatus.PENDING,
        expiresAt: { lte: expect.any(Date) },
      },
      data: { status: ProjectOwnershipTransferStatus.EXPIRED },
    });
    expect(mockProjectOwnershipTransferFindMany).toHaveBeenCalledWith({
      where: {
        toUserId: "member_1",
        status: ProjectOwnershipTransferStatus.PENDING,
        expiresAt: { gt: expect.any(Date) },
      },
      orderBy: { createdAt: "desc" },
      select: expect.any(Object),
    });
    expect(transfers.map((transfer) => transfer.id)).toEqual([
      "transfer_new",
      "transfer_old",
    ]);
  });

  it("accepts ownership transfers atomically and demotes the former owner to admin", async () => {
    mockProjectOwnershipTransferFindUnique.mockResolvedValue(transferRecord());
    mockProjectUpdateMany.mockResolvedValue({ count: 1 });
    mockProjectMemberUpsert
      .mockResolvedValueOnce({ id: "recipient_member" })
      .mockResolvedValueOnce({ id: "former_owner_member" });
    mockProjectOwnershipTransferUpdate.mockResolvedValue(
      transferRecord({
        status: ProjectOwnershipTransferStatus.ACCEPTED,
        respondedByUserId: "member_1",
        respondedAt: date("2026-05-05"),
      }),
    );

    const transfer = await service.acceptOwnershipTransfer("member_1", {
      transferId: "transfer_1",
    });

    expect(mockProjectUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "project_1",
        userId: "owner_1",
      },
      data: { userId: "member_1" },
    });
    expect(mockProjectMemberUpsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        update: { role: MemberRole.OWNER },
        create: expect.objectContaining({
          userId: "member_1",
          role: MemberRole.OWNER,
        }),
      }),
    );
    expect(mockProjectMemberUpsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        update: { role: MemberRole.ADMIN },
        create: expect.objectContaining({
          userId: "owner_1",
          role: MemberRole.ADMIN,
        }),
      }),
    );
    expect(mockProjectActionAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "project.ownership_transfer_accepted",
        actorId: "member_1",
        targetId: "transfer_1",
      }),
    });
    expect(mockCreateForProjectManagers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: NotificationType.PROJECT_TRANSFER_ACCEPTED,
        link: "/projects/acme/settings/danger",
      }),
      { excludeUserIds: ["member_1"] },
      expect.any(Object),
    );
    expect(transfer.status).toBe(ProjectOwnershipTransferStatus.ACCEPTED);
  });

  it("declines ownership transfers and notifies the initiator", async () => {
    mockProjectOwnershipTransferFindUnique.mockResolvedValue(transferRecord());
    mockProjectOwnershipTransferUpdate.mockResolvedValue(
      transferRecord({
        status: ProjectOwnershipTransferStatus.DECLINED,
        respondedByUserId: "member_1",
        respondedAt: date("2026-05-05"),
      }),
    );

    const transfer = await service.declineOwnershipTransfer("member_1", {
      transferId: "transfer_1",
    });

    expect(mockProjectOwnershipTransferUpdate).toHaveBeenCalledWith({
      where: { id: "transfer_1" },
      data: {
        status: ProjectOwnershipTransferStatus.DECLINED,
        respondedByUserId: "member_1",
        respondedAt: expect.any(Date),
      },
      select: expect.any(Object),
    });
    expect(mockCreateForUsers).toHaveBeenCalledWith(
      ["owner_1"],
      expect.objectContaining({
        type: NotificationType.PROJECT_TRANSFER_DECLINED,
        link: "/projects/acme/settings/danger",
      }),
      expect.any(Object),
    );
    expect(transfer.status).toBe(ProjectOwnershipTransferStatus.DECLINED);
  });

  it("marks expired ownership transfers before rejecting accept attempts", async () => {
    mockProjectOwnershipTransferFindUnique.mockResolvedValue(
      transferRecord({ expiresAt: date("2000-01-01") }),
    );
    mockProjectOwnershipTransferUpdate.mockResolvedValue(
      transferRecord({ status: ProjectOwnershipTransferStatus.EXPIRED }),
    );

    await expect(
      service.acceptOwnershipTransfer("member_1", {
        transferId: "transfer_1",
      }),
    ).rejects.toThrow(ConflictException);

    expect(mockProjectOwnershipTransferUpdate).toHaveBeenCalledWith({
      where: { id: "transfer_1" },
      data: { status: ProjectOwnershipTransferStatus.EXPIRED },
      select: { id: true },
    });
    expect(mockProjectUpdateMany).not.toHaveBeenCalled();
  });
});

function projectRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "project_1",
    userId: "user_1",
    organizationId: null,
    name: "Acme",
    shortDescription: null,
    description: null,
    slug: "acme",
    logoUrl: null,
    projectType: null,
    websiteUrl: null,
    collectionFormUrl: null,
    brandColorPrimary: null,
    brandColorSecondary: null,
    socialLinks: null,
    tags: [],
    visibility: "PRIVATE",
    isActive: true,
    autoModeration: true,
    autoApproveVerified: false,
    profanityFilterLevel: "MODERATE",
    formConfig: null,
    createdAt: new Date("2026-05-02T00:00:00.000Z"),
    updatedAt: new Date("2026-05-02T00:00:00.000Z"),
    _count: {
      formResponses: 0,
      widgets: 0,
      apiKeys: 0,
    },
    ...overrides,
  };
}

function projectMemberRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "membership_1",
    userId: "invitee_1",
    role: MemberRole.EDITOR,
    createdAt: date("2026-05-04"),
    user: {
      id: "invitee_1",
      firstName: "Invited",
      lastName: "User",
      email: "invitee@example.com",
      avatar: null,
    },
    ...overrides,
  };
}

function inviteRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "invite_1",
    projectId: "project_1",
    email: "invitee@example.com",
    role: MemberRole.EDITOR,
    status: ProjectMemberInviteStatus.PENDING,
    invitedByUserId: "admin_1",
    acceptedByUserId: null,
    acceptedAt: null,
    expiresAt: date("2999-01-01"),
    createdAt: date("2026-05-02"),
    updatedAt: date("2026-05-02"),
    project: {
      slug: "acme",
      name: "Acme",
    },
    ...overrides,
  };
}

function transferRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "transfer_1",
    projectId: "project_1",
    fromUserId: "owner_1",
    toUserId: "member_1",
    status: ProjectOwnershipTransferStatus.PENDING,
    initiatedByUserId: "owner_1",
    respondedByUserId: null,
    respondedAt: null,
    expiresAt: date("2999-01-01"),
    createdAt: date("2026-05-03"),
    updatedAt: date("2026-05-03"),
    project: {
      slug: "acme",
      name: "Acme",
      userId: "owner_1",
    },
    fromUser: {
      id: "owner_1",
      firstName: "Owner",
      lastName: "User",
      email: "owner@example.com",
      avatar: null,
    },
    toUser: {
      id: "member_1",
      firstName: "Member",
      lastName: "User",
      email: "member@example.com",
      avatar: null,
    },
    ...overrides,
  };
}

function publicSurfaceHostRecord(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id: "host_1",
    projectId: "project_1",
    feature: "COLLECTION",
    resourceType: "PROJECT",
    resourceId: null,
    hostname: "acme.testimonials.semblia.com",
    isDefault: true,
    status: "ACTIVE",
    verifiedAt: new Date("2026-05-02T00:00:00.000Z"),
    createdAt: new Date("2026-05-02T00:00:00.000Z"),
    updatedAt: new Date("2026-05-02T00:00:00.000Z"),
    ...overrides,
  };
}

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
