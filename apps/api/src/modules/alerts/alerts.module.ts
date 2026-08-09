import { Module } from "@nestjs/common";
import { AlertsController } from "./alerts.controller.js";
import { ALERTS_SLACK_FETCH, AlertsService } from "./alerts.service.js";

@Module({
  controllers: [AlertsController],
  providers: [
    AlertsService,
    {
      provide: ALERTS_SLACK_FETCH,
      useValue: fetch,
    },
  ],
  exports: [AlertsService],
})
export class AlertsModule {}
