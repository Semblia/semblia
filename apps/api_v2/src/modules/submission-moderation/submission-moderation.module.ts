import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module.js";
import { SUBMISSION_MODERATION_QUEUE } from "../queueing/queueing.constants.js";
import { AwsComprehendModerationClient } from "./providers/aws-comprehend-moderation.client.js";
import { AwsRekognitionModerationClient } from "./providers/aws-rekognition-moderation.client.js";
import { AwsTranscribeModerationClient } from "./providers/aws-transcribe-moderation.client.js";
import { NoopModerationClient } from "./providers/noop-moderation.client.js";
import { SubmissionModerationService } from "./submission-moderation.service.js";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: SUBMISSION_MODERATION_QUEUE }),
  ],
  providers: [
    SubmissionModerationService,
    NoopModerationClient,
    {
      provide: AwsComprehendModerationClient,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new AwsComprehendModerationClient(configService),
    },
    {
      provide: AwsRekognitionModerationClient,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new AwsRekognitionModerationClient(configService),
    },
    {
      provide: AwsTranscribeModerationClient,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new AwsTranscribeModerationClient(configService),
    },
  ],
  exports: [
    SubmissionModerationService,
    NoopModerationClient,
    AwsComprehendModerationClient,
    AwsRekognitionModerationClient,
    AwsTranscribeModerationClient,
  ],
})
export class SubmissionModerationModule {}
