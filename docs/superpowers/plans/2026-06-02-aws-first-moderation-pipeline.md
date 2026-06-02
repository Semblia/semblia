# AWS-First Submission Moderation Pipeline Implementation Plan

> **Status (2026-06-03): implemented and archival. Do not execute this plan as-is.** The moderation pipeline landed, then the testimonial projection cleanup removed the `Testimonial` table and the optional `testimonialId` relation from `SubmissionModerationRun`. Current canonical shape is `CollectionFormSubmission` plus `SubmissionPrivateMetadata`; route names may still say "testimonial", but persistence is submission-backed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a cost-aware moderation queue for text, image, audio, and video submission formats, with AWS as the primary provider while AWS credits are available.

**Architecture:** Keep public submission writes fast and cheap: inline duplicate/heuristic gates run first, submissions are persisted, and provider moderation runs asynchronously through BullMQ. AWS provider clients normalize Amazon Comprehend, Rekognition, and Transcribe output into one internal moderation decision model, while `SubmissionsService` remains the human review surface.

**Tech Stack:** NestJS, Prisma, BullMQ, Redis, AWS SDK for JavaScript v3, Amazon Comprehend `DetectToxicContent`, Amazon Rekognition `DetectModerationLabels` and video content moderation, Amazon Transcribe batch transcription and toxicity detection, existing S3-backed `MediaAsset`, Vitest.

---

## Locked Provider Strategy

- AWS is the primary provider family for the next 3-4 months because platform credits are available.
- Text: local quality heuristics first, then Amazon Comprehend `DetectToxicContent` for English text segments that need provider scoring.
- Images: Amazon Rekognition `DetectModerationLabels` for uploaded images, using S3 object references instead of base64 payloads whenever the asset is already in storage.
- Audio: Amazon Transcribe batch jobs create transcripts; toxicity detection is enabled for US English audio when available. The transcript then flows through the text moderation policy.
- Video: default to cost-capped keyframe sampling plus audio-track transcription. Use full Rekognition video moderation only for Pro/Business entitlements, explicit escalation, or cases where short-video duration makes full video analysis cheaper or operationally simpler.
- OpenAI moderation is not the backbone of the pipeline. It may remain a disabled-by-default fallback for text/image if AWS is unavailable or credits expire, but implementation should not require it.
- Azure/Google stay out of the first implementation unless the user reopens provider choice.

## Provider Facts Checked

- Amazon Rekognition `DetectModerationLabels` accepts JPEG/PNG images from bytes or S3, returns moderation labels, confidence, content types, and moderation model version.
- Rekognition content moderation detects explicit/suggestive adult content, violence, weapons, visually disturbing content, drugs, alcohol, tobacco, hate symbols, gambling, and rude gestures, and returns hierarchical labels with confidence scores.
- AWS guidance says full Rekognition video moderation is usually cheaper than image sampling at dense sampling rates, but sparse image sampling can be cheaper when we intentionally sample fewer frames.
- Amazon Transcribe bills by seconds processed, has a 60-minute monthly free tier for 12 months, and supports toxicity detection for batch US English audio.
- Amazon Comprehend toxicity detection is real-time text moderation, currently English-only for toxicity detection, accepts up to 10 text strings per call with each string capped at 1 KB, and bills by 100-character units with a 300-character minimum per request.

## File Structure

### Database and Shared Types

- Modify: `packages/database/prisma/schema.prisma`
  - Add `SUBMISSION_ATTACHMENT` to `MediaAssetPurpose`.
  - Add `SubmissionModerationRun`, `SubmissionModerationRunStatus`, `SubmissionModerationArtifactType`, and `SubmissionModerationDecision`.
  - Add indexes for worker lookup, queue idempotency, and review filtering.
- Create: `packages/database/prisma/migrations/<generated>_submission_moderation_runs/migration.sql`
  - Prisma generated migration for the new models and enum values.
- Modify: `packages/types/src/v2.ts`
  - Export moderation run DTOs and artifact/decision enums for admin or review UI.
- Modify: `packages/database/prisma/seed.ts`
  - Extend `Plan.limits` with a nested `moderation` object. Keep current top-level `testimonials`, `widgets`, and `projects` values unchanged.
