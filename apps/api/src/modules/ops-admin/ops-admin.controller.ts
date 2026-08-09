import { Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { OpsAdminService } from "./ops-admin.service.js";

@Controller("ops-admin")
export class OpsAdminController {
  constructor(
    @Inject(OpsAdminService)
    private readonly opsAdminService: OpsAdminService,
  ) {}

  // Placeholder until dossier section 5 is promoted into a concrete v2 admin contract.
  @Get("_status")
  getStatus() {
    return this.opsAdminService.getStatus();
  }

  @Get("queues")
  getQueues() {
    return this.opsAdminService.getQueueSnapshot();
  }

  @Post("dead-letter/:id/retry")
  retryDeadLetter(@Param("id") id: string) {
    return this.opsAdminService.retryDeadLetter(id);
  }
}
