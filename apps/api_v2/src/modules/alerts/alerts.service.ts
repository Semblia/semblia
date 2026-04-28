import { Injectable, NotImplementedException } from "@nestjs/common";

@Injectable()
export class AlertsService {
  getStatus() {
    throw new NotImplementedException("alerts.getStatus not implemented");
  }
}