- Modify: `packages/database/prisma/seed.spec.ts`
  - Assert the nested moderation limits are present while preserving the existing plan values.

### API Module

- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.constants.ts`
  - Queue name, provider names, default thresholds, and default concurrency.
- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.types.ts`
  - Internal provider-neutral artifact, provider result, normalized score, decision, and cost estimate types.
- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.policy.ts`
  - Pure decision policy. No database or AWS calls.
- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.service.ts`
  - Durable run creation, idempotent enqueue, status updates, and submission/testimonial status reconciliation.
- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.module.ts`
  - HTTP-process module: exports producer/service only.
- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.worker.module.ts`
  - Worker-only module: registers processor and AWS clients.
- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.processor.ts`
  - BullMQ processor that executes provider jobs, handles retries, and records failures.
- Create: `apps/api_v2/src/modules/submission-moderation/providers/aws-comprehend-moderation.client.ts`
  - Calls `DetectToxicContent` for text chunks.
- Create: `apps/api_v2/src/modules/submission-moderation/providers/aws-rekognition-moderation.client.ts`
  - Calls `DetectModerationLabels` for image artifacts and starts/polls video moderation when full-video analysis is selected.
- Create: `apps/api_v2/src/modules/submission-moderation/providers/aws-transcribe-moderation.client.ts`
  - Starts and polls batch transcription jobs, reads transcript/toxicity result locations, and emits transcript artifacts.
- Create: `apps/api_v2/src/modules/submission-moderation/providers/noop-moderation.client.ts`
  - Test/development provider used when AWS moderation is disabled.
- Modify: `apps/api_v2/src/modules/queueing/queueing.constants.ts`
  - Add `SUBMISSION_MODERATION_QUEUE`.
- Modify: `apps/api_v2/src/modules/queueing/queueing.module.ts`
  - Register the moderation queue as producer infrastructure.
- Modify: `apps/api_v2/src/modules/queueing/queue-telemetry.service.ts`
  - Include moderation queue counts in telemetry output.
- Modify: `apps/api_v2/src/modules/queueing/queue-maintenance.module.ts`
  - Register the moderation queue only where worker-side maintenance needs to inspect it.
- Modify: `apps/api_v2/src/worker.module.ts`
  - Import `SubmissionModerationWorkerModule`.
- Modify: `apps/api_v2/src/app.module.ts`
  - Import producer-side `SubmissionModerationModule`.
- Modify: `apps/api_v2/src/config/env.ts`
  - Add AWS moderation env validation with safe disabled defaults in local development.
- Modify: `apps/api_v2/src/modules/forms/forms.service.ts`
  - After canonical submission creation, enqueue moderation runs for text and attached media without blocking the public submit response.
- Modify: `apps/api_v2/src/modules/testimonials/testimonials.service.ts`
  - Reuse the same moderation enqueue path for direct testimonial public submit.
- Modify: `apps/api_v2/src/modules/submissions/submissions.service.ts`
  - Include latest moderation run summaries in submission DTOs and keep human moderation authoritative.
- Modify: `apps/api_v2/src/modules/worker-boundary.spec.ts`
  - Assert moderation processors stay out of HTTP modules.

### Tests

- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.policy.spec.ts`
- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.service.spec.ts`
- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.processor.spec.ts`
- Create: `apps/api_v2/src/modules/submission-moderation/providers/aws-comprehend-moderation.client.spec.ts`
- Create: `apps/api_v2/src/modules/submission-moderation/providers/aws-rekognition-moderation.client.spec.ts`
- Create: `apps/api_v2/src/modules/submission-moderation/providers/aws-transcribe-moderation.client.spec.ts`
- Modify: `apps/api_v2/src/modules/forms/forms.service.spec.ts`
- Modify: `apps/api_v2/src/modules/testimonials/testimonials.service.spec.ts`
- Modify: `apps/api_v2/src/modules/submissions/submissions.service.spec.ts`
- Modify: `apps/api_v2/src/modules/queueing/queue-telemetry.service.spec.ts`
- Modify: `apps/api_v2/src/modules/worker-boundary.spec.ts`

---

## Moderation Data Model

