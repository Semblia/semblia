import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { MemberRole } from "@workspace/database/prisma";
import { Capability } from "./capabilities.js";
import { ProjectAccessService } from "./project-access.service.js";
import type { PrismaService } from "../../modules/prisma/prisma.service.js";

const mockProjectFindUnique = vi.fn();
const mockProjectMemberFindUnique = vi.fn();

const prismaMock = {
  client: {
    project: { findUnique: mockProjectFindUnique },
    projectMember: { findUnique: mockProjectMemberFindUnique },
  },
} as unknown as PrismaService;

describe("ProjectAccessService", () => {
  let service: ProjectAccessService;

  beforeEach(() => {
    service = new ProjectAccessService(prismaMock);
    vi.clearAllMocks();
  });

  it("treats the project owner as OWNER even without a membership row", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "alpha",
      userId: "user_1",
      organizationId: "org_legacy_1",
      organization: { clerkOrgId: "legacy_user_user_1" },
    });
    mockProjectMemberFindUnique.mockResolvedValue(null);

    const result = await service.resolveBySlug("user_1", "alpha");

    expect(result.role).toBe(MemberRole.OWNER);
    expect(result.capabilities.has(Capability.MANAGE_PROJECT)).toBe(true);
  });

  it("returns member role capabilities for non-owner members", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "alpha",
      userId: "owner_1",
      organizationId: "org_legacy_1",
      organization: { clerkOrgId: "legacy_user_owner_1" },
    });
    mockProjectMemberFindUnique.mockResolvedValue({ role: MemberRole.EDITOR });

    const result = await service.resolveBySlug("editor_1", "alpha");

    expect(result.role).toBe(MemberRole.EDITOR);
    expect(result.capabilities.has(Capability.REVIEW_TESTIMONIALS)).toBe(true);
  });

  it("throws when the project is missing", async () => {
    mockProjectFindUnique.mockResolvedValue(null);

    await expect(service.resolveBySlug("user_1", "missing")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("throws when neither owner nor member has access", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "alpha",
      userId: "owner_1",
      organizationId: "org_legacy_1",
      organization: { clerkOrgId: "legacy_user_owner_1" },
    });
    mockProjectMemberFindUnique.mockResolvedValue(null);

    await expect(service.resolveBySlug("user_2", "alpha")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("authorizes projects through the active Clerk organization boundary", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "alpha",
      userId: "owner_1",
      organizationId: "org_1",
      organization: { clerkOrgId: "org_clerk_1" },
    });

    const result = await service.resolveBySlug(
      {
        actorType: "user",
        userId: "member_1",
        clerkOrgId: "org_clerk_1",
        clerkOrgRole: "admin",
        clerkOrgPermissions: [],
        scopes: [],
      },
      "alpha",
    );

    expect(result.role).toBe("ORG_ADMIN");
    expect(result.capabilities.has(Capability.MANAGE_CREDENTIALS)).toBe(true);
    expect(mockProjectMemberFindUnique).not.toHaveBeenCalled();
  });

  it("authorizes project-bound API key actors by their credential scopes", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "alpha",
      userId: "owner_1",
      organizationId: "org_1",
      organization: { clerkOrgId: "org_clerk_1" },
    });

    const result = await service.resolveBySlug(
      {
        actorType: "api_key",
        userId: "user_1",
        projectId: "project_1",
        credentialId: "key_1",
        clerkOrgPermissions: [],
        scopes: ["project:read", "credentials:write"],
      },
      "alpha",
    );

    expect(result.role).toBe("API_KEY");
    expect(result.capabilities.has(Capability.MANAGE_CREDENTIALS)).toBe(true);
    expect(result.capabilities.has(Capability.MANAGE_MEMBERS)).toBe(false);
    expect(mockProjectMemberFindUnique).not.toHaveBeenCalled();
  });

  it("rejects project-bound credential actors for other projects", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "project_2",
      slug: "bravo",
      userId: "owner_1",
      organizationId: "org_1",
      organization: { clerkOrgId: "org_clerk_1" },
    });

    await expect(
      service.resolveBySlug(
        {
          actorType: "agent_key",
          userId: "user_1",
          projectId: "project_1",
          credentialId: "key_1",
          clerkOrgPermissions: [],
          scopes: ["project:read"],
        },
        "bravo",
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(mockProjectMemberFindUnique).not.toHaveBeenCalled();
  });

  it("rejects active Clerk org mismatches without falling back to user ownership", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "alpha",
      userId: "user_1",
      organizationId: "org_1",
      organization: { clerkOrgId: "org_other" },
    });

    await expect(
      service.resolveBySlug(
        {
          actorType: "user",
          userId: "user_1",
          clerkOrgId: "org_clerk_1",
          clerkOrgRole: "admin",
          clerkOrgPermissions: [],
          scopes: [],
        },
        "alpha",
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(mockProjectMemberFindUnique).not.toHaveBeenCalled();
  });

  it("maps active Clerk org members to content-operation capabilities", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "project_1",
      slug: "alpha",
      userId: "owner_1",
      organizationId: "org_1",
      organization: { clerkOrgId: "org_clerk_1" },
    });

    const result = await service.resolveBySlug(
      {
        actorType: "user",
        userId: "member_1",
        clerkOrgId: "org_clerk_1",
        clerkOrgRole: "member",
        clerkOrgPermissions: [],
        scopes: [],
      },
      "alpha",
    );

    expect(result.role).toBe("ORG_MEMBER");
    expect(result.capabilities.has(Capability.PUBLISH_TESTIMONIALS)).toBe(true);
    expect(result.capabilities.has(Capability.MANAGE_PROJECT)).toBe(false);
  });
});
