import { Module } from "@nestjs/common";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import {
  AnalyticsController,
  PublicAnalyticsEventsController,
} from "./analytics.controller.js";
import { AnalyticsService } from "./analytics.service.js";

@Module({
  imports: [AuthzModule, PrismaModule],
  controllers: [AnalyticsController, PublicAnalyticsEventsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
