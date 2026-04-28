import { Controller, Get, Inject } from "@nestjs/common";
import { AlertsService } from "./alerts.service.js";

@Controller("alerts")
export class AlertsController {
  constructor(@Inject(AlertsService) private readonly alertsService: AlertsService) {}

  // Placeholder until web_v2 or admin surfaces define a concrete alert contract.
  @Get("_status")
  getStatus() {
    return this.alertsService.getStatus();
  }
}