> Historical note: this section shows the original plan state before the 2026-06-03 projection removal. The implemented schema does not include `testimonialId`, `Testimonial.moderationRuns`, or any `Testimonial` relation. Use `packages/database/prisma/schema.prisma` as the source of truth.

Add these enums and model to `packages/database/prisma/schema.prisma`:

```prisma
enum SubmissionModerationRunStatus {
  PENDING
  ENQUEUED
  RUNNING
  SUCCEEDED
  FAILED
  SUPPRESSED
}

enum SubmissionModerationArtifactType {
  TEXT
  IMAGE
  AUDIO
  VIDEO
  VIDEO_FRAME
  TRANSCRIPT
}

enum SubmissionModerationDecision {
  APPROVE
  REVIEW
  REJECT
}

model SubmissionModerationRun {
  id                  String                           @id @default(cuid())
  projectId           String
  submissionId        String
  testimonialId       String?
  mediaAssetId        String?
  artifactType        SubmissionModerationArtifactType
  artifactHash        String                           @db.VarChar(64)
  provider            String                           @db.VarChar(64)
  providerOperation   String                           @db.VarChar(128)
  providerJobId       String?                          @db.VarChar(255)
  status              SubmissionModerationRunStatus    @default(PENDING)
  decision            SubmissionModerationDecision?
  score               Float?
  flags               Json?
  categories          Json?
  rawResult           Json?
  estimatedCostMicros Int?
  attempts            Int                              @default(0)
  lastAttemptAt       DateTime?
  nextAttemptAt       DateTime?
  completedAt         DateTime?
  errorCode           String?                          @db.VarChar(128)
  errorMessage        String?                          @db.Text
  createdAt           DateTime                         @default(now())
  updatedAt           DateTime                         @updatedAt

  project     Project                  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  submission  CollectionFormSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  testimonial Testimonial?             @relation(fields: [testimonialId], references: [id], onDelete: SetNull)
  mediaAsset  MediaAsset?              @relation(fields: [mediaAssetId], references: [id], onDelete: SetNull)

  @@unique([submissionId, artifactType, artifactHash, provider, providerOperation])
  @@index([projectId, status, createdAt])
  @@index([submissionId, createdAt])
  @@index([mediaAssetId])
  @@index([provider, providerJobId])
  @@index([nextAttemptAt, status])
}
```

Add relations:

```prisma
model Project {
  submissionModerationRuns SubmissionModerationRun[]
}

model CollectionFormSubmission {
  moderationRuns SubmissionModerationRun[]
}

model Testimonial {
  moderationRuns SubmissionModerationRun[]
}

model MediaAsset {
  moderationRuns SubmissionModerationRun[]
}
```

Add to `MediaAssetPurpose`:

```prisma
SUBMISSION_ATTACHMENT
```

---

## Decision Policy

Implement `submission-moderation.policy.ts` as a pure function:

```ts
export type ModerationInput = {
  artifactType:
    | "TEXT"
    | "IMAGE"
    | "AUDIO"
    | "VIDEO"
    | "VIDEO_FRAME"
    | "TRANSCRIPT";
  provider: "aws-comprehend" | "aws-rekognition" | "aws-transcribe" | "local";
  score: number;
  flags: string[];
  categories: Record<string, number>;
  existingStatus: "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";
  verifiedTrust: boolean;
  autoApproveVerified: boolean;
};

export type ModerationPolicyResult = {
  decision: "APPROVE" | "REVIEW" | "REJECT";
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";
  reason: string;
  score: number;
  flags: string[];
};

export function resolveModerationDecision(
  input: ModerationInput,
): ModerationPolicyResult {
  if (input.existingStatus === "REJECTED") {
    return {
      decision: "REJECT",
      moderationStatus: "REJECTED",
      reason: "Submission was already rejected by a reviewer.",
      score: input.score,
      flags: input.flags,
    };
  }

  const severeFlags = new Set([
    "explicit_nudity",
    "sexual_activity",
    "hate_symbol",
    "violence_or_threat",
    "graphic",
    "self_harm",
  ]);
  const hasSevereFlag = input.flags.some((flag) => severeFlags.has(flag));

  if (hasSevereFlag && input.score >= 0.92) {
    return {
      decision: "REVIEW",
      moderationStatus: "FLAGGED",
      reason: "Provider detected high-confidence severe content.",
      score: input.score,
      flags: input.flags,
    };
  }

  if (input.score >= 0.68 || input.flags.length > 0) {
    return {
      decision: "REVIEW",
      moderationStatus: "FLAGGED",
      reason: "Provider detected content that needs human review.",
      score: input.score,
      flags: input.flags,
    };
  }

  if (input.verifiedTrust && input.autoApproveVerified) {
    return {
      decision: "APPROVE",
      moderationStatus: "APPROVED",
      reason: "Verified submission passed moderation checks.",
      score: input.score,
      flags: input.flags,
    };
  }

  return {
    decision: "APPROVE",
    moderationStatus:
      input.existingStatus === "APPROVED" ? "APPROVED" : "PENDING",
    reason: "Submission passed provider moderation checks.",
    score: input.score,
    flags: input.flags,
  };
}
```

