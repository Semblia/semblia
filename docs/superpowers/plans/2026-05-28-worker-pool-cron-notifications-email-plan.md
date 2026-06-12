# Worker Pool, Cron, Notifications, and Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-ready background worker lane for Semblia v2 that runs BullMQ processors, cron-style reconciliation, in-app notification fanout, and Resend-backed transactional email.

**Architecture:** Keep `apps/api_v2` as the HTTP/API producer and add a separate Nest application-context worker entrypoint for processors and scheduled maintenance. BullMQ + Redis remains the queue substrate because it is already in the repo and backs outbound webhook, CSV export, and native integration jobs. Email delivery is database-first: app code writes durable `EmailDelivery` rows, a scheduler enqueues pending rows, and workers send through Resend with provider idempotency keys.

**Tech Stack:** NestJS 11, `@nestjs/bullmq`, BullMQ 5, Redis, `@nestjs/schedule`, Prisma/Postgres, Resend Node SDK, existing `NotificationsService`, existing `AlertsService`, existing `OpsAdminModule`.

---

## Confirmed Stack Decisions

- **Email provider:** Resend, per user recommendation. Context7 docs confirm the Node SDK supports `new Resend(apiKey)`, `emails.send`, `batch.send`, tags, and per-request idempotency keys.
- **Queue substrate:** BullMQ + Redis. `apps/api_v2` already uses `@nestjs/bullmq`, `bullmq`, `ioredis`, and a Redis service; `docker-compose.yaml` already runs Redis.
- **Cron substrate:** `@nestjs/schedule` for local cron declarations, guarded by Redis locks and deterministic BullMQ `jobId`s so multi-worker deployments do not duplicate work.
- **Worker topology:** One HTTP API process can enqueue jobs; one or more worker processes consume jobs and run cron maintenance. Local dev can run API and worker separately.
- **Delivery record:** Add a dedicated `EmailDelivery` table instead of stretching the existing `NotificationOutbox`. The current `NotificationOutbox.notificationId` is required, which does not fit emails to non-users, especially project member invites.

## Phase Checkpoints

Each phase is committed only after the listed tests pass. Subagents may explore or draft bounded changes, but the orchestrator owns review, verification, docs, and commits.

| Phase | Scope | Tasks | Required tests before commit | Commit message |
| --- | --- | --- | --- | --- |
| 0 | Plan decomposition only | This phase map | `git diff --check` | `docs(workers): phase queue and email implementation` |
| 1 | Worker process split | Task 1 | `corepack.cmd pnpm --filter api_v2 test -- --run modules/outbound-webhooks modules/exports modules/integrations`; `corepack.cmd pnpm --filter api_v2 typecheck`; `corepack.cmd pnpm build --filter api_v2` | `feat(workers): split api producers from queue consumers` |
| 2 | Queueing primitives | Task 2 | `corepack.cmd pnpm --filter api_v2 test -- --run modules/queueing`; `corepack.cmd pnpm --filter api_v2 typecheck`; `corepack.cmd pnpm build --filter api_v2` | `feat(workers): add queue locks and telemetry` |
| 3 | Email delivery foundation | Task 3 | `corepack.cmd pnpm --filter @workspace/database generate`; `corepack.cmd pnpm --filter @workspace/database exec prisma validate`; `corepack.cmd pnpm --filter api_v2 test -- --run modules/email`; `corepack.cmd pnpm --filter api_v2 typecheck`; `corepack.cmd pnpm build --filter api_v2` | `feat(email): add durable resend delivery queue` |
| 4 | Notification and invite fanout | Tasks 4-5 | `corepack.cmd pnpm --filter api_v2 test -- --run modules/notifications modules/projects modules/email`; `corepack.cmd pnpm --filter api_v2 typecheck`; `corepack.cmd pnpm build --filter api_v2` | `feat(email): queue notification and invite emails` |
| 5 | Cron, ops visibility, closeout | Tasks 6-8 | `corepack.cmd pnpm --filter api_v2 test -- --run modules/queueing modules/email modules/ops-admin modules/alerts`; `corepack.cmd pnpm --filter api_v2 test`; `corepack.cmd pnpm --filter api_v2 lint`; `corepack.cmd pnpm build --filter api_v2`; `python scripts/update-indexes.py`; `python scripts/rebuild-graphify.py` | `feat(workers): add queue maintenance and ops visibility` |

