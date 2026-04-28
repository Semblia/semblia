import { Module } from "@nestjs/common";
import { OpsAdminController } from "./ops-admin.controller.js";
import { OpsAdminService } from "./ops-admin.service.js";

@Module({
  controllers: [OpsAdminController],
  providers: [OpsAdminService],
})
export class OpsAdminModule {}
