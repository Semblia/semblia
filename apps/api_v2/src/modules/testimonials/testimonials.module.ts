import { Module } from "@nestjs/common";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { SubmissionModerationModule } from "../submission-moderation/submission-moderation.module.js";
import {
  PublicTestimonialsController,
  TestimonialsController,
} from "./testimonials.controller.js";
import { PublicSubmitThrottlerGuard } from "./public-submit-throttler.guard.js";
import { PublicSubmitTrustService } from "./public-submit-trust.service.js";
import { SubmissionPrivateMetadataService } from "./submission-private-metadata.service.js";
import { TestimonialsService } from "./testimonials.service.js";

@Module({
  imports: [
    AuthzModule,
    NotificationsModule,
    ProjectsModule,
    StorageModule,
    SubmissionModerationModule,
  ],
  controllers: [TestimonialsController, PublicTestimonialsController],
  providers: [
    TestimonialsService,
    PublicSubmitTrustService,
    PublicSubmitThrottlerGuard,
    SubmissionPrivateMetadataService,
    ProjectActionAuditService,
  ],
  exports: [
    PublicSubmitTrustService,
    PublicSubmitThrottlerGuard,
    SubmissionPrivateMetadataService,
  ],
})
export class TestimonialsModule {}
