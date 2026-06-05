import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { AdminUser } from "@workspace/database/prisma";
import { CurrentAdmin } from "../../../common/decorators/current-admin.decorator.js";
import { Public } from "../../../common/decorators/public.decorator.js";
import { RequireAdmin } from "../../../common/decorators/require-admin.decorator.js";
import { ZodValidationPipe } from "../../../common/zod/zod-validation.pipe.js";
import {
  adminUserParamsSchema,
  createAdminUserBodySchema,
  type AdminUserParamsDto,
  type CreateAdminUserBodyDto,
} from "./admin-users.dto.js";
import { AdminUsersService } from "./admin-users.service.js";

type AdminRequestMetadata = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

@Controller("admin/users")
@Public()
@RequireAdmin()
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  listAdmins() {
    return this.adminUsersService.listAdmins();
  }

  @Post()
  grantAdmin(
    @CurrentAdmin() admin: AdminUser,
    @Req() request: AdminRequestMetadata,
    @Body(new ZodValidationPipe(createAdminUserBodySchema))
    body: CreateAdminUserBodyDto,
  ) {
    return this.adminUsersService.grantAdmin(
      this.toMutationContext(admin, request),
      body,
    );
  }

  @Post(":id/deactivate")
  deactivateAdmin(
    @CurrentAdmin() admin: AdminUser,
    @Req() request: AdminRequestMetadata,
    @Param(new ZodValidationPipe(adminUserParamsSchema))
    params: AdminUserParamsDto,
  ) {
    return this.adminUsersService.deactivateAdmin(
      this.toMutationContext(admin, request),
      params.id,
    );
  }

  private toMutationContext(admin: AdminUser, request: AdminRequestMetadata) {
    return {
      id: admin.id,
      email: admin.email,
      ipAddress: request.ip,
      userAgent: this.getHeader(request, "user-agent"),
    };
  }

  private getHeader(request: AdminRequestMetadata, name: string) {
    const value = request.headers?.[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
