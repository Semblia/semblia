import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { MemberRole } from "@workspace/database/prisma";
import { ProjectsService } from "./projects.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { OrganizationsService } from "../organizations/organizations.service.js";

const mockProjectFindUnique = vi.fn();
const mockProjectUpdate = vi.fn();
const mockProjectCreate = vi.fn();
const mockProjectMemberCreate = vi.fn();
const mockProjectTrustedOriginFindMany = vi.fn();
const mockPublicSurfaceHostCreateMany = vi.fn();
const mockTransaction = vi.fn();
const mockEnsureOrganizationForActor = vi.fn();

const prismaMock = {
  client: {
    $transaction: mockTransaction,
    project: {
      findUnique: mockProjectFindUnique,
      update: mockProjectUpdate,
      create: mockProjectCreate,
    },
    projectMember: {
      create: mockProjectMemberCreate,
    },
    projectTrustedOrigin: {
      findMany: mockProjectTrustedOriginFindMany,
    },
    publicSurfaceHost: {
      createMany: mockPublicSurfaceHostCreateMany,
    },
  },
} as unknown as PrismaService;

const organizationsServiceMock = {
  ensureForActor: mockEnsureOrganizationForActor,
} as unknown as OrganizationsService;

describe("ProjectsService allowed origins", () => {
  let service: ProjectsService;

  beforeEach(() => {
    service = new ProjectsService(prismaMock, organizationsServiceMock);
    vi.clearAllMocks();
    mockTransaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(prismaMock.client),
    );
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
        testimonials: 0,
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
    expect(mockPublicSurfaceHostCreateMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          feature: "COLLECTION",
          resourceType: "PROJECT",
          hostname: "acme.testimonials.tresta.app",
          isDefault: true,
          status: "ACTIVE",
          verifiedAt: expect.any(Date),
        },
        {
          projectId: "project_1",
          feature: "WALL",
          resourceType: "PROJECT",
          hostname: "acme.walls.tresta.app",
          isDefault: true,
          status: "ACTIVE",
          verifiedAt: expect.any(Date),
        },
      ],
      skipDuplicates: true,
    });
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
        testimonials: 0,
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
  });
});