## Current Repo Facts This Plan Uses

- `apps/api_v2/src/app.module.ts` already imports `ScheduleModule.forRoot()` and configures `BullModule.forRootAsync()` with `REDIS_URL`.
- Existing queue-backed processors:
  - `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.processor.ts`
  - `apps/api_v2/src/modules/exports/export-delivery.processor.ts`
  - `apps/api_v2/src/modules/integrations/integration-delivery.processor.ts`
- Existing retry patterns use deterministic `jobId`, `attempts: 3`, and exponential backoff in:
  - `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.service.ts`
  - `apps/api_v2/src/modules/exports/exports.service.ts`
  - `apps/api_v2/src/modules/integrations/integrations.service.ts`
- `apps/api_v2/src/modules/notifications/notifications.service.ts` creates in-app notifications and already respects per-type in-app preferences.
- `apps/api_v2/src/modules/projects/projects.service.ts` line 633 has the explicit missing seam: queue an email invite when transactional email sending is in scope.
- `packages/database/prisma/schema.prisma` already has `EmailUsage`, `NotificationOutbox`, and `DeadLetterJob`, but `api_v2` does not currently use them.

## File Map

Create:

- `apps/api_v2/src/worker.ts` - worker process bootstrap using `NestFactory.createApplicationContext`.
- `apps/api_v2/src/worker.module.ts` - worker-only module importing queue processors and cron services.
- `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.worker.module.ts` - registers `OutboundWebhooksProcessor` outside the HTTP module.
- `apps/api_v2/src/modules/exports/exports.worker.module.ts` - registers `ExportDeliveryProcessor` outside the HTTP module.
- `apps/api_v2/src/modules/integrations/integrations.worker.module.ts` - registers `IntegrationDeliveryProcessor` outside the HTTP module.
- `apps/api_v2/src/modules/email/email.module.ts` - email domain module for API-side delivery row creation and queue registration.
- `apps/api_v2/src/modules/email/email.worker.module.ts` - worker-only module registering `EmailDeliveryProcessor`.
- `apps/api_v2/src/modules/email/email-delivery.service.ts` - creates, enqueues, and updates `EmailDelivery` rows.
- `apps/api_v2/src/modules/email/email-delivery.processor.ts` - BullMQ processor that sends one delivery by id.
- `apps/api_v2/src/modules/email/resend-mailer.service.ts` - Resend SDK adapter.
- `apps/api_v2/src/modules/email/email-templates.ts` - pure template renderers for notification and project-invite emails.
- `apps/api_v2/src/modules/email/email.types.ts` - internal template payload and result types.
- `apps/api_v2/src/modules/email/email-delivery.service.spec.ts`
- `apps/api_v2/src/modules/email/resend-mailer.service.spec.ts`
- `apps/api_v2/src/modules/email/email-delivery.processor.spec.ts`
- `apps/api_v2/src/modules/queueing/queueing.module.ts` - shared queue operations module.
- `apps/api_v2/src/modules/queueing/queueing.constants.ts` - queue names, retry options, lock keys, and scheduler names.
- `apps/api_v2/src/modules/queueing/queue-lock.service.ts` - Redis `SET NX PX` lock helper with token-safe release.
- `apps/api_v2/src/modules/queueing/queue-maintenance.service.ts` - cron handlers for outbox drain, retry reconciliation, quota snapshots, and alerts.
- `apps/api_v2/src/modules/queueing/queue-telemetry.service.ts` - queue counts and DB delivery status snapshots.
- `apps/api_v2/src/modules/queueing/queue-lock.service.spec.ts`
- `apps/api_v2/src/modules/queueing/queue-maintenance.service.spec.ts`
- `apps/api_v2/scripts/smoke-worker.mjs` - built-worker bootstrap smoke test.
- `packages/database/prisma/migrations/20260528110000_email_delivery_queue/migration.sql`

Modify:

