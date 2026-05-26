import { describe, expect, it } from "vitest";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { UserActorGuard } from "./user-actor.guard.js";
import { buildCredentialActorContext } from "../authz/actor-context.js";

function ctxWith(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("UserActorGuard", () => {
  const guard = new UserActorGuard();

  it("allows user-actor requests", () => {
    const request = {
      actor: {
        actorType: "user" as const,
        userId: "u1",
        clerkOrgPermissions: [],
        scopes: [],
      },
    };
    expect(guard.canActivate(ctxWith(request))).toBe(true);
  });

  it("rejects api_key actor", () => {
    const request = {
      actor: buildCredentialActorContext({
        actorType: "api_key",
        userId: "u1",
        projectId: "p1",
        credentialId: "ak_1",
        scopes: ["VIEW_PROJECT"],
      }),
    };
    expect(() => guard.canActivate(ctxWith(request))).toThrow(
      ForbiddenException,
    );
  });

  it("rejects agent_key actor", () => {
    const request = {
      actor: buildCredentialActorContext({
        actorType: "agent_key",
        userId: "u1",
        projectId: "p1",
        credentialId: "ag_1",
        scopes: [],
      }),
    };
    expect(() => guard.canActivate(ctxWith(request))).toThrow(
      ForbiddenException,
    );
  });

  it("rejects unauthenticated requests with no actor or user id", () => {
    expect(() => guard.canActivate(ctxWith({}))).toThrow(ForbiddenException);
  });

  it("treats raw user-id requests (no actor block) as user actors", () => {
    expect(
      guard.canActivate(ctxWith({ user: { id: "u1" } })),
    ).toBe(true);
  });
});
