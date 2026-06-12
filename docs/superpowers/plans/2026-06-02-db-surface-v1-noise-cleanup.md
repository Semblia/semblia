# DB Surface V1 Noise Cleanup Audit

> Status: implemented as historical audit evidence. Do not execute the projection-slimming recommendations below as the current target.

> Execution update (2026-06-03): the testimonial projection path was superseded by the explicit product decision to remove the `Testimonial` table altogether for the prelaunch v2 app. `CollectionFormSubmission` is now the canonical persisted feedback source for public submission, moderation, export, analytics, and widget reads. References below to slimming `Testimonial` describe the original audit state, not the implemented target.

## Goal

Slim the v2 database surface by removing or narrowing v1-era duplicate models, compatibility mirrors, stale DTO exports, and raw/private fields that should now live on canonical v2 entities.

The current north star is:

- `CollectionFormSubmission` is the canonical public submission record.
- `CollectionForm` is the canonical collection experience/config record.
- No `Testimonial` projection exists in the current schema; testimonial product routes are submission-backed.
- `SubmissionModerationRun` is the provider/job ledger.
- `MediaAsset` is the canonical Semblia-owned asset record.
- `ProjectTrustedOrigin`, `ProjectSigningSecret`, and `PublicSurfaceHost` are the canonical public-surface trust/routing records.

## Grounding

Checked:

- `docs/continuity/README.md`
- `docs/continuity/progress.md`
- `docs/continuity/decisions.md`
- `docs/continuity/open-questions.md`
- `docs/superpowers/plans/2026-06-02-aws-first-moderation-pipeline.md`
- `packages/database/prisma/schema.prisma`
- API/web/packages references with `rg`
- vector search and graphify for schema/source-of-truth orientation

Local database counts were also sampled, but the local Postgres containers are schema-drifted and should not be treated as authoritative. The checked-in schema and source usage are the reliable evidence for this audit.

## Cleanup Findings

### P1: `Testimonial` is too broad for a projection

Current `Testimonial` still stores source/raw/private/workflow data:

- `authorEmail`
- `ipAddress`
- `userAgent`
- `oauthSubject`
- `source`
- `sourceUrl`
- `oembedData`
- `isApproved`
- `moderationScore`
- `moderationFlags`
- `autoPublished`

This makes `Testimonial` behave like the old canonical record while `CollectionFormSubmission` already owns the raw `answers`, moderation state, trust mode, idempotency, and linked metadata.

Recommended target:

- Keep on `Testimonial`: display fields needed by widgets/exports/testimonial pages: author display name, role/company, display content, type, rating, publication state, display media asset links, OAuth badge provider if it is displayed.
- Move or derive from submission/private metadata: email, IP, user agent, OAuth subject, source payloads, provider moderation details.
- Replace `isApproved` reads with `moderationStatus === APPROVED` or a computed DTO property during a compatibility window.
- Keep `moderationStatus` on `Testimonial` only if the projection must be queryable without joining `CollectionFormSubmission`; otherwise derive from the linked submission.

Likely first implementation step:

- Stop new code from writing raw PII to `Testimonial`.
- Update public/widget/export queries to use display-only fields.
- Backfill any remaining PII into private metadata.
- Drop the raw/private columns in a later migration after production non-null counts are verified.

### P1: `Project` still has public submit/form config compatibility mirrors

`Project` still includes:

- `collectionFormUrl`
- `allowedOrigins`
- `signingSecretEncrypted`
- `signingSecretRotatedAt`
- `formConfig`
- `moderationSettings`

Canonical replacements already exist:

- `CollectionForm.config`
- `PublicSurfaceHost`
- `ProjectTrustedOrigin`
- `ProjectSigningSecret`
- `AccountDefaults`
- `StudioDraft`

Current code still reads and writes several of the mirrors:

- `ProjectsService` returns and updates `collectionFormUrl`, `formConfig`, moderation defaults, and `allowedOrigins`.
- `PublicSubmitTrustService` still reads `Project.allowedOrigins`.
- `SigningSecretService` writes both `ProjectSigningSecret` and `Project.signingSecretEncrypted`, then falls back to the project-level secret.
- `apps/web_v2/lib/collect/types.ts` still migrates legacy `Project.formConfig` shapes at runtime.