- `apps/api_v2/package.json` - add worker scripts and Resend dependency.
- `apps/api_v2/src/app.module.ts` - import `EmailModule` and `QueueingModule`; keep API producer modules, not worker processors.
- `apps/api_v2/src/config/env.ts` - add and validate Resend/email/worker env vars.
- `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.module.ts` - remove processor from HTTP providers; keep service/controller.
- `apps/api_v2/src/modules/exports/exports.module.ts` - remove processor from HTTP providers and export `ExportsService`.
- `apps/api_v2/src/modules/integrations/integrations.module.ts` - remove processor from HTTP providers and export `IntegrationsService`.
- `apps/api_v2/src/modules/notifications/notifications.module.ts` - import `EmailModule`.
- `apps/api_v2/src/modules/notifications/notifications.service.ts` - create pending email delivery rows when email preferences allow.
- `apps/api_v2/src/modules/notifications/notifications.spec.ts` - cover email preference fanout.
- `apps/api_v2/src/modules/projects/projects.module.ts` - import `EmailModule`.
- `apps/api_v2/src/modules/projects/projects.service.ts` - replace the current invite-email comment with durable email delivery creation.
- `apps/api_v2/src/modules/projects/projects.service.spec.ts` - cover project invite email delivery.
- `apps/api_v2/src/modules/ops-admin/ops-admin.service.ts` - expose queue/delivery health snapshots.
- `apps/api_v2/src/modules/ops-admin/ops-admin.controller.ts` - add guarded internal queue health and dead-letter retry endpoints.
- `apps/api_v2/src/modules/alerts/alerts.module.ts` - export `AlertsService`.
- `packages/database/prisma/schema.prisma` - add email delivery enums/model and relations or indexed foreign ids.
- `docs/continuity/progress.md` - record the phase once implemented and verified.
- `docs/continuity/decisions.md` - lock Resend + BullMQ + worker topology after implementation.

Optional web follow-up if email invite links are made clickable in v1:

- `apps/web_v2/app/(app)/invitations/[inviteId]/page.tsx`
- `apps/web_v2/app/(app)/invitations/[inviteId]/invitation-client.tsx`
- `apps/web_v2/tests/project-invitations.test.tsx`

## Implementation Tasks

### Task 1: Split HTTP Producers From Worker Consumers

**Files:**
- Create: `apps/api_v2/src/worker.ts`
- Create: `apps/api_v2/src/worker.module.ts`
- Create: `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.worker.module.ts`
- Create: `apps/api_v2/src/modules/exports/exports.worker.module.ts`
- Create: `apps/api_v2/src/modules/integrations/integrations.worker.module.ts`
- Create: `apps/api_v2/scripts/smoke-worker.mjs`
- Modify: `apps/api_v2/package.json`
- Modify: `apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.module.ts`
- Modify: `apps/api_v2/src/modules/exports/exports.module.ts`
- Modify: `apps/api_v2/src/modules/integrations/integrations.module.ts`

- [ ] **Step 1: Add worker scripts**

Add these scripts to `apps/api_v2/package.json`:

```json
{
  "worker:dev": "pnpm --filter @workspace/database build && nest start --watch --entryFile worker",
  "worker:start": "node dist/src/worker.js",
  "smoke:worker": "node scripts/smoke-worker.mjs"
}
```

- [ ] **Step 2: Move existing processors into worker-only modules**

Remove processor classes from the HTTP modules' provider lists. Add worker modules that import the service modules and provide only the processor.

`apps/api_v2/src/modules/outbound-webhooks/outbound-webhooks.worker.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { OutboundWebhooksModule } from "./outbound-webhooks.module.js";
import { OutboundWebhooksProcessor } from "./outbound-webhooks.processor.js";

@Module({
  imports: [OutboundWebhooksModule],
  providers: [OutboundWebhooksProcessor],
})
export class OutboundWebhooksWorkerModule {}
```

Repeat the same pattern for exports and integrations. Export `ExportsService` from `ExportsModule` and `IntegrationsService` from `IntegrationsModule` so the worker processor can inject them through the imported module.

- [ ] **Step 3: Create the worker app module**

`apps/api_v2/src/worker.module.ts` should import the same global foundation as `AppModule` plus worker-only modules:

