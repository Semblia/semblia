import { Module } from "@nestjs/common";
import { SubmissionModerationModule } from "./submission-moderation.module.js";
import { SubmissionModerationProcessor } from "./submission-moderation.processor.js";

@Module({
  imports: [SubmissionModerationModule],
  providers: [SubmissionModerationProcessor],
})
export class SubmissionModerationWorkerModule {}
