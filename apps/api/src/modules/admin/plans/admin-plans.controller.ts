import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { AdminUser } from "@workspace/database/prisma";
import { CurrentAdmin } from "../../../common/decorators/current-admin.decorator.js";
import { Public } from "../../../common/decorators/public.decorator.js";
import { RequireAdmin } from "../../../common/decorators/require-admin.decorator.js";
import { ZodValidationPipe } from "../../../common/zod/zod-validation.pipe.js";
import {
  adminPlanParamsSchema,
  createAdminPlanBodySchema,
  type AdminPlanParamsDto,
  type CreateAdminPlanBodyDto,
} from "./admin-plans.dto.js";
import { AdminPlansService } from "./admin-plans.service.js";

type AdminRequestMetadata = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

@Controller("admin/plans")
@Public()
@RequireAdmin()
export class AdminPlansController {
  constructor(private readonly adminPlansService: AdminPlansService) {}

  @Get()
  listPlans() {
    return this.adminPlansService.listPlans();
  }

  @Post()
  createPlan(
    @CurrentAdmin() admin: AdminUser,
    @Req() request: AdminRequestMetadata,
    @Body(new ZodValidationPipe(createAdminPlanBodySchema))
    body: CreateAdminPlanBodyDto,
  ) {
    return this.adminPlansService.createPlan(
      this.toMutationContext(admin, request),
      body,
    );
  }

  @Post(":id/deactivate")
  deactivatePlan(
    @CurrentAdmin() admin: AdminUser,
    @Req() request: AdminRequestMetadata,
    @Param(new ZodValidationPipe(adminPlanParamsSchema))
    params: AdminPlanParamsDto,
  ) {
    return this.adminPlansService.deactivatePlan(
      this.toMutationContext(admin, request),
      params.id,
    );
  }

  private toMutationContext(admin: AdminUser, request: AdminRequestMetadata) {
    return {
      id: admin.id,
      ipAddress: request.ip,
      userAgent: this.getHeader(request, "user-agent"),
    };
  }

  private getHeader(request: AdminRequestMetadata, name: string) {
    const value = request.headers?.[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
