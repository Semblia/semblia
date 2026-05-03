import { describe, expect, it } from "vitest";
import { MemberRole } from "@workspace/database/prisma";
import {
  Capability,
  ROLE_CAPABILITIES,
  clerkOrgRoleCapabilities,
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
      Capability.MANAGE_INTEGRATIONS,
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
      Capability.MANAGE_INTEGRATIONS,
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
});
