import { describe, expect, it } from "vitest";
import { MemberRole } from "@workspace/database/prisma";
import {
  Capability,
  ROLE_CAPABILITIES,
  clerkOrgRoleCapabilities,
  credentialScopeCapabilities,
  roleHasCapability,
} from "./capabilities.js";

describe("ROLE_CAPABILITIES", () => {
  it("matches the locked role capability table", () => {
    expect([...ROLE_CAPABILITIES[MemberRole.OWNER]]).toEqual([
      Capability.VIEW_PROJECT,
      Capability.OPERATE_PROJECT,
      Capability.REVIEW_TESTIMONIALS,
      Capability.PUBLISH_TESTIMONIALS,
      Capability.MANAGE_PUBLISH_SURFACES,
      Capability.VIEW_CREDENTIALS,
      Capability.VIEW_INTEGRATIONS,
      Capability.MANAGE_INTEGRATIONS,
      Capability.VIEW_AGENT_ACCESS,
      Capability.MANAGE_CREDENTIALS,
      Capability.MANAGE_AGENT_ACCESS,
      Capability.MANAGE_PROJECT,
      Capability.MANAGE_MEMBERS,
      Capability.MANAGE_BILLING,
    ]);

    expect([...ROLE_CAPABILITIES[MemberRole.ADMIN]]).toEqual([
      Capability.VIEW_PROJECT,
      Capability.OPERATE_PROJECT,
      Capability.REVIEW_TESTIMONIALS,
      Capability.PUBLISH_TESTIMONIALS,
      Capability.MANAGE_PUBLISH_SURFACES,
      Capability.VIEW_CREDENTIALS,
      Capability.VIEW_INTEGRATIONS,
      Capability.MANAGE_INTEGRATIONS,
      Capability.VIEW_AGENT_ACCESS,
      Capability.MANAGE_CREDENTIALS,
      Capability.MANAGE_AGENT_ACCESS,
      Capability.MANAGE_PROJECT,
      Capability.MANAGE_MEMBERS,
      Capability.MANAGE_BILLING,
    ]);

    expect([...ROLE_CAPABILITIES[MemberRole.EDITOR]]).toEqual([
      Capability.VIEW_PROJECT,
      Capability.OPERATE_PROJECT,
      Capability.REVIEW_TESTIMONIALS,
      Capability.PUBLISH_TESTIMONIALS,
    ]);

    expect([...ROLE_CAPABILITIES[MemberRole.VIEWER]]).toEqual([
      Capability.VIEW_PROJECT,
    ]);
  });

  it("checks role capability membership", () => {
    expect(
      roleHasCapability(MemberRole.EDITOR, Capability.REVIEW_TESTIMONIALS),
    ).toBe(true);
    expect(
      roleHasCapability(MemberRole.VIEWER, Capability.PUBLISH_TESTIMONIALS),
    ).toBe(false);
  });

  it("maps Clerk organization roles to v1 capability presets", () => {
    expect(
      clerkOrgRoleCapabilities("admin").has(Capability.MANAGE_CREDENTIALS),
    ).toBe(true);
    expect(
      clerkOrgRoleCapabilities("member").has(Capability.MANAGE_CREDENTIALS),
    ).toBe(false);
    expect(
      clerkOrgRoleCapabilities("member").has(Capability.PUBLISH_TESTIMONIALS),
    ).toBe(true);
  });

  it("maps credential scopes to project capabilities without member or billing powers", () => {
    const capabilities = credentialScopeCapabilities([
      "project:read",
      "credentials:write",
      "agent:write",
      "testimonials:publish",
      "billing:write",
      "members:write",
    ]);

    expect(capabilities.has(Capability.VIEW_PROJECT)).toBe(true);
    expect(capabilities.has(Capability.MANAGE_CREDENTIALS)).toBe(true);
    expect(capabilities.has(Capability.MANAGE_AGENT_ACCESS)).toBe(true);
    expect(capabilities.has(Capability.PUBLISH_TESTIMONIALS)).toBe(true);
    expect(capabilities.has(Capability.MANAGE_MEMBERS)).toBe(false);
    expect(capabilities.has(Capability.MANAGE_BILLING)).toBe(false);
  });

  it("keeps read-only integration scopes below integration write capability", () => {
    const capabilities = credentialScopeCapabilities([
      "exports:read",
      "webhooks:read",
      "integrations:read",
    ]);

    expect(capabilities.has(Capability.VIEW_INTEGRATIONS)).toBe(true);
    expect(capabilities.has(Capability.MANAGE_INTEGRATIONS)).toBe(false);
  });
});
