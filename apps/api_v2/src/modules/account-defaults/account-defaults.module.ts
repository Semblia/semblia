import { Module } from "@nestjs/common";
import { AccountDefaultsController } from "./account-defaults.controller.js";
import { AccountDefaultsService } from "./account-defaults.service.js";

@Module({
  controllers: [AccountDefaultsController],
  providers: [AccountDefaultsService],
  exports: [AccountDefaultsService],
})
export class AccountDefaultsModule {}
