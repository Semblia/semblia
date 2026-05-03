import { describe, expect, it } from "vitest";
import {
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
});
