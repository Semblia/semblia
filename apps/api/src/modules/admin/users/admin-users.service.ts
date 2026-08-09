import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AdminUser, Prisma } from "@workspace/database/prisma";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { CreateAdminUserBodyDto } from "./admin-users.dto.js";

type AdminMutationContext = {
  id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
};

type AdminUserDto = {
  id: string;
  clerkUserId: string;
  email: string;
  isActive: boolean;
  grantedByEmail: string | null;
  grantedAt: string;
  revokedAt: string | null;
  lastLoginAt: string | null;
  notes: string | null;
};

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async listAdmins(): Promise<AdminUserDto[]> {
    const admins = await this.prisma.client.adminUser.findMany({
      orderBy: { grantedAt: "desc" },
    });

    return admins.map((admin) => this.toDto(admin));
  }

  async grantAdmin(
    actor: AdminMutationContext,
    body: CreateAdminUserBodyDto,
  ): Promise<AdminUserDto> {
    const email = body.email.trim().toLowerCase();
    const clerkUserId = body.clerkUserId.trim();
    const notes = body.notes?.trim() || null;

    return this.prisma.client.$transaction(async (tx) => {
      const matches = await tx.adminUser.findMany({
        where: {
          OR: [{ email }, { clerkUserId }],
        },
      });
      const exact = matches.find(
        (admin) =>
          admin.email === email && admin.clerkUserId === clerkUserId,
      );

      if (matches.length > 0 && !exact) {
        throw new ConflictException(
          "Admin email and Clerk user id must refer to the same admin user",
        );
      }

      if (exact?.isActive) {
        return this.toDto(exact);
      }

      const admin = exact
        ? await tx.adminUser.update({
            where: { id: exact.id },
            data: {
              isActive: true,
              grantedByEmail: actor.email,
              grantedAt: new Date(),
              revokedAt: null,
              notes,
            },
          })
        : await tx.adminUser.create({
            data: {
              email,
              clerkUserId,
              isActive: true,
              grantedByEmail: actor.email,
              revokedAt: null,
              notes,
            },
          });

      await this.recordAudit(tx, {
        actor,
        action: exact ? "reactivate_admin" : "grant_admin",
        targetId: admin.id,
        metadata: {
          email: admin.email,
          clerkUserId: admin.clerkUserId,
        },
      });

      return this.toDto(admin);
    });
  }

  async deactivateAdmin(
    actor: AdminMutationContext,
    adminId: string,
  ): Promise<AdminUserDto> {
    if (actor.id === adminId) {
      throw new ForbiddenException("Admins cannot deactivate themselves");
    }

    return this.prisma.client.$transaction(async (tx) => {
      const existing = await tx.adminUser.findUnique({
        where: { id: adminId },
      });
      if (!existing) {
        throw new NotFoundException("Admin user not found");
      }

      if (!existing.isActive) {
        return this.toDto(existing);
      }

      const admin = await tx.adminUser.update({
        where: { id: adminId },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      await this.recordAudit(tx, {
        actor,
        action: "deactivate_admin",
        targetId: admin.id,
        metadata: {
          email: admin.email,
          clerkUserId: admin.clerkUserId,
        },
      });

      return this.toDto(admin);
    });
  }

  private async recordAudit(
    tx: Prisma.TransactionClient,
    params: {
      actor: AdminMutationContext;
      action: "grant_admin" | "reactivate_admin" | "deactivate_admin";
      targetId: string;
      metadata: Record<string, unknown>;
    },
  ) {
    await tx.adminAuditLog.create({
      data: {
        adminUserId: params.actor.id,
        action: params.action,
        targetType: "admin_user",
        targetId: params.targetId,
        metadata: params.metadata as Prisma.InputJsonValue,
        ipAddress: params.actor.ipAddress,
        userAgent: params.actor.userAgent,
      },
    });
  }

  private toDto(admin: AdminUser): AdminUserDto {
    return {
      id: admin.id,
      clerkUserId: admin.clerkUserId,
      email: admin.email,
      isActive: admin.isActive,
      grantedByEmail: admin.grantedByEmail,
      grantedAt: admin.grantedAt.toISOString(),
      revokedAt: admin.revokedAt?.toISOString() ?? null,
      lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
      notes: admin.notes,
    };
  }
}
