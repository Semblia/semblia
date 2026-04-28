import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module.js";
import { WebhooksController } from "./webhooks.controller.js";
import { WebhooksService } from "./webhooks.service.js";

@Module({
  imports: [UsersModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
