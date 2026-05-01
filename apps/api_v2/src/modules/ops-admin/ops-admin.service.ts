import { Injectable } from "@nestjs/common";

@Injectable()
export class OpsAdminService {
  getStatus() {
    return {
      status: "ready",
      surface: "internal-only",
    } as const;
  }
}
