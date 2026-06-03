import { Module } from "@nestjs/common";
import { ProjectAccessService } from "../../common/authz/project-access.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { PublicSubmitTrustService } from "../responses/public-submit-trust.service.js";
import { SigningSecretService } from "../projects/signing-secret.service.js";
import { MediaController } from "./media.controller.js";
import { MediaPublicController } from "./media.public.controller.js";
import { MediaService } from "./media.service.js";
import { S3Service } from "./s3.service.js";
import { StorageService } from "./storage.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [MediaController, MediaPublicController],
  providers: [
    S3Service,
    StorageService,
    MediaService,
    ProjectAccessService,
    PublicSubmitTrustService,
    SigningSecretService,
  ],
  exports: [MediaService, S3Service, StorageService],
})
export class StorageModule {}
