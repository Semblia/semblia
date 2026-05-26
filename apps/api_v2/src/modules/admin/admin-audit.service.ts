import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@workspace/database/prisma";
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
}