```ts
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { validateApiV2Env } from "./config/env.js";
import { PrismaModule } from "./modules/prisma/prisma.module.js";
import { RedisModule } from "./modules/redis/redis.module.js";
import { EmailWorkerModule } from "./modules/email/email.worker.module.js";
import { QueueingModule } from "./modules/queueing/queueing.module.js";
import { OutboundWebhooksWorkerModule } from "./modules/outbound-webhooks/outbound-webhooks.worker.module.js";
import { ExportsWorkerModule } from "./modules/exports/exports.worker.module.js";
import { IntegrationsWorkerModule } from "./modules/integrations/integrations.worker.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateApiV2Env }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: { url: configService.getOrThrow<string>("REDIS_URL") },
      }),
    }),
    PrismaModule,
    RedisModule,
    QueueingModule,
    EmailWorkerModule,
    OutboundWebhooksWorkerModule,
    ExportsWorkerModule,
    IntegrationsWorkerModule,
  ],
})
export class WorkerModule {}
```

- [ ] **Step 4: Create worker bootstrap**

`apps/api_v2/src/worker.ts`:

```ts
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module.js";

const logger = new Logger("SembliaWorker");

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.enableShutdownHooks();
  logger.log("Semblia worker started");
}

bootstrap().catch((error) => {
  logger.error("Semblia worker failed to start", error);
  process.exitCode = 1;
});
```

- [ ] **Step 5: Verify the boundary**

Run:

```bash
corepack.cmd pnpm --filter api_v2 typecheck
corepack.cmd pnpm --filter api_v2 test -- --run modules/outbound-webhooks modules/exports modules/integrations
corepack.cmd pnpm build --filter api_v2
```

Expected: typecheck, existing queue tests, and build pass. The built API should still enqueue jobs; only `worker:start` should instantiate processors.

### Task 2: Add Shared Queueing, Locks, and Telemetry

**Files:**
- Create: `apps/api_v2/src/modules/queueing/queueing.module.ts`
- Create: `apps/api_v2/src/modules/queueing/queueing.constants.ts`
- Create: `apps/api_v2/src/modules/queueing/queue-lock.service.ts`
- Create: `apps/api_v2/src/modules/queueing/queue-telemetry.service.ts`
- Create: `apps/api_v2/src/modules/queueing/queue-lock.service.spec.ts`
- Modify: `apps/api_v2/src/app.module.ts`
- Modify: `apps/api_v2/src/worker.module.ts`

- [ ] **Step 1: Define queue names and retry defaults**

`queueing.constants.ts` should centralize new queue names while preserving existing feature constants:

```ts
export const EMAIL_DELIVERY_QUEUE = "email-delivery";

export const DEFAULT_DELIVERY_ATTEMPTS = 3;
export const DEFAULT_DELIVERY_BACKOFF_MS = 30_000;

export const QUEUE_LOCK_TTL_MS = 55_000;
export const QUEUE_MAINTENANCE_LOCK = "locks:queue-maintenance";
export const EMAIL_OUTBOX_LOCK = "locks:email-outbox";
```

- [ ] **Step 2: Implement a Redis distributed lock**

`QueueLockService.withLock(key, ttlMs, task)` should use `SET key token NX PX ttlMs`, run the task only when the lock is acquired, and release with a Lua compare-and-delete so another worker's lock cannot be deleted.

- [ ] **Step 3: Add lock tests**

Cover:

- task runs when `SET NX` returns `OK`
- task is skipped when `SET NX` returns `null`
- release uses a token check
- release failure is swallowed after task success

- [ ] **Step 4: Add queue telemetry service**

`QueueTelemetryService` should report:

- BullMQ counts for `waiting`, `active`, `delayed`, `failed`, and `completed`
- DB counts for `EmailDelivery`, `OutboundWebhookDelivery`, `ExportDelivery`, and `DeadLetterJob`
- oldest pending email delivery age in seconds

- [ ] **Step 5: Verify shared queueing**

Run:

```bash
corepack.cmd pnpm --filter api_v2 test -- --run modules/queueing
corepack.cmd pnpm --filter api_v2 typecheck
```

Expected: new queueing tests pass and typecheck stays clean.

