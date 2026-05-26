import { Module } from "@nestjs/common";
import { RazorpayService } from "../billing/razorpay.service.js";
import { AdminAuditService } from "./admin-audit.service.js";
import { AdminController } from "./admin.controller.js";
import { AdminPlansController } from "./plans/admin-plans.controller.js";
import { AdminPlansService } from "./plans/admin-plans.service.js";

@Module({
  controllers: [AdminController, AdminPlansController],
  providers: [AdminAuditService, AdminPlansService, RazorpayService],
})
export class AdminModule {}