Policy rule: provider automation can raise risk automatically, but human reviewers remain authoritative for ambiguous cases. The first implementation should not auto-delete media or erase source content.

---

## Cost Controls

Use these controls before any AWS call:

- Deduplicate by `artifactHash` and provider operation.
- Skip provider calls when local heuristics already force `FLAGGED`, unless the project plan allows provider confirmation.
- Enforce monthly plan limits from `Plan.limits.moderation`.
- Enforce global safety budget env values:
  - `MODERATION_AWS_ENABLED=false` in local development.
  - `MODERATION_AWS_REGION=us-east-1` unless deployment uses another region.
  - `MODERATION_AWS_DAILY_BUDGET_CENTS=500`
  - `MODERATION_AWS_MONTHLY_BUDGET_CENTS=5000`
  - `MODERATION_IMAGE_MIN_CONFIDENCE=70`
  - `MODERATION_QUEUE_CONCURRENCY=3`
  - `MODERATION_FULL_VIDEO_ENABLED=false`
  - `MODERATION_FULL_VIDEO_MIN_PLAN=BUSINESS`
- If the budget gate fails, create a `SUPPRESSED` moderation run with `errorCode="BUDGET_SUPPRESSED"` and leave the submission in `PENDING` unless local heuristics already flagged it.
- Store only provider result JSON and safe category labels in `rawResult`; do not log raw user text/audio/transcripts outside existing submission storage.

Recommended first seed for `Plan.limits.moderation`:

```ts
const moderationLimits = {
  FREE: {
    imagesPerMonth: 10,
    audioSecondsPerMonth: 600,
    videoSecondsPerMonth: 120,
    maxMediaAssetsPerSubmission: 1,
    maxImageBytes: 4_000_000,
    maxAudioSeconds: 60,
    maxVideoSeconds: 30,
    fullVideoModeration: false,
  },
  PRO: {
    imagesPerMonth: 1_000,
    audioSecondsPerMonth: 14_400,
    videoSecondsPerMonth: 3_600,
    maxMediaAssetsPerSubmission: 5,
    maxImageBytes: 8_000_000,
    maxAudioSeconds: 600,
    maxVideoSeconds: 180,
    fullVideoModeration: false,
  },
  BUSINESS: {
    imagesPerMonth: 10_000,
    audioSecondsPerMonth: 72_000,
    videoSecondsPerMonth: 18_000,
    maxMediaAssetsPerSubmission: 10,
    maxImageBytes: 16_000_000,
    maxAudioSeconds: 1_800,
    maxVideoSeconds: 600,
    fullVideoModeration: true,
  },
} as const;
```

These are starting enforcement caps for cost control, not marketing copy.

---

## Tasks

### Task 1: Persist Moderation Runs

**Files:**

- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/<generated>_submission_moderation_runs/migration.sql`
- Modify: `packages/types/src/v2.ts`

- [x] **Step 1: Add the Prisma enums, model, and relations**

Use the schema shape from "Moderation Data Model" above. Keep existing `CollectionFormSubmission.moderationStatus`, `moderationReason`, `metadata`, `Testimonial.moderationScore`, and `Testimonial.moderationFlags`.

- [x] **Step 2: Generate and validate Prisma**

Run:

```bash
corepack.cmd pnpm --filter @workspace/database prisma migrate dev --name submission_moderation_runs
corepack.cmd pnpm --filter @workspace/database generate
corepack.cmd pnpm --filter @workspace/database exec prisma validate
corepack.cmd pnpm --filter @workspace/database build
```

Expected: migration created, generated client updated, Prisma validate passes.

- [x] **Step 3: Export shared DTO types**

Add DTO shapes in `packages/types/src/v2.ts`:

```ts
export type V2SubmissionModerationRunStatus =
  | "PENDING"
  | "ENQUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "SUPPRESSED";

export type V2SubmissionModerationArtifactType =
  | "TEXT"
  | "IMAGE"
  | "AUDIO"
  | "VIDEO"
  | "VIDEO_FRAME"
  | "TRANSCRIPT";

export type V2SubmissionModerationDecision = "APPROVE" | "REVIEW" | "REJECT";

