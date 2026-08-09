export const MODERATION_PROVIDER_LOCAL = "local";
export const MODERATION_PROVIDER_AWS_COMPREHEND = "aws-comprehend";
export const MODERATION_PROVIDER_AWS_REKOGNITION = "aws-rekognition";
export const MODERATION_PROVIDER_AWS_TRANSCRIBE = "aws-transcribe";

export const MODERATION_OPERATION_NOOP = "noop";
export const MODERATION_OPERATION_DETECT_TOXIC_CONTENT = "DetectToxicContent";
export const MODERATION_OPERATION_DETECT_MODERATION_LABELS =
  "DetectModerationLabels";
export const MODERATION_OPERATION_START_TRANSCRIPTION_JOB =
  "StartTranscriptionJob";
export const MODERATION_OPERATION_START_CONTENT_MODERATION =
  "StartContentModeration";

export const DEFAULT_MODERATION_QUEUE_CONCURRENCY = 3;
