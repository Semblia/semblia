import {
  ForbiddenException,
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { AdminUser } from "@workspace/database/prisma";
import { from, mergeMap, type Observable } from "rxjs";
import { PrismaService } from "../../modules/prisma/prisma.service.js";

const LAST_LOGIN_DEBOUNCE_MS = 5 * 60 * 1000;

export type AdminLookupRequest = {
  adminClerkUserId?: string;
  adminUser?: AdminUser;
};

@Injectable()
export class AdminLookupInterceptor implements NestInterceptor {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AdminLookupRequest>();

    return from(this.resolveAdminUser(request)).pipe(
      mergeMap(() => next.handle()),
    );
  }

  private async resolveAdminUser(request: AdminLookupRequest): Promise<void> {
    if (!request.adminClerkUserId) {
      throw new ForbiddenException("Admin access required");
    }

    const adminUser = await this.prisma.client.adminUser.findUnique({
      where: { clerkUserId: request.adminClerkUserId },
    });

    if (!adminUser?.isActive) {
      throw new ForbiddenException("Admin access required");
    }

    request.adminUser = await this.maybeRefreshLastLogin(adminUser);
  }

  private async maybeRefreshLastLogin(adminUser: AdminUser) {
    if (
      adminUser.lastLoginAt &&
      Date.now() - adminUser.lastLoginAt.getTime() <= LAST_LOGIN_DEBOUNCE_MS
    ) {
      return adminUser;
    }

    return this.prisma.client.adminUser.update({
      where: { id: adminUser.id },
      data: { lastLoginAt: new Date() },
    });
  }
}