export type V2SubmissionModerationRunDTO = {
  id: string;
  artifactType: V2SubmissionModerationArtifactType;
  provider: string;
  providerOperation: string;
  status: V2SubmissionModerationRunStatus;
  decision: V2SubmissionModerationDecision | null;
  score: number | null;
  flags: string[];
  categories: Record<string, number>;
  reason: string | null;
  createdAt: string;
  completedAt: string | null;
};
```

- [x] **Step 4: Verify package types**

Run:

```bash
corepack.cmd pnpm --filter @workspace/types build
```

Expected: build passes.

### Task 2: Lock Plan Moderation Limits

**Files:**

- Modify: `packages/database/prisma/seed.ts`
- Modify: `packages/database/prisma/seed.spec.ts`
- Modify: `apps/api_v2/src/modules/billing/billing.service.ts`
- Modify: `apps/api_v2/src/modules/billing/billing.service.spec.ts`

- [x] **Step 1: Extend plan seed limits**

Add the `moderationLimits` object from "Cost Controls" and merge each plan's nested `moderation` limits into the existing seed limits. Preserve current values:

```ts
FREE: { testimonials: 25, widgets: 1, projects: 1 }
PRO: { testimonials: 1000, widgets: 10, projects: 5 }
BUSINESS: { testimonials: 10000, widgets: 100, projects: 25 }
```

- [x] **Step 2: Update seed assertions**

Update `packages/database/prisma/seed.spec.ts` so each expected `limits` object includes the nested `moderation` object from this plan.

- [x] **Step 3: Make billing DTO tolerant of nested limits**

Keep `BillingService.toUsageLimits()` returning the current usage DTO. Do not expose the nested moderation limits in existing billing responses unless a DTO already supports arbitrary plan limits. Add a unit test that nested `limits.moderation` does not break current billing reads.

- [x] **Step 4: Verify database seed and billing tests**

Run:

```bash
corepack.cmd pnpm --filter @workspace/database test -- prisma/seed.spec.ts
corepack.cmd pnpm --filter api_v2 test -- src/modules/billing/billing.service.spec.ts
```

Expected: seed and billing tests pass.

### Task 3: Add Provider-Neutral Policy

**Files:**

- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.types.ts`
- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.policy.ts`
- Create: `apps/api_v2/src/modules/submission-moderation/submission-moderation.policy.spec.ts`

- [x] **Step 1: Write policy tests**

Cover these cases:

```ts
it("flags high-confidence severe content for review", () => {});
it("keeps human rejections rejected", () => {});
it("approves verified clean submissions when project policy allows it", () => {});
it("keeps clean unverified submissions pending", () => {});
it("flags medium-score provider results for human review", () => {});
```

- [x] **Step 2: Implement the pure policy**

Use the `resolveModerationDecision()` implementation from "Decision Policy". Add provider flag normalization helpers for AWS:

```ts
export function normalizeAwsModerationLabel(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
```

- [x] **Step 3: Run policy tests**

Run:

```bash
corepack.cmd pnpm --filter api_v2 test -- src/modules/submission-moderation/submission-moderation.policy.spec.ts
```

Expected: policy tests pass.

### Task 4: Add AWS Provider Clients

**Files:**

- Modify: `apps/api_v2/src/config/env.ts`
- Create: `apps/api_v2/src/modules/submission-moderation/providers/aws-comprehend-moderation.client.ts`
- Create: `apps/api_v2/src/modules/submission-moderation/providers/aws-rekognition-moderation.client.ts`
- Create: `apps/api_v2/src/modules/submission-moderation/providers/aws-transcribe-moderation.client.ts`
- Create: provider specs listed above.

- [x] **Step 1: Add env validation**

Add these env fields with disabled-safe defaults:

```ts
MODERATION_AWS_ENABLED: z.coerce.boolean().default(false),
MODERATION_AWS_REGION: z.string().default("us-east-1"),
MODERATION_AWS_DAILY_BUDGET_CENTS: z.coerce.number().int().nonnegative().default(500),
MODERATION_AWS_MONTHLY_BUDGET_CENTS: z.coerce.number().int().nonnegative().default(5000),
MODERATION_IMAGE_MIN_CONFIDENCE: z.coerce.number().min(0).max(100).default(70),
MODERATION_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(3),
MODERATION_FULL_VIDEO_ENABLED: z.coerce.boolean().default(false),
MODERATION_FULL_VIDEO_MIN_PLAN: z.enum(["FREE", "PRO", "BUSINESS"]).default("BUSINESS"),
```

- [x] **Step 2: Implement Comprehend client**

Client behavior:

- Split text into 1 KB chunks.
- Send up to 10 chunks per `DetectToxicContent` call.
- Normalize category labels.
- Use the maximum returned `Toxicity` as the run score.

- [x] **Step 3: Implement Rekognition client**

Client behavior:

- For images, call `DetectModerationLabels` with S3 object and configured `MinConfidence`.
- Normalize `ModerationLabels[].Name` and map confidence `0..100` to score `0..1`.
- Preserve `ModerationModelVersion` in `rawResult`.
- For video, expose `startVideoModeration()` and `getVideoModerationResult()` methods. The worker decides whether to use them.

- [x] **Step 4: Implement Transcribe client**

Client behavior:

- Start batch transcription for S3 audio/video objects.
- Enable toxicity detection only for `en-US`.
- Emit transcript text and toxicity categories as provider artifacts.
- Never store transcript logs outside the moderation run and existing submission metadata.

- [x] **Step 5: Mock AWS SDK calls in unit tests**

Tests assert request construction and normalization without live AWS calls.

- [x] **Step 6: Run provider tests**

Run:

```bash
corepack.cmd pnpm --filter api_v2 test -- src/modules/submission-moderation/providers
```

Expected: provider client tests pass without network access.

### Task 5: Add Moderation Queue and Worker

**Files:**

- Create: module/service/processor files listed in "API Module"
- Modify: `apps/api_v2/src/modules/queueing/queueing.constants.ts`
- Modify: `apps/api_v2/src/modules/queueing/queueing.module.ts`
- Modify: `apps/api_v2/src/modules/queueing/queue-telemetry.service.ts`
- Modify: `apps/api_v2/src/modules/queueing/queue-maintenance.module.ts`
- Modify: `apps/api_v2/src/worker.module.ts`
- Modify: `apps/api_v2/src/app.module.ts`
- Modify: `apps/api_v2/src/modules/worker-boundary.spec.ts`

- [x] **Step 1: Add queue constant**

```ts
export const SUBMISSION_MODERATION_QUEUE = "submission-moderation";
```

- [x] **Step 2: Register queue producer**

Register `SUBMISSION_MODERATION_QUEUE` in the shared `QueueingModule`, following the existing outbound/export/native/email queue pattern.

- [x] **Step 3: Implement `SubmissionModerationService.enqueueSubmission()`**

Required behavior:

- Create one text run for extracted submission text when `project.autoModeration` is true.
- Create one media run per active `MediaAsset` attached to the submission.
- Use deterministic BullMQ job IDs: `submission-moderation:${run.id}`.
- Do not enqueue if a matching unique moderation run already exists.
- Create `SUPPRESSED` runs when plan or budget limits block provider work.

- [x] **Step 4: Implement processor**

Required behavior:

- Mark run `RUNNING`.
- Execute the correct AWS client based on `artifactType` and `providerOperation`.
- Normalize result through `resolveModerationDecision()`.
- Update `SubmissionModerationRun`, `CollectionFormSubmission`, and linked `Testimonial`.
- On retryable AWS throttling/throughput errors, throw so BullMQ retry/backoff handles the job.
- On permanent unsupported-format errors, mark run `FAILED` and keep submission `PENDING` unless prior local heuristics flagged it.

- [x] **Step 5: Add telemetry**

Expose moderation queue counts beside outbound/export/native/email queues in `QueueTelemetryService`.

- [x] **Step 6: Keep processor worker-only**

Update `worker-boundary.spec.ts` so `SubmissionModerationProcessor` is allowed only in `SubmissionModerationWorkerModule`.

- [x] **Step 7: Run queue and boundary tests**

Run:

```bash
corepack.cmd pnpm --filter api_v2 test -- src/modules/submission-moderation src/modules/queueing src/modules/worker-boundary.spec.ts
```

Expected: moderation module, queueing, and worker boundary tests pass.

### Task 6: Enqueue From Public Submission Paths

**Files:**

- Modify: `apps/api_v2/src/modules/forms/forms.service.ts`
- Modify: `apps/api_v2/src/modules/forms/forms.service.spec.ts`
- Modify: `apps/api_v2/src/modules/testimonials/testimonials.service.ts`
- Modify: `apps/api_v2/src/modules/testimonials/testimonials.service.spec.ts`

- [x] **Step 1: Inject `SubmissionModerationService`**

Inject the producer service into forms and testimonials modules. Avoid importing worker module into HTTP modules.

- [x] **Step 2: Enqueue after canonical submission persistence**

In `FormsService.submitTrustedForm()`, enqueue after `CollectionFormSubmission` and projected `Testimonial` have been created and after the existing inline quality gate has produced the initial status.

- [x] **Step 3: Preserve public submit latency**

Do not await provider work. Await only durable run creation and BullMQ enqueue.

- [x] **Step 4: Cover form submission behavior**

Tests:

- clean submission creates a text moderation run and returns the same public response shape.
- locally flagged spam still returns `FLAGGED` and either suppresses provider work or enqueues only when project settings require provider confirmation.
- idempotent replay does not create duplicate moderation runs.

- [x] **Step 5: Cover testimonial submission behavior**

Tests mirror the form cases for direct testimonial public submit.

- [x] **Step 6: Run focused submission tests**

Run:

```bash
corepack.cmd pnpm --filter api_v2 test -- src/modules/forms/forms.service.spec.ts src/modules/testimonials/testimonials.service.spec.ts
```

Expected: focused submission tests pass.

### Task 7: Support Media Attachments in Submissions

**Files:**

- Modify: `packages/database/prisma/schema.prisma`
- Modify: `apps/api_v2/src/modules/storage/media.service.ts`
- Modify: `apps/api_v2/src/modules/forms/forms.service.ts`
- Modify: `apps/api_v2/src/modules/forms/forms.service.spec.ts`
- Modify: `packages/types/src/v2.ts`

- [x] **Step 1: Use `MediaAssetPurpose.SUBMISSION_ATTACHMENT`**

Allow hosted/public form submission payloads to reference already-uploaded `MediaAsset` IDs with this purpose. Keep direct binary upload outside the public submit endpoint.

- [x] **Step 2: Validate ownership and state**

Use `MediaService` to assert:

- asset belongs to the same project or form.
- asset status is `ACTIVE`.
- asset visibility matches the submission use case.
- content type is one of configured image/audio/video allowlists.

- [x] **Step 3: Attach assets to `CollectionFormSubmission`**

Set `MediaAsset.submissionId` for accepted attachments inside the same trusted submit transaction or immediately after the submission row exists.

- [x] **Step 4: Enforce plan limits before attachment**

Read `Plan.limits.moderation` for the submitting user/project owner and reject media attachments above plan caps with `400 Bad Request`.

- [x] **Step 5: Run storage and forms tests**

Run:

```bash
corepack.cmd pnpm --filter api_v2 test -- src/modules/storage src/modules/forms/forms.service.spec.ts
```

Expected: media validation and form submission tests pass.

### Task 8: Expose Moderation Runs in Review Queue

**Files:**

- Modify: `apps/api_v2/src/modules/submissions/submissions.service.ts`
- Modify: `apps/api_v2/src/modules/submissions/submissions.dto.ts`
- Modify: `apps/api_v2/src/modules/submissions/submissions.service.spec.ts`
- Modify: `packages/types/src/v2.ts`

- [x] **Step 1: Include latest runs in submission DTO**

For `GET /v2/projects/:slug/submissions` and detail reads, include latest run summaries ordered by `createdAt desc`, capped at 10 per submission.

- [x] **Step 2: Keep raw provider output private**

Do not expose `rawResult`, transcript text, S3 keys, IP, user agent, or private metadata through review DTOs.

- [x] **Step 3: Make human moderation final**

When `SubmissionsService.moderate()` is called by a reviewer, preserve existing behavior: update canonical submission and linked testimonial, record audit, and notify. Provider runs after a human decision may add annotations but must not override `REJECTED` or reviewer-set `APPROVED`.

- [x] **Step 4: Run submissions tests**

Run:

```bash
corepack.cmd pnpm --filter api_v2 test -- src/modules/submissions/submissions.service.spec.ts
```

Expected: submissions review DTO and moderation tests pass.

### Task 9: Cost and Failure Observability

**Files:**

- Modify: `apps/api_v2/src/modules/queueing/queue-telemetry.service.ts`
- Modify: `apps/api_v2/src/modules/ops-admin/ops-admin.service.ts`
- Modify: `apps/api_v2/src/modules/ops-admin/ops-admin.spec.ts`
- Modify: `docs/continuity/open-questions.md`

- [x] **Step 1: Add moderation queue telemetry**

Telemetry should include queue counts and moderation run counts by status for the last 24 hours.

- [x] **Step 2: Add dead-letter retry target**

If ops-admin dead-letter retry supports typed targets, add `submission-moderation` as a retry target with deterministic job recreation.

- [x] **Step 3: Add budget-suppression visibility**

Expose `SUPPRESSED` count and the most recent `BUDGET_SUPPRESSED` timestamp in the ops snapshot.

- [x] **Step 4: Run ops tests**

Run:

```bash
corepack.cmd pnpm --filter api_v2 test -- src/modules/ops-admin/ops-admin.spec.ts src/modules/queueing/queue-telemetry.service.spec.ts
```

Expected: ops and queue telemetry tests pass.

### Task 10: Verification and Index Refresh

**Files:**

- Generated indexes only.

- [x] **Step 1: Run database verification**

```bash
corepack.cmd pnpm --filter @workspace/database generate
corepack.cmd pnpm --filter @workspace/database exec prisma validate
corepack.cmd pnpm --filter @workspace/database build
```

- [x] **Step 2: Run API verification**

```bash
corepack.cmd pnpm --filter api_v2 typecheck
corepack.cmd pnpm --filter api_v2 lint
corepack.cmd pnpm --filter api_v2 test
corepack.cmd pnpm build --filter api_v2
```

- [x] **Step 3: Run worker smoke if queue wiring changed**

```bash
pnpm.cmd --filter api_v2 smoke:worker
```

- [x] **Step 4: Refresh retrieval indexes**

```bash
python scripts/update-indexes.py
python scripts/rebuild-graphify.py
```

- [x] **Step 5: Commit**

Commit as one backend checkpoint after verification:

```bash
git add apps/api_v2 packages/database packages/types docs/continuity docs/superpowers/plans
git commit -m "feat(moderation): add AWS-first submission moderation pipeline"
```

---

## Self-Review

- Spec coverage: AWS-first provider strategy, text/image/audio/video handling, free/pro cost controls, queue-based execution, human review, and existing forms/testimonial seams are covered.
- Placeholder scan: no placeholder strings are intentionally left for implementation. The generated migration folder name is determined by Prisma when Task 1 runs.
- Type consistency: policy result types, DTO names, queue name, and Prisma enum names are consistent across tasks.
- Scope control: plan is backend/database only. No `apps/web_v2` implementation is required for the first pass.
