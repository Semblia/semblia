import { MemberRole } from "@workspace/database/prisma";

export enum Capability {
  VIEW_PROJECT = "VIEW_PROJECT",
  OPERATE_PROJECT = "OPERATE_PROJECT",
  REVIEW_TESTIMONIALS = "REVIEW_TESTIMONIALS",
  PUBLISH_TESTIMONIALS = "PUBLISH_TESTIMONIALS",
  MANAGE_PUBLISH_SURFACES = "MANAGE_PUBLISH_SURFACES",
  VIEW_CREDENTIALS = "VIEW_CREDENTIALS",
  VIEW_INTEGRATIONS = "VIEW_INTEGRATIONS",
  MANAGE_INTEGRATIONS = "MANAGE_INTEGRATIONS",
  VIEW_AGENT_ACCESS = "VIEW_AGENT_ACCESS",
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

export function credentialScopeCapabilities(
  scopes: readonly string[],
): ReadonlySet<Capability> {
  const capabilities = new Set<Capability>();

  for (const scope of scopes) {
    for (const capability of CREDENTIAL_SCOPE_CAPABILITY_MAP[scope] ?? []) {
      capabilities.add(capability);
    }
  }

  return capabilities;
}

export function roleHasCapability(
  role: MemberRole,
  capability: Capability,
): boolean {
  return ROLE_CAPABILITIES[role].has(capability);
}

const CREDENTIAL_SCOPE_CAPABILITY_MAP: Record<string, Capability[]> = {
  "project:read": [Capability.VIEW_PROJECT],
  "submissions:read": [Capability.VIEW_PROJECT],
  "submissions:annotate": [
    Capability.VIEW_PROJECT,
    Capability.REVIEW_TESTIMONIALS,
  ],
  "submissions:moderate": [
    Capability.VIEW_PROJECT,
    Capability.REVIEW_TESTIMONIALS,
  ],
  "testimonials:read": [Capability.VIEW_PROJECT],
  "testimonials:publish": [
    Capability.VIEW_PROJECT,
    Capability.PUBLISH_TESTIMONIALS,
  ],
  "testimonials:unpublish": [
    Capability.VIEW_PROJECT,
    Capability.PUBLISH_TESTIMONIALS,
  ],
  "testimonials:tag": [Capability.VIEW_PROJECT, Capability.REVIEW_TESTIMONIALS],
  "testimonials:display_suggest": [
    Capability.VIEW_PROJECT,
    Capability.REVIEW_TESTIMONIALS,
  ],
  "analytics:read": [Capability.VIEW_PROJECT],
  "exports:read": [Capability.VIEW_PROJECT, Capability.VIEW_INTEGRATIONS],
  "exports:write": [Capability.VIEW_PROJECT, Capability.MANAGE_INTEGRATIONS],
  "webhooks:read": [Capability.VIEW_PROJECT, Capability.VIEW_INTEGRATIONS],
  "webhooks:write": [Capability.VIEW_PROJECT, Capability.MANAGE_INTEGRATIONS],
  "integrations:read": [Capability.VIEW_PROJECT, Capability.VIEW_INTEGRATIONS],
  "integrations:write": [
    Capability.VIEW_PROJECT,
    Capability.MANAGE_INTEGRATIONS,
  ],
  "credentials:read": [Capability.VIEW_PROJECT, Capability.VIEW_CREDENTIALS],
  "credentials:write": [
    Capability.VIEW_PROJECT,
    Capability.VIEW_CREDENTIALS,
    Capability.MANAGE_CREDENTIALS,
  ],
  "agent:read": [Capability.VIEW_PROJECT, Capability.VIEW_AGENT_ACCESS],
  "agent:write": [
    Capability.VIEW_PROJECT,
    Capability.VIEW_AGENT_ACCESS,
    Capability.MANAGE_AGENT_ACCESS,
  ],
};
