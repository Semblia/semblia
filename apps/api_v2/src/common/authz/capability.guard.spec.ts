import { describe, expect, it, vi } from "vitest";
import {
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MemberRole } from "@workspace/database/prisma";
import { Capability } from "./capabilities.js";
import { CapabilityGuard } from "./capability.guard.js";
import type { ProjectAccessService } from "./project-access.service.js";

function createExecutionContext(
  request: Record<string, unknown>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => "handler",
    getClass: () => "controller",
  } as unknown as ExecutionContext;
}

describe("CapabilityGuard", () => {
  it("is a no-op when no capabilities are required", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const projectAccessService = {
      resolveBySlug: vi.fn(),
    } as unknown as ProjectAccessService;
    const guard = new CapabilityGuard(reflector, projectAccessService);

    await expect(
      guard.canActivate(
        createExecutionContext({ params: {}, user: { id: "user_1" } }),
      ),
    ).resolves.toBe(true);
    expect(projectAccessService.resolveBySlug).not.toHaveBeenCalled();
  });

  it("allows editors to use review-only routes", async () => {
    const reflector = {
      getAllAndOverride: vi
        .fn()
        .mockReturnValue([Capability.REVIEW_TESTIMONIALS]),
    } as unknown as Reflector;
    const projectAccessService = {
      resolveBySlug: vi.fn().mockResolvedValue({
        project: { id: "project_1", slug: "alpha", userId: "owner_1" },
        role: MemberRole.EDITOR,
        capabilities: new Set([
          Capability.VIEW_PROJECT,
          Capability.OPERATE_PROJECT,
          Capability.REVIEW_TESTIMONIALS,
          Capability.PUBLISH_TESTIMONIALS,
        ]),
      }),
    } as unknown as ProjectAccessService;
    const guard = new CapabilityGuard(reflector, projectAccessService);
    const request = { params: { slug: "alpha" }, user: { id: "editor_1" } };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);
    expect(request).toMatchObject({
      projectAccess: {
        projectId: "project_1",
        role: MemberRole.EDITOR,
      },
    });
  });

  it("allows editors to use publish routes under the content-operator model", async () => {
    const reflector = {
      getAllAndOverride: vi
        .fn()
        .mockReturnValue([Capability.PUBLISH_TESTIMONIALS]),
    } as unknown as Reflector;
    const projectAccessService = {
      resolveBySlug: vi.fn().mockResolvedValue({
        project: { id: "project_1", slug: "alpha", userId: "owner_1" },
        role: MemberRole.EDITOR,
        capabilities: new Set([
          Capability.VIEW_PROJECT,
          Capability.OPERATE_PROJECT,
          Capability.REVIEW_TESTIMONIALS,
          Capability.PUBLISH_TESTIMONIALS,
        ]),
      }),
    } as unknown as ProjectAccessService;
    const guard = new CapabilityGuard(reflector, projectAccessService);

    await expect(
      guard.canActivate(
        createExecutionContext({
          params: { slug: "alpha" },
          user: { id: "editor_1" },
        }),
      ),
    ).resolves.toBe(true);
  });

  it("allows viewers to use project read routes", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Capability.VIEW_PROJECT]),
    } as unknown as Reflector;
    const projectAccessService = {
      resolveBySlug: vi.fn().mockResolvedValue({
        project: { id: "project_1", slug: "alpha", userId: "owner_1" },
        role: MemberRole.VIEWER,
        capabilities: new Set([Capability.VIEW_PROJECT]),
      }),
    } as unknown as ProjectAccessService;
    const guard = new CapabilityGuard(reflector, projectAccessService);

    await expect(
      guard.canActivate(
        createExecutionContext({
          params: { slug: "alpha" },
          user: { id: "viewer_1" },
        }),
      ),
    ).resolves.toBe(true);
  });

  it("rejects viewers from publish routes", async () => {
    const reflector = {
      getAllAndOverride: vi
        .fn()
        .mockReturnValue([Capability.PUBLISH_TESTIMONIALS]),
    } as unknown as Reflector;
    const projectAccessService = {
      resolveBySlug: vi.fn().mockResolvedValue({
        project: { id: "project_1", slug: "alpha", userId: "owner_1" },
        role: MemberRole.VIEWER,
        capabilities: new Set([Capability.VIEW_PROJECT]),
      }),
    } as unknown as ProjectAccessService;
    const guard = new CapabilityGuard(reflector, projectAccessService);

    await expect(
      guard.canActivate(
        createExecutionContext({
          params: { slug: "alpha" },
          user: { id: "viewer_1" },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("throws when slug is missing", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Capability.VIEW_PROJECT]),
    } as unknown as Reflector;
    const projectAccessService = {
      resolveBySlug: vi.fn(),
    } as unknown as ProjectAccessService;
    const guard = new CapabilityGuard(reflector, projectAccessService);

    await expect(
      guard.canActivate(
        createExecutionContext({ params: {}, user: { id: "user_1" } }),
      ),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it("passes active actor context to project access resolution", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Capability.VIEW_PROJECT]),
    } as unknown as Reflector;
    const projectAccessService = {
      resolveBySlug: vi.fn().mockResolvedValue({
        project: {
          id: "project_1",
          slug: "alpha",
          userId: "owner_1",
          organizationId: "org_1",
        },
        role: "ORG_MEMBER",
        capabilities: new Set([Capability.VIEW_PROJECT]),
      }),
    } as unknown as ProjectAccessService;
    const guard = new CapabilityGuard(reflector, projectAccessService);
    const actor = {
      actorType: "user" as const,
      userId: "user_1",
      clerkOrgId: "org_clerk_1",
      clerkOrgSlug: "acme",
      clerkOrgRole: "member",
      clerkOrgPermissions: [],
      scopes: [],
    };

    await expect(
      guard.canActivate(
        createExecutionContext({
          params: { slug: "alpha" },
          actor,
          user: { id: "user_1" },
        }),
      ),
    ).resolves.toBe(true);
    expect(projectAccessService.resolveBySlug).toHaveBeenCalledWith(
      actor,
      "alpha",
    );
  });
});