Recommended target:

- `Project` should keep identity/branding/ownership fields only.
- `CollectionForm` should own form configuration.
- `PublicSurfaceHost` should own hosted URL resolution.
- `ProjectTrustedOrigin` should own origin allowlists.
- `ProjectSigningSecret` should own HMAC secrets and rotation history.
- Project-level moderation booleans can stay short-term as project policy defaults, but `moderationSettings` looks unused and should be either formalized or dropped.

Likely first implementation step:

- Backfill `Project.formConfig` into a default `CollectionForm` per project.
- Backfill `Project.allowedOrigins` into `ProjectTrustedOrigin`.
- Backfill `Project.signingSecretEncrypted` into `ProjectSigningSecret`.
- Remove runtime fallback reads only after the backfills are verified.
- Drop the project mirror fields in a follow-up migration.

### P1: `TestimonialPrivateMetadata` is named and keyed for the old world

The model now has both:

- `testimonialId`
- `submissionId`

The privacy record should attach to the canonical submission first. Keeping a testimonial key makes the private sidecar look like testimonial-owned storage and encourages future code to treat the projection as the source.

Recommended target:

- Rename conceptually to `SubmissionPrivateMetadata`.
- Make `submissionId` required after backfill.
- Drop `testimonialId` unless a measured query path proves it is necessary.
- Keep hashes for privacy-safe lookup and velocity checks.

Likely first implementation step:

- Introduce a new `SubmissionPrivateMetadata` model or migrate the current table in place with a Prisma rename if the migration history can stay readable.
- Update services to address it by `submissionId`.
- Keep a temporary relation from testimonial DTO mapping through `submission`.

### P2: Submission-side testimonial IDs are duplicated in workflow tables

These models carry a `testimonialId` even though they already link to `CollectionFormSubmission`, and the submission has the testimonial projection link:

- `CollectionFormSubmissionAnnotation.testimonialId`
- `SubmissionModerationRun.testimonialId`

This is denormalization for convenience, not a source of truth. It increases reconciliation work because every moderation/annotation path must keep both the submission and projection in sync.

Recommended target:

- Keep `submissionId` as required.
- Derive testimonial links through `CollectionFormSubmission.testimonialId`.
- Drop direct `testimonialId` from annotations and moderation runs unless a hot dashboard query requires it.
- If performance requires denormalization later, add it intentionally as a read model with tests that prove the sync contract.

Likely first implementation step:

- Update DTO mapping, notifications, and audit metadata to derive testimonial IDs from selected submission relations.
- Then remove writes to `annotation.testimonialId` and `run.testimonialId`.

### P2: API key model has redundant and unused access surfaces

`ApiKey` has both:

- `status`
- `isActive`
- `permissions`
- `scopes`

Current guard logic treats `status === ACTIVE` and `isActive === true` as required. Creation writes `permissions` as JSON null while `scopes` are the real authorization surface.

Recommended target:

- Make `status` authoritative.
- Drop `isActive` after compatibility responses stop using it.
- Drop `permissions` unless a real permission matrix is implemented.
- Keep `scopes`, `rateLimit`, `usageLimit`, and usage counters.

Likely first implementation step:

- Update DTOs and tests so revocation and active filtering use `status`.
- Remove `permissions` from create/list/read surfaces.
- Backfill `status` from `isActive` once, then drop `isActive`.

### P2: Several tables look like unused v1 scaffolding

No current source usage was found for these delegate names in `apps/api_v2`, `apps/web_v2`, `packages/semblia-mcp-server`, or `packages/types`:

- `NotificationOutbox`
- `JobIdempotency`
- `AuditLog`
- `FeatureFlag`
- `WidgetPerformanceAlert`
- `ExportRule`

Notes:

- `DeadLetterJob` is used by queue/ops code and should stay.
- `AdminAuditLog` and `ProjectActionAudit` are the active audit surfaces; `AuditLog` appears superseded.
- `ExportDelivery.ruleId` remains nullable and points at `ExportRule`, but no current export rule code path was found.

Recommended target:

