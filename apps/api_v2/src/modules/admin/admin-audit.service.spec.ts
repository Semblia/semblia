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
});
