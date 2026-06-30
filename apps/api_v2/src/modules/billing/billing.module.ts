import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller.js";
import { BillingService } from "./billing.service.js";
import { RazorpayService } from "./razorpay.service.js";

@Module({
  controllers: [BillingController],
  providers: [BillingService, RazorpayService],
  exports: [BillingService],
})
export class BillingModule {}
