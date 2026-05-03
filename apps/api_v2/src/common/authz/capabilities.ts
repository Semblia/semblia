import { MemberRole } from "@workspace/database/prisma";

export enum Capability {
  VIEW_PROJECT = "VIEW_PROJECT",
  OPERATE_PROJECT = "OPERATE_PROJECT",
  REVIEW_TESTIMONIALS = "REVIEW_TESTIMONIALS",
  PUBLISH_TESTIMONIALS = "PUBLISH_TESTIMONIALS",
  MANAGE_PUBLISH_SURFACES = "MANAGE_PUBLISH_SURFACES",
  MANAGE_INTEGRATIONS = "MANAGE_INTEGRATIONS",
  MANAGE_CREDENTIALS = "MANAGE_CREDENTIALS",
  MANAGE_AGENT_ACCESS = "MANAGE_AGENT_ACCESS",
  MANAGE_PROJECT = "MANAGE_PROJECT",
  MANAGE_MEMBERS = "MANAGE_MEMBERS",
  MANAGE_BILLING = "MANAGE_BILLING",
}

const ORG_ADMIN_CAPABILITIES = new Set([
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

const ORG_MEMBER_CAPABILITIES = new Set([
  Capability.VIEW_PROJECT,
  Capability.OPERATE_PROJECT,
  Capability.REVIEW_TESTIMONIALS,
  Capability.PUBLISH_TESTIMONIALS,
]);

export const ROLE_CAPABILITIES: Record<MemberRole, ReadonlySet<Capability>> = {
  [MemberRole.OWNER]: ORG_ADMIN_CAPABILITIES,
  [MemberRole.ADMIN]: ORG_ADMIN_CAPABILITIES,
  [MemberRole.EDITOR]: new Set([
    Capability.VIEW_PROJECT,
    Capability.OPERATE_PROJECT,
    Capability.REVIEW_TESTIMONIALS,
    Capability.PUBLISH_TESTIMONIALS,
  ]),
  [MemberRole.VIEWER]: new Set([Capability.VIEW_PROJECT]),
};

export function clerkOrgRoleCapabilities(
  role: string | undefined,
): ReadonlySet<Capability> {
  return role === "admin" ? ORG_ADMIN_CAPABILITIES : ORG_MEMBER_CAPABILITIES;
}

export function roleHasCapability(
  role: MemberRole,
  capability: Capability,
): boolean {
  return ROLE_CAPABILITIES[role].has(capability);
}
