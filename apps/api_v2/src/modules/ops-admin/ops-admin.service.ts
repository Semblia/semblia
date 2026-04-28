import { Injectable, NotImplementedException } from "@nestjs/common";

@Injectable()
export class OpsAdminService {
  getStatus() {
    throw new NotImplementedException("ops-admin.getStatus not implemented");
  }
}
