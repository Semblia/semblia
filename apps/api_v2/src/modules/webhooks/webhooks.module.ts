import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module.js";
import { UsersModule } from "../users/users.module.js";
import { WebhooksController } from "./webhooks.controller.js";
import { WebhooksService } from "./webhooks.service.js";

@Module({
  imports: [UsersModule, EmailModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
