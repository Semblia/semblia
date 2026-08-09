import { Module } from "@nestjs/common";
import { IntegrationDeliveryProcessor } from "./integration-delivery.processor.js";
import { IntegrationsModule } from "./integrations.module.js";

@Module({
  imports: [IntegrationsModule],
  providers: [IntegrationDeliveryProcessor],
})
export class IntegrationsWorkerModule {}
