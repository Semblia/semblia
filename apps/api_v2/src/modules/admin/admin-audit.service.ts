import { Inject, Injectable } from "@nestjs/common";
import type { AdminAuditLog, Prisma } from "@workspace/database/prisma";
import { PrismaService } from "../prisma/prisma.service.js";

export type AdminAuditRecordParams = {
  adminUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

type AdminAuditLogWithActor = AdminAuditLog & {
  adminUser: {
    email: string;
  };
};

type AdminAuditLogDto = {
  id: string;
  adminUserId: string;
  adminEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Prisma.JsonValue | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

@Injectable()
export class AdminAuditService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async record(params: AdminAuditRecordParams): Promise<void> {
    await this.prisma.client.adminAuditLog.create({
      data: {
        adminUserId: params.adminUserId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async listRecent(params: { limit: number }): Promise<AdminAuditLogDto[]> {
    const logs = await this.prisma.client.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(params.limit, 1), 100),
      include: { adminUser: { select: { email: true } } },
    });

    return logs.map((log) => this.toDto(log));
  }

  private toDto(log: AdminAuditLogWithActor): AdminAuditLogDto {
    return {
      id: log.id,
      adminUserId: log.adminUserId,
      adminEmail: log.adminUser.email,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    };
  }
}