- Drop `NotificationOutbox`, `JobIdempotency`, `AuditLog`, `FeatureFlag`, and `WidgetPerformanceAlert` after production row-count checks.
- For `ExportRule`, decide one of two paths:
  - implement rule-based exports soon, or
  - drop `ExportRule`, `ExportDelivery.ruleId`, and stale `V2ExportRuleDTO` for launch.

Likely first implementation step:

- Run read-only counts in the deployment database.
- If counts are zero, create one migration to drop the definitely dead tables.
- Keep `ExportRule` separate from the easy-drop migration because it is linked to `ExportDelivery`.

### P2: Shared type package exports old testimonial/widget surfaces

`packages/types/src/index.ts` exports:

- `testimonial.ts`
- `widget.ts`
- `v2.ts`

`testimonial.ts` exposes old DTOs with `authorEmail`, URL strings, raw moderation score/flags, and admin IP/user agent fields.

`widget.ts` exposes an old widget entity shape and testimonial shape with URL/string media fields.

No direct app imports of `@workspace/types` or those legacy DTO names were found in the checked app/package sources. If that remains true after build/dependency checks, these files are dead public contract noise.

Recommended target:

- Either remove `testimonial.ts` and `widget.ts` exports, or mark them internal/deprecated for one release if external package consumers exist.
- Make `v2.ts` the only shared contract surface.
- In `v2.ts`, remove stale `V2ExportRuleDTO` if `ExportRule` is dropped.
- In `v2.ts`, narrow `V2TestimonialDTO` so display-safe fields are separate from owner/review fields.

Likely first implementation step:

- Check package consumers and published package usage.
- Remove unused exports in the same PR as DTO cleanup, not in the DB migration PR.

### P2: Raw analytics fields need a privacy pass

`FormImpression` stores:

- `ipAddress`
- `userAgent`

The pipeline already has private metadata hashing/encryption patterns for submissions. Analytics should avoid becoming a second raw PII store.

Recommended target:

- Replace raw IP/user-agent retention with hashes, coarse device/country fields, or short TTL raw storage.
- Keep event and daily-rollup tables as separate concepts; the event-plus-rollup split is not itself v1 noise.

Likely first implementation step:

- Decide whether analytics needs raw user agent at all.
- Add retention/TTL handling before dropping raw fields.

### P3: Integration status is typed in shared DTOs but raw string in Prisma

`IntegrationConnection.status` is a string column while shared types define `V2IntegrationConnectionStatus`.

Recommended target:

- Convert to a Prisma enum if integration status is meant to be a closed set.
- This is lower priority than the testimonial/project cleanup because it is not v1 testimonial residue.

### P3: Local DB state is stale

The local Postgres containers do not reflect the current schema:

- `local_postgres_v1` is missing some current columns/tables.
- `local_postgres_v2` is much older and mostly empty.

Recommended target:

- Treat local DB counts as non-authoritative for cleanup drops.
- Before destructive migrations, run read-only checks against the real target database or a fresh migrated clone.
- After this cleanup, reset or rebuild local dev DBs so future audits do not waste time on stale evidence.

## Safe Cleanup Sequence

### Phase 0: Read-only production preflight

Run these against the real target database or a fresh clone:

```sql
select count(*) from "NotificationOutbox";
select count(*) from "JobIdempotency";
select count(*) from "AuditLog";
select count(*) from "FeatureFlag";
select count(*) from "WidgetPerformanceAlert";
select count(*) from "ExportRule";

select
  count(*) as projects,
  count(*) filter (where "collectionFormUrl" is not null) as project_collection_urls,
  count(*) filter (where cardinality("allowedOrigins") > 0) as project_allowed_origins,
  count(*) filter (where "signingSecretEncrypted" is not null) as project_signing_secrets,
  count(*) filter (where "formConfig" is not null) as project_form_configs,
  count(*) filter (where "moderationSettings" is not null) as project_moderation_settings
from "Project";

select
  count(*) as testimonials,
  count(*) filter (where "authorEmail" is not null) as raw_author_email,
  count(*) filter (where "ipAddress" is not null) as raw_ip,
  count(*) filter (where "userAgent" is not null) as raw_user_agent,
  count(*) filter (where "oauthSubject" is not null) as oauth_subject,
  count(*) filter (where "sourceUrl" is not null or "oembedData" is not null) as sourced_embed_payloads
from "Testimonial";

select
  count(*) as private_metadata,
  count(*) filter (where "submissionId" is null) as without_submission,
  count(*) filter (where "testimonialId" is null) as without_testimonial
from "TestimonialPrivateMetadata";

select
  count(*) as annotations,
  count(*) filter (where "testimonialId" is not null) as annotations_with_testimonial
from "CollectionFormSubmissionAnnotation";

select
  count(*) as runs,
  count(*) filter (where "testimonialId" is not null) as runs_with_testimonial
from "SubmissionModerationRun";
```

