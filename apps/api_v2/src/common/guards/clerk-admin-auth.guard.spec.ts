import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { verifyToken } from "@clerk/backend";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClerkAdminAuthGuard } from "./clerk-admin-auth.guard.js";

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(),
}));

const verifyTokenMock = vi.mocked(verifyToken);

function contextWith(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function configService(values: Record<string, string | undefined>) {
  return {
    get: vi.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe("ClerkAdminAuthGuard", () => {
  beforeEach(() => {
    verifyTokenMock.mockReset();
  });

  it("verifies the bearer token with the admin Clerk app settings", async () => {
    verifyTokenMock.mockResolvedValue({
      __raw: "session_token",
      sub: "admin_clerk_1",
      iss: "https://semblia-admin.clerk.accounts.dev",
      sid: "sess_1",
      nbf: 0,
      exp: 1,
      iat: 0,
      v: 2,
    });
    const request = {
      headers: {
        authorization: "Bearer session_token",
      },
    };
    const guard = new ClerkAdminAuthGuard(
      configService({
        ADMIN_CLERK_SECRET_KEY: "sk_admin",
        ADMIN_CLERK_AUTHORIZED_PARTIES:
          "https://admin.semblia.com,http://localhost:3001",
        ADMIN_CLERK_JWT_AUDIENCE: "admin-api",
      }),
    );

    await expect(guard.canActivate(contextWith(request))).resolves.toBe(true);

    expect(verifyTokenMock).toHaveBeenCalledWith("session_token", {
      secretKey: "sk_admin",
      authorizedParties: [
        "https://admin.semblia.com",
        "http://localhost:3001",
      ],
      audience: "admin-api",
    });
    expect(request).toMatchObject({
      adminClerkUserId: "admin_clerk_1",
      adminActor: {
        type: "admin_session",
        clerkUserId: "admin_clerk_1",
      },
    });
  });

  it("rejects requests without a bearer token", async () => {
    const guard = new ClerkAdminAuthGuard(
      configService({ ADMIN_CLERK_SECRET_KEY: "sk_admin" }),
    );

    await expect(
      guard.canActivate(contextWith({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects invalid admin Clerk tokens", async () => {
    verifyTokenMock.mockRejectedValue(new Error("bad token"));
    const guard = new ClerkAdminAuthGuard(
      configService({ ADMIN_CLERK_SECRET_KEY: "sk_admin" }),
    );

    await expect(
      guard.canActivate(
        contextWith({ headers: { authorization: "Bearer bad_token" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects admin routes when the admin Clerk secret is not configured", async () => {
    const guard = new ClerkAdminAuthGuard(configService({}));

    await expect(
      guard.canActivate(
        contextWith({ headers: { authorization: "Bearer session_token" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyTokenMock).not.toHaveBeenCalled();
  });
});
