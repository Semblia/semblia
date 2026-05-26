import { Controller, Get } from "@nestjs/common";
import type { AdminUser } from "@workspace/database/prisma";
import { CurrentAdmin } from "../../common/decorators/current-admin.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { RequireAdmin } from "../../common/decorators/require-admin.decorator.js";

@Controller("admin")
@Public()
@RequireAdmin()
export class AdminController {
  @Get("me")
  me(@CurrentAdmin() admin: AdminUser) {
    return {
      id: admin.id,
      email: admin.email,
      isActive: admin.isActive,
      grantedAt: admin.grantedAt.toISOString(),
      lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    };
  }
}
