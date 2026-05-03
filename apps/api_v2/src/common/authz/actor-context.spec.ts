import { describe, expect, it } from "vitest";
import {
  buildCredentialActorContext,
  buildUserActorContext,
  parseClerkOrganizationClaim,
} from "./actor-context.js";

describe("actor context helpers", () => {
  it("parses compact Clerk organization claims", () => {
    expect(
      parseClerkOrganizationClaim({
        id: "org_123",
        slg: "acme",
        rol: "admin",
        per: "read,manage",
      }),
    ).toEqual({
      id: "org_123",
      slg: "acme",
      rol: "admin",
      per: "read,manage",
    });
  });

  it("builds user actor context with parsed organization permissions", () => {
    expect(
      buildUserActorContext("user_1", {
        id: "org_123",
        slg: "acme",
        rol: "member",
        per: "read, manage",
      }),
    ).toEqual({
      actorType: "user",
      userId: "user_1",
      clerkOrgId: "org_123",
      clerkOrgSlug: "acme",
      clerkOrgRole: "member",
      clerkOrgPermissions: ["read", "manage"],
      scopes: [],
    });
  });

  it("builds credential actor context for scoped keys", () => {
    expect(
      buildCredentialActorContext({
        actorType: "agent_key",
        userId: "user_1",
        projectId: "project_1",
        credentialId: "key_1",
        scopes: ["project:read", "agent:read"],
      }),
    ).toEqual({
      actorType: "agent_key",
      userId: "user_1",
      clerkOrgPermissions: [],
      projectId: "project_1",
      credentialId: "key_1",
      scopes: ["project:read", "agent:read"],
    });
  });
});
