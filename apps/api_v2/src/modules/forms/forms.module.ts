import { Module } from "@nestjs/common";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { RedisModule } from "../redis/redis.module.js";
import { StudioDraftsModule } from "../studio-drafts/studio-drafts.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { SubmissionModerationModule } from "../submission-moderation/submission-moderation.module.js";
import { ResponsesModule } from "../responses/responses.module.js";
import {
  FormsController,
  PublicFormsController,
  RuntimeFormsController,
} from "./forms.controller.js";
import { FormsRuntimeSignatureService } from "./forms-runtime-signature.service.js";
import { FormsRuntimeThrottlerGuard } from "./forms-runtime-throttler.guard.js";
import { FormsService } from "./forms.service.js";

@Module({
  imports: [
    AuthzModule,
    NotificationsModule,
    ProjectsModule,
    ResponsesModule,
    RedisModule,
    StudioDraftsModule,
    StorageModule,
    SubmissionModerationModule,
  ],
  controllers: [FormsController, PublicFormsController, RuntimeFormsController],
  providers: [
    FormsService,
    FormsRuntimeSignatureService,
    FormsRuntimeThrottlerGuard,
  ],
})
export class FormsModule {}
