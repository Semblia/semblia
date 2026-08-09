import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { PrismaModule } from "../prisma/prisma.module.js";
import { EMAIL_DELIVERY_QUEUE } from "../queueing/queueing.constants.js";
import { EmailDeliveryService } from "./email-delivery.service.js";
import {
  RESEND_CLIENT,
  ResendMailerService,
  type ResendClient,
} from "./resend-mailer.service.js";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: EMAIL_DELIVERY_QUEUE }),
  ],
  providers: [
    EmailDeliveryService,
    ResendMailerService,
    {
      provide: RESEND_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ResendClient | null => {
        const apiKey = configService.get<string>("RESEND_API_KEY")?.trim();
        return apiKey ? (new Resend(apiKey) as unknown as ResendClient) : null;
      },
    },
  ],
  exports: [EmailDeliveryService],
})
export class EmailModule {}
