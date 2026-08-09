import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
