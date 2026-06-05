import { describe, expect, it, vi } from "vitest";
import { AdminAuditService } from "./admin-audit.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

describe("AdminAuditService", () => {
  it("records admin audit rows with explicit mutation context", async () => {
    const create = vi.fn(async () => ({ id: "audit_1" }));
    const service = new AdminAuditService({
      client: {
        adminAuditLog: { create },
      },
    } as unknown as PrismaService);

    await service.record({
      adminUserId: "admin_1",
      action: "create_plan",
      targetType: "plan",
      targetId: "plan_1",
      metadata: { type: "PRO", price: 99900 },
      ipAddress: "203.0.113.10",
      userAgent: "vitest",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        adminUserId: "admin_1",
        action: "create_plan",
        targetType: "plan",
        targetId: "plan_1",
        metadata: { type: "PRO", price: 99900 },
        ipAddress: "203.0.113.10",
        userAgent: "vitest",
      },
    });
  });

  it("lists recent admin audit rows with actor email and bounded limit", async () => {
    const createdAt = new Date("2026-06-05T09:00:00.000Z");
    const findMany = vi.fn(async () => [
      {
        id: "audit_1",
        adminUserId: "admin_1",
        action: "grant_admin",
        targetType: "admin_user",
        targetId: "admin_2",
        metadata: { email: "target@tresta.app" },
        ipAddress: "203.0.113.10",
        userAgent: "vitest",
        createdAt,
        adminUser: { email: "owner@tresta.app" },
      },
    ]);
    const service = new AdminAuditService({
      client: {
        adminAuditLog: { findMany },
      },
    } as unknown as PrismaService);

    await expect(service.listRecent({ limit: 25 })).resolves.toEqual([
      {
        id: "audit_1",
        adminUserId: "admin_1",
        adminEmail: "owner@tresta.app",
        action: "grant_admin",
        targetType: "admin_user",
        targetId: "admin_2",
        metadata: { email: "target@tresta.app" },
        ipAddress: "203.0.113.10",
        userAgent: "vitest",
        createdAt: "2026-06-05T09:00:00.000Z",
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { adminUser: { select: { email: true } } },
    });
  });
});