### Task 3: Add Email Delivery Persistence and Resend Adapter

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/20260528110000_email_delivery_queue/migration.sql`
- Modify: `apps/api_v2/src/config/env.ts`
- Modify: `apps/api_v2/package.json`
- Create: `apps/api_v2/src/modules/email/email.module.ts`
- Create: `apps/api_v2/src/modules/email/email.worker.module.ts`
- Create: `apps/api_v2/src/modules/email/email.types.ts`
- Create: `apps/api_v2/src/modules/email/email-templates.ts`
- Create: `apps/api_v2/src/modules/email/resend-mailer.service.ts`
- Create: `apps/api_v2/src/modules/email/email-delivery.service.ts`
- Create: `apps/api_v2/src/modules/email/email-delivery.processor.ts`
- Create: `apps/api_v2/src/modules/email/resend-mailer.service.spec.ts`
- Create: `apps/api_v2/src/modules/email/email-delivery.service.spec.ts`
- Create: `apps/api_v2/src/modules/email/email-delivery.processor.spec.ts`

- [ ] **Step 1: Add Resend dependency**

Run:

```bash
corepack.cmd pnpm --filter api_v2 add resend
```

Expected: `apps/api_v2/package.json` gains `resend` and `pnpm-lock.yaml` updates.

- [ ] **Step 2: Add email env vars**

Add these to `apiV2EnvSchema`:

```ts
RESEND_API_KEY: z.string().optional(),
EMAIL_FROM: z.string().optional(),
EMAIL_REPLY_TO: z.string().optional(),
EMAIL_ENABLED: z.coerce.boolean().default(false),
EMAIL_DAILY_LIMIT: z.coerce.number().int().positive().default(1000),
APP_PUBLIC_URL: z.string().url().optional(),
WORKER_CONCURRENCY_EMAIL: z.coerce.number().int().positive().default(5),
```

Production validation should require `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_PUBLIC_URL` when `EMAIL_ENABLED` is true.

- [ ] **Step 3: Add the delivery model**

Add Prisma enums and model:

```prisma
enum EmailDeliveryStatus {
  PENDING
  ENQUEUED
  SENDING
  SENT
  FAILED
  EXHAUSTED
  SUPPRESSED
}

enum EmailTemplateKey {
  NOTIFICATION
  PROJECT_MEMBER_INVITE
}

