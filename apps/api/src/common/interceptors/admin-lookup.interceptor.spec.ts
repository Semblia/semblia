import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { of, lastValueFrom } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminLookupInterceptor } from "./admin-lookup.interceptor.js";

const now = new Date("2026-05-26T12:00:00.000Z");

function contextWith(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function callHandler(): CallHandler {
  return {
    handle: () => of("ok"),
  };
}

function prismaMock(adminUser: Record<string, unknown> | null) {
  return {
    client: {
      adminUser: {
        findUnique: vi.fn(async () => adminUser),
        update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
          ...adminUser,
          ...data,
        })),
      },
    },
  };
}

describe("AdminLookupInterceptor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("attaches the active AdminUser and refreshes stale lastLoginAt", async () => {
    const admin = {
      id: "admin_1",
      clerkUserId: "clerk_1",
      email: "admin@semblia.com",
      isActive: true,
      lastLoginAt: new Date("2026-05-26T11:50:00.000Z"),
    };
    const prisma = prismaMock(admin);
    const request = { adminClerkUserId: "clerk_1" };
    const interceptor = new AdminLookupInterceptor(prisma as never);

    await expect(
      lastValueFrom(interceptor.intercept(contextWith(request), callHandler())),
    ).resolves.toBe("ok");

    expect(prisma.client.adminUser.findUnique).toHaveBeenCalledWith({
      where: { clerkUserId: "clerk_1" },
    });
    expect(prisma.client.adminUser.update).toHaveBeenCalledWith({
      where: { id: "admin_1" },
      data: { lastLoginAt: now },
    });
    expect(request).toMatchObject({
      adminUser: {
        id: "admin_1",
        lastLoginAt: now,
      },
    });
  });

  it("does not write lastLoginAt again within the debounce window", async () => {
    const admin = {
      id: "admin_1",
      clerkUserId: "clerk_1",
      email: "admin@semblia.com",
      isActive: true,
      lastLoginAt: new Date("2026-05-26T11:58:00.000Z"),
    };
    const prisma = prismaMock(admin);
    const request = { adminClerkUserId: "clerk_1" };
    const interceptor = new AdminLookupInterceptor(prisma as never);

    await lastValueFrom(interceptor.intercept(contextWith(request), callHandler()));

    expect(prisma.client.adminUser.update).not.toHaveBeenCalled();
    expect(request).toMatchObject({ adminUser: admin });
  });

  it("rejects missing admin rows", async () => {
    const prisma = prismaMock(null);
    const interceptor = new AdminLookupInterceptor(prisma as never);

    await expect(
      lastValueFrom(
        interceptor.intercept(
          contextWith({ adminClerkUserId: "missing" }),
          callHandler(),
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects inactive admin rows", async () => {
    const prisma = prismaMock({
      id: "admin_1",
      clerkUserId: "clerk_1",
      email: "admin@semblia.com",
      isActive: false,
      lastLoginAt: null,
    });
    const interceptor = new AdminLookupInterceptor(prisma as never);

    await expect(
      lastValueFrom(
        interceptor.intercept(
          contextWith({ adminClerkUserId: "clerk_1" }),
          callHandler(),
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
