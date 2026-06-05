import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator.js";
import { RequireAdmin } from "../../common/decorators/require-admin.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import { AdminAuditService } from "./admin-audit.service.js";
import {
  adminAuditLogsQuerySchema,
  type AdminAuditLogsQueryDto,
} from "./admin-audit.dto.js";

@Controller("admin/audit-logs")
@Public()
@RequireAdmin()
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  @Get()
  listAuditLogs(
    @Query(new ZodValidationPipe(adminAuditLogsQuerySchema))
    query: AdminAuditLogsQueryDto,
  ) {
    return this.adminAuditService.listRecent(query);
  }
}
