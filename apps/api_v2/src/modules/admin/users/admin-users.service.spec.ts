import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { AdminUsersService } from "./admin-users.service.js";

type AdminRecord = {
  id: string;
  clerkUserId: string;
  email: string;
  isActive: boolean;
  grantedByEmail: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
  lastLoginAt: Date | null;
  notes: string | null;
};

const now = new Date("2026-06-05T09:00:00.000Z");

function makeAdmin(overrides: Partial<AdminRecord> = {}): AdminRecord {
  return {
    id: "admin_1",
    clerkUserId: "clerk_admin_1",
    email: "admin@tresta.app",
    isActive: true,
    grantedByEmail: "owner@tresta.app",
    grantedAt: now,
    revokedAt: null,
    lastLoginAt: null,
    notes: null,
    ...overrides,
  };
}

function prismaMock(admins: AdminRecord[]) {
  const client = {
    adminUser: {
      findMany: vi.fn(async (args?: { where?: { OR?: Array<Record<string, string>> } }) => {
        const or = args?.where?.OR;
        if (!or) {
          return [...admins].sort(
            (left, right) =>
              right.grantedAt.getTime() - left.grantedAt.getTime(),
          );
        }
        return admins.filter((admin) =>
          or.some((condition) =>
            Object.entries(condition).some(
              ([key, value]) => admin[key as keyof AdminRecord] === value,
            ),
          ),
        );
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return admins.find((admin) => admin.id === where.id) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Partial<AdminRecord> }) => {
        const admin = makeAdmin({
          id: "admin_new",
          clerkUserId: data.clerkUserId,
          email: data.email,
          isActive: true,
          grantedByEmail: data.grantedByEmail ?? null,
          notes: data.notes ?? null,
        } as Partial<AdminRecord>);
        admins.push(admin);
        return admin;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<AdminRecord>;
        }) => {
          const admin = admins.find((entry) => entry.id === where.id);
          if (!admin) throw new Error("missing admin");
          Object.assign(admin, data);
          return admin;
        },
      ),
    },
    adminAuditLog: {
      create: vi.fn(async () => ({ id: "audit_1" })),
    },
    $transaction: vi.fn(async (callback) => callback(client)),
  };

  return { client } as unknown as PrismaService;
}

const actor = {
  id: "admin_actor",
  email: "owner@tresta.app",
  ipAddress: "203.0.113.10",
  userAgent: "vitest",
};

describe("AdminUsersService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  it("lists admin users newest grant first without leaking session data", async () => {
    const admins = [
      makeAdmin({ id: "old", email: "old@tresta.app", grantedAt: new Date("2026-06-01T00:00:00.000Z") }),
      makeAdmin({ id: "new", email: "new@tresta.app", grantedAt: new Date("2026-06-05T00:00:00.000Z") }),
    ];
    const prisma = prismaMock(admins);
    const service = new AdminUsersService(prisma);

    await expect(service.listAdmins()).resolves.toEqual([
      expect.objectContaining({
        id: "new",
        email: "new@tresta.app",
        grantedAt: "2026-06-05T00:00:00.000Z",
      }),
      expect.objectContaining({
        id: "old",
        email: "old@tresta.app",
        grantedAt: "2026-06-01T00:00:00.000Z",
      }),
    ]);
    expect(prisma.client.adminUser.findMany).toHaveBeenCalledWith({
      orderBy: { grantedAt: "desc" },
    });
    expect(await service.listAdmins()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ sessionToken: expect.anything() })]),
    );
  });

  it("grants admin access atomically and records the acting admin", async () => {
    const prisma = prismaMock([]);
    const service = new AdminUsersService(prisma);

    const granted = await service.grantAdmin(actor, {
      email: "  New.Admin@Tresta.App ",
      clerkUserId: " clerk_new ",
      notes: "  On-call owner  ",
    });

    expect(granted).toMatchObject({
      id: "admin_new",
      email: "new.admin@tresta.app",
      clerkUserId: "clerk_new",
      isActive: true,
      notes: "On-call owner",
    });
    expect(prisma.client.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.client.adminUser.create).toHaveBeenCalledWith({
      data: {
        email: "new.admin@tresta.app",
        clerkUserId: "clerk_new",
        isActive: true,
        grantedByEmail: "owner@tresta.app",
        revokedAt: null,
        notes: "On-call owner",
      },
    });
    expect(prisma.client.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminUserId: "admin_actor",
        action: "grant_admin",
        targetType: "admin_user",
        targetId: "admin_new",
        ipAddress: "203.0.113.10",
        userAgent: "vitest",
      }),
    });
  });

  it("rejects ambiguous grants when email and Clerk id belong to different rows", async () => {
    const service = new AdminUsersService(
      prismaMock([
        makeAdmin({ id: "by_email", email: "target@tresta.app", clerkUserId: "clerk_a" }),
        makeAdmin({ id: "by_clerk", email: "other@tresta.app", clerkUserId: "clerk_b" }),
      ]),
    );

    await expect(
      service.grantAdmin(actor, {
        email: "target@tresta.app",
        clerkUserId: "clerk_b",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("reactivates exact inactive admin rows with a fresh audit entry", async () => {
    const prisma = prismaMock([
      makeAdmin({
        id: "admin_old",
        email: "old@tresta.app",
        clerkUserId: "clerk_old",
        isActive: false,
        revokedAt: new Date("2026-06-04T00:00:00.000Z"),
      }),
    ]);
    const service = new AdminUsersService(prisma);

    const admin = await service.grantAdmin(actor, {
      email: "old@tresta.app",
      clerkUserId: "clerk_old",
    });

    expect(admin).toMatchObject({
      id: "admin_old",
      isActive: true,
      revokedAt: null,
    });
    expect(prisma.client.adminUser.update).toHaveBeenCalledWith({
      where: { id: "admin_old" },
      data: {
        isActive: true,
        grantedByEmail: "owner@tresta.app",
        grantedAt: now,
        revokedAt: null,
        notes: null,
      },
    });
    expect(prisma.client.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminUserId: "admin_actor",
        action: "reactivate_admin",
        targetId: "admin_old",
      }),
    });
  });

  it("deactivates another admin and refuses self-deactivation", async () => {
    const prisma = prismaMock([
      makeAdmin({ id: "admin_actor", email: "owner@tresta.app" }),
      makeAdmin({ id: "admin_target", email: "target@tresta.app" }),
    ]);
    const service = new AdminUsersService(prisma);

    await expect(service.deactivateAdmin(actor, "admin_actor")).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const deactivated = await service.deactivateAdmin(actor, "admin_target");
    expect(deactivated).toMatchObject({
      id: "admin_target",
      isActive: false,
      revokedAt: now.toISOString(),
    });
    expect(prisma.client.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminUserId: "admin_actor",
        action: "deactivate_admin",
        targetId: "admin_target",
      }),
    });
  });

  it("returns 404 for missing admin deactivation targets", async () => {
    const service = new AdminUsersService(prismaMock([]));

    await expect(
      service.deactivateAdmin(actor, "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
