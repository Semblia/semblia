import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ProjectAccessService } from "../../common/authz/project-access.service.js";
import { MEDIA_OPTIMIZE_QUEUE } from "../queueing/queueing.constants.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { MediaController } from "./media.controller.js";
import { MediaOptimizeService } from "./media-optimize.service.js";
import { MediaService } from "./media.service.js";
import { S3Service } from "./s3.service.js";
import { StorageService } from "./storage.service.js";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: MEDIA_OPTIMIZE_QUEUE }),
  ],
  controllers: [MediaController],
  providers: [
    S3Service,
    StorageService,
    MediaService,
    MediaOptimizeService,
    ProjectAccessService,
  ],
  exports: [MediaService, MediaOptimizeService, S3Service, StorageService],
})
export class StorageModule {}