model EmailDelivery {
  id                String              @id @default(cuid())
  userId            String?
  notificationId    String?
  projectId         String?
  recipientEmail    String              @db.VarChar(320)
  recipientName     String?             @db.VarChar(255)
  template          EmailTemplateKey
  subject           String              @db.VarChar(255)
  payload           Json
  status            EmailDeliveryStatus @default(PENDING)
  attempts          Int                 @default(0)
  nextAttemptAt     DateTime?
  provider          String              @default("resend") @db.VarChar(40)
  providerMessageId String?             @db.VarChar(255)
  idempotencyKey    String              @unique @db.VarChar(255)
  providerError     String?             @db.Text
  sentAt            DateTime?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@index([status, nextAttemptAt, createdAt])
  @@index([userId, createdAt])
  @@index([notificationId])
  @@index([projectId, createdAt])
  @@index([recipientEmail, createdAt])
}
```

Use indexed ids rather than hard Prisma relations unless the implementation explicitly needs cascades. This keeps the delivery audit trail stable if a notification is deleted.

- [ ] **Step 4: Implement pure templates**

Start with two templates:

- `NOTIFICATION`: title, message, link, notification type, project metadata if present.
- `PROJECT_MEMBER_INVITE`: project name, role, inviter email if available, invite acceptance URL.

Template output type:

```ts
export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};
```

- [ ] **Step 5: Implement `ResendMailerService`**

The adapter should:

- return `{ skipped: true }` when `EMAIL_ENABLED` is false
- call `resend.emails.send(payload, { idempotencyKey })` when enabled
- pass `from`, optional `replyTo`, `to`, `subject`, `html`, `text`, and tags
- map Resend errors into retryable/permanent categories

Tags:

```ts
[
  { name: "template", value: delivery.template },
  { name: "delivery_id", value: delivery.id },
  ...(delivery.projectId ? [{ name: "project_id", value: delivery.projectId }] : []),
  ...(delivery.userId ? [{ name: "user_id", value: delivery.userId }] : []),
]
```

- [ ] **Step 6: Implement `EmailDeliveryService`**

Required methods:

- `createNotificationDeliveryWith(tx, notification, recipient)`
- `createProjectInviteDeliveryWith(tx, invite, project, inviter)`
- `enqueuePending(limit = 100)`
- `enqueueDelivery(deliveryId)`
- `processDelivery(deliveryId)`
- `markDeliveryFailed(delivery, attempts, error)`
- `recordDeadLetter(delivery, error)`

Queue add options:

```ts
{
  attempts: DEFAULT_DELIVERY_ATTEMPTS,
  backoff: { type: "exponential", delay: DEFAULT_DELIVERY_BACKOFF_MS },
  removeOnComplete: true,
  removeOnFail: false,
  jobId: `email-delivery:${deliveryId}`,
}
```

- [ ] **Step 7: Implement worker processor with configurable concurrency**

`EmailDeliveryProcessor` should use `@Processor(EMAIL_DELIVERY_QUEUE, { concurrency: 5 })` first. If Nest decorator options cannot read config directly, keep decorator concurrency at 5 for v1 and use `WORKER_CONCURRENCY_EMAIL` in a follow-up with a custom Bull worker factory.

- [ ] **Step 8: Verify email module**

Run:

```bash
corepack.cmd pnpm --filter @workspace/database generate
corepack.cmd pnpm --filter @workspace/database exec prisma validate
corepack.cmd pnpm --filter api_v2 test -- --run modules/email
corepack.cmd pnpm --filter api_v2 typecheck
```

Expected: Prisma validates, email tests pass, and no env/type errors.

### Task 4: Wire Notification Email Fanout

**Files:**
- Modify: `apps/api_v2/src/modules/notifications/notifications.module.ts`
- Modify: `apps/api_v2/src/modules/notifications/notifications.service.ts`
- Modify: `apps/api_v2/src/modules/notifications/notifications.spec.ts`
- Modify: `packages/database/prisma/schema.prisma` only if relation fields are chosen in Task 3

- [ ] **Step 1: Preserve in-app behavior**

Keep existing behavior for `createForUsers`, `createForProjectReviewers`, and `createForProjectManagers`: in-app notification creation still respects `{ inApp: false }` per type and `isRead` remains false by default.

- [ ] **Step 2: Add email preference checks**

Email delivery should be created only when:

- `NotificationPreferences.emailEnabled !== false`
- per-type preference is missing or `{ email: true }`
- recipient user has a non-empty email

In-app and email preferences are independent. `{ inApp: false, email: true }` should still create an email delivery, and `{ inApp: true, email: false }` should still create the in-app row.

- [ ] **Step 3: Stop using `createMany` for notification rows that need email**

Use a transaction loop so each created `Notification` id can be attached to an `EmailDelivery`. Preserve recipient dedupe before the loop.

- [ ] **Step 4: Add tests**

Cover:

- creates in-app only when email disabled globally
- creates email delivery when global email enabled and type preference allows it
- suppresses email when type preference has `email: false`
- still creates email when `inApp: false` but `email: true`
- does not create duplicate deliveries for duplicate user ids

- [ ] **Step 5: Verify notifications**

Run:

```bash
corepack.cmd pnpm --filter api_v2 test -- --run modules/notifications
corepack.cmd pnpm --filter api_v2 typecheck
```

Expected: existing notification API behavior remains stable and new email fanout tests pass.

### Task 5: Send Project Member Invite Emails

**Files:**
- Modify: `apps/api_v2/src/modules/projects/projects.module.ts`
- Modify: `apps/api_v2/src/modules/projects/projects.service.ts`
- Modify: `apps/api_v2/src/modules/projects/projects.service.spec.ts`
- Optional create: `apps/web_v2/app/(app)/invitations/[inviteId]/page.tsx`
- Optional create: `apps/web_v2/app/(app)/invitations/[inviteId]/invitation-client.tsx`
- Optional create: `apps/web_v2/tests/project-invitations.test.tsx`

- [ ] **Step 1: Replace the invite-email comment**

In `createMemberInvite`, create a `PROJECT_MEMBER_INVITE` email delivery in the same transaction as the invite and audit row. Use deterministic idempotency:

```ts
project-invite:${createdInvite.id}:initial
```

The email payload should include:

- `inviteId`
- `projectId`
- `projectSlug`
- `projectName`
- `role`
- `expiresAt`
- `acceptUrl`

- [ ] **Step 2: Build accept URL**

Use `APP_PUBLIC_URL` and an app route:

```ts
`${APP_PUBLIC_URL}/invitations/${createdInvite.id}`
```

If the web route is deferred, link to `/sign-in?redirect_url=/projects` and keep the existing behavior that the invite activates when the user signs in with the same email.

- [ ] **Step 3: Add project tests**

Cover:

- invite creates pending email delivery for existing users and unknown emails
- existing users still receive the current in-app `PROJECT_INVITE_RECEIVED` notification
- duplicate pending invite does not create a second email delivery
- revoked invite does not retry or send a new invite email

- [ ] **Step 4: Optional web accept route**

If enabled in this phase, build a small signed-in route that calls `useAcceptProjectMemberInvite()` and then routes to `/projects/:slug/settings/members` on success.

- [ ] **Step 5: Verify projects**

Run:

```bash
corepack.cmd pnpm --filter api_v2 test -- --run modules/projects
corepack.cmd pnpm --filter api_v2 typecheck
```

If the optional web route is implemented, also run:

```bash
cd apps/web_v2
corepack.cmd pnpm exec tsc --noEmit
corepack.cmd pnpm exec eslint . --ext .ts,.tsx
corepack.cmd pnpm test -- tests/project-invitations.test.tsx
```

### Task 6: Add Cron Maintenance and Reconciliation

**Files:**
- Create: `apps/api_v2/src/modules/queueing/queue-maintenance.service.ts`
- Create: `apps/api_v2/src/modules/queueing/queue-maintenance.service.spec.ts`
- Modify: `apps/api_v2/src/modules/queueing/queueing.module.ts`
- Modify: `apps/api_v2/src/worker.module.ts`

- [ ] **Step 1: Add email outbox drain cron**

Run every minute:

```ts
@Cron(CronExpression.EVERY_MINUTE, {
  name: "email-outbox-drain",
  waitForCompletion: true,
})
async drainEmailOutbox() {
  await this.locks.withLock(EMAIL_OUTBOX_LOCK, QUEUE_LOCK_TTL_MS, () =>
    this.emailDeliveries.enqueuePending(100),
  );
}
```

- [ ] **Step 2: Add delivery reconciliation cron**

Run every five minutes under a Redis lock:

- re-enqueue `EmailDelivery` rows with `status in (PENDING, FAILED)` and `nextAttemptAt <= now`
- re-enqueue `OutboundWebhookDelivery` rows with due `nextAttemptAt`
- re-enqueue `ExportDelivery` rows with due `nextAttemptAt`
- record an operational alert if any queue has backlog above `AlertConfig.dlqCountThreshold`

- [ ] **Step 3: Add daily email usage cron**

Run every day at 00:10 UTC:

- count `EmailDelivery` rows sent for the previous UTC date
- upsert `EmailUsage`
- record `EMAIL_QUOTA_HIGH` alert when count exceeds configured threshold

- [ ] **Step 4: Add stale sending guard**

Run every ten minutes:

- mark `EmailDelivery` rows stuck in `SENDING` for more than 15 minutes as `FAILED`
- set `nextAttemptAt` based on attempts
- re-enqueue if attempts remain

- [ ] **Step 5: Add cron tests**

Mock `QueueLockService`, `EmailDeliveryService`, queue telemetry, and Prisma. Cover that handlers:

- do nothing when the lock is unavailable
- call enqueue methods when the lock is acquired
- record alert once for high backlog
- do not throw on alert delivery failure

- [ ] **Step 6: Verify cron maintenance**

Run:

```bash
corepack.cmd pnpm --filter api_v2 test -- --run modules/queueing modules/email modules/alerts
corepack.cmd pnpm --filter api_v2 typecheck
```

Expected: cron services are test-covered and worker module compiles.

### Task 7: Add Ops/Admin Visibility and Retry Controls

**Files:**
- Modify: `apps/api_v2/src/modules/ops-admin/ops-admin.service.ts`
- Modify: `apps/api_v2/src/modules/ops-admin/ops-admin.controller.ts`
- Modify: `apps/api_v2/src/modules/ops-admin/ops-admin.dto.ts`
- Modify: `apps/api_v2/src/modules/ops-admin/ops-admin.spec.ts`
- Modify: `apps/api_v2/src/modules/alerts/alerts.module.ts`

- [ ] **Step 1: Export `AlertsService`**

`AlertsModule` should export `AlertsService` so queue maintenance can record operational alerts without duplicating Slack logic.

- [ ] **Step 2: Add queue health snapshot endpoint**

Add `GET /v2/ops-admin/queues` returning:

- BullMQ counts per queue
- DB status counts for email/webhook/export deliveries
- `EmailUsage` today and yesterday
- unresolved alert count

Keep the current route internal-only until an admin auth contract is explicitly attached. If it becomes public to admins, guard it with the same admin auth stack as `AdminModule`.

- [ ] **Step 3: Add dead-letter retry endpoint**

Add `POST /v2/ops-admin/dead-letter/:id/retry` that:

- marks `DeadLetterJob.retried = true`
- records `retriedAt`
- creates a fresh queue job only for supported queues
- appends retry metadata to `retryHistory`

- [ ] **Step 4: Add tests**

Cover:

- queue snapshot aggregates Redis and DB data
- retry rejects unknown queue names
- retry is idempotent when `retried = true`
- retry creates a new BullMQ job with deterministic id

- [ ] **Step 5: Verify ops visibility**

Run:

```bash
corepack.cmd pnpm --filter api_v2 test -- --run modules/ops-admin modules/alerts modules/queueing
corepack.cmd pnpm --filter api_v2 typecheck
```

### Task 8: End-to-End Verification and Continuity Closeout

**Files:**
- Modify: `docs/continuity/progress.md`
- Modify: `docs/continuity/decisions.md`

- [ ] **Step 1: Run database verification**

```bash
corepack.cmd pnpm --filter @workspace/database generate
corepack.cmd pnpm --filter @workspace/database exec prisma validate
corepack.cmd pnpm --filter @workspace/types build
```

Expected: Prisma client generation, schema validation, and shared type build pass.

- [ ] **Step 2: Run API verification**

```bash
corepack.cmd pnpm --filter api_v2 typecheck
corepack.cmd pnpm --filter api_v2 lint
corepack.cmd pnpm --filter api_v2 test -- --run modules/email modules/notifications modules/projects modules/queueing modules/ops-admin modules/outbound-webhooks modules/exports modules/integrations
corepack.cmd pnpm --filter api_v2 test
corepack.cmd pnpm build --filter api_v2
```

Expected: all targeted and full API gates pass.

- [ ] **Step 3: Run worker smoke**

```bash
corepack.cmd pnpm --filter api_v2 smoke:worker
```

Expected: built worker bootstraps an application context and exits cleanly in smoke mode.

- [ ] **Step 4: Refresh indexes after source edits**

Because this plan modifies `apps/api_v2` and `packages`, run:

```bash
python scripts/update-indexes.py
python scripts/rebuild-graphify.py
```

Expected: both commands complete; if Ollama is unreachable, record the exact reduced-index output in `docs/continuity/progress.md`.

- [ ] **Step 5: Update continuity docs**

Record:

- Resend is the v1 transactional email provider.
- BullMQ + Redis is the queue substrate for all v1 background jobs.
- HTTP API process is a producer; worker process owns processors and cron.
- Email invite sending is now in scope and wired through `EmailDelivery`.
- Exact verification command outputs.

## Open User Decisions Before Implementation

- **Sending identity:** choose the production `EMAIL_FROM`, likely `Semblia <notifications@semblia.com>` once the domain is verified in Resend.
- **Initial daily email cap:** plan defaults to `EMAIL_DAILY_LIMIT=1000`; adjust before production if Resend account limits differ.
- **Invite link UX:** either ship a real `/invitations/:inviteId` accept page in this phase, or keep the email copy pointed at sign-in plus the current "accepted on matching sign-in" behavior.

## Rollout Order

1. Land worker split without changing behavior.
2. Add shared queue locks/telemetry.
3. Add Resend/email delivery model with `EMAIL_ENABLED=false` by default.
4. Wire notification email fanout behind preferences.
5. Wire project invite emails.
6. Enable cron reconciliation and alerts.
7. Enable `EMAIL_ENABLED=true` only after Resend domain/env setup is complete.

## Risk Notes

- The biggest correctness risk is duplicate sends. Use DB `idempotencyKey @unique`, deterministic BullMQ `jobId`, and Resend idempotency keys together.
- The biggest deployment risk is duplicate cron execution in a multi-worker pool. Use Redis locks for every cron handler and deterministic queue jobs for all work items.
- The biggest product risk is sending invite emails before the accept UX is clear. Keep invite links conservative until the route is implemented.
- Do not put provider secrets in continuity docs, tests, snapshots, or queue payloads.
