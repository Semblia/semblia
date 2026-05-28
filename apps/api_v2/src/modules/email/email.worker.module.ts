import { Module } from "@nestjs/common";
import { EmailDeliveryProcessor } from "./email-delivery.processor.js";
import { EmailModule } from "./email.module.js";

@Module({
  imports: [EmailModule],
  providers: [EmailDeliveryProcessor],
})
export class EmailWorkerModule {}
