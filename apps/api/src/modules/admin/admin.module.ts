import { Module } from "@nestjs/common";
import { RazorpayService } from "../billing/razorpay.service.js";
import { AdminAuditController } from "./admin-audit.controller.js";
import { AdminAuditService } from "./admin-audit.service.js";
import { AdminController } from "./admin.controller.js";
import { AdminPlansController } from "./plans/admin-plans.controller.js";
import { AdminPlansService } from "./plans/admin-plans.service.js";
import { AdminUsersController } from "./users/admin-users.controller.js";
import { AdminUsersService } from "./users/admin-users.service.js";

@Module({
  controllers: [
    AdminController,
    AdminPlansController,
    AdminUsersController,
    AdminAuditController,
  ],
  providers: [
    AdminAuditService,
    AdminPlansService,
    AdminUsersService,
    RazorpayService,
  ],
})
export class AdminModule {}
