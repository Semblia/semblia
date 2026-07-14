import { Module } from "@nestjs/common";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { RedisModule } from "../redis/redis.module.js";
import { StudioDraftsModule } from "../studio-drafts/studio-drafts.module.js";
import { StorageModule } from "../storage/storage.module.js";
import {
  PublicWallsController,
  PublicWidgetEmbedsController,
  WidgetsController,
} from "./widgets.controller.js";
import { WidgetsService } from "./widgets.service.js";
import { PrimaryWallService } from "./primary-wall.service.js";

@Module({
  imports: [AuthzModule, RedisModule, StudioDraftsModule, StorageModule],
  controllers: [
    WidgetsController,
    PublicWidgetEmbedsController,
    PublicWallsController,
  ],
  providers: [WidgetsService, PrimaryWallService],
})
export class WidgetsModule {}