### Phase 1: Stop writing legacy mirrors

- Update direct testimonial and form submit paths to write private/source fields only to submission-owned metadata.
- Update moderation reconciliation to treat `CollectionFormSubmission` as canonical and update `Testimonial` only as a display projection.
- Stop writing `Project.allowedOrigins` when `ProjectTrustedOrigin` is updated.
- Stop writing project-level signing secret mirrors when `ProjectSigningSecret` rotates.
- Stop accepting project-level `formConfig` and `collectionFormUrl` in v2 project create/update DTOs.

### Phase 2: Contract cleanup

- Remove stale `packages/types/src/testimonial.ts` and `packages/types/src/widget.ts` exports if no external consumers exist.
- Split testimonial DTOs into display projection and review/submission DTOs.
- Remove `V2ExportRuleDTO` if `ExportRule` is not implemented.
- Remove `ApiKey.permissions` from DTOs and service responses if it remains unused.

### Phase 3: Backfill to canonical v2 records

- Project `formConfig` to default `CollectionForm.config`.
- Project `allowedOrigins` to `ProjectTrustedOrigin`.
- Project `signingSecretEncrypted` to `ProjectSigningSecret`.
- Testimonial raw/private fields to `SubmissionPrivateMetadata`.
- Existing annotation/moderation-run testimonial links can be derived and checked before removal.

### Phase 4: Drop in small migrations

Suggested migration grouping:

1. Dead/scaffold drop: `NotificationOutbox`, `JobIdempotency`, `AuditLog`, `FeatureFlag`, `WidgetPerformanceAlert`.
2. Project mirror drop: `Project.collectionFormUrl`, `Project.allowedOrigins`, `Project.signingSecretEncrypted`, `Project.signingSecretRotatedAt`, `Project.formConfig`, maybe `Project.moderationSettings`.
3. Testimonial projection slimming: raw PII/source/provider columns and redundant moderation fields.
4. Workflow denormalization drop: `CollectionFormSubmissionAnnotation.testimonialId`, `SubmissionModerationRun.testimonialId`.
5. API key slimming: `ApiKey.permissions`, then `ApiKey.isActive` after `status` is authoritative everywhere.
6. Export rule decision: either implement or drop `ExportRule` plus `ExportDelivery.ruleId`.

### Phase 5: Verification gates

For each implementation PR:

```bash
corepack.cmd pnpm --filter @workspace/database generate
corepack.cmd pnpm --filter @workspace/database exec prisma validate
corepack.cmd pnpm --filter @workspace/database build
corepack.cmd pnpm --filter api_v2 typecheck
corepack.cmd pnpm --filter api_v2 test
corepack.cmd pnpm build --filter api_v2
python scripts/update-indexes.py
python scripts/rebuild-graphify.py
```

If `apps/web_v2` contracts are touched:

```bash
cd apps/web_v2
pnpm exec tsc --noEmit
pnpm exec eslint . --ext .ts,.tsx
```

## Recommended First Cleanup PR

Start with the lowest-risk source/contract cleanup before destructive schema drops:

1. Make `CollectionFormSubmission` the only canonical moderation/private-source read path.
2. Convert `TestimonialPrivateMetadata` usage to submission-owned access.
3. Stop writing project trust/secret mirrors while keeping fallback reads.
4. Remove stale shared type exports if unused.
5. Add production read-only count evidence to the PR description.

Then do the first destructive migration only after the fallback reads are no longer exercised and counts prove the old surface is empty or safely backfilled.
