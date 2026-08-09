import { Module } from "@nestjs/common";
import { ExportDeliveryProcessor } from "./export-delivery.processor.js";
import { ExportsModule } from "./exports.module.js";

@Module({
  imports: [ExportsModule],
  providers: [ExportDeliveryProcessor],
})
export class ExportsWorkerModule {}
