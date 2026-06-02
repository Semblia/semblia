-- Remove the legacy testimonial projection surface. CollectionFormSubmission is
-- the canonical feedback record; display projections can be rebuilt later.

-- Public submit idempotency no longer stores "TESTIMONIALS" as a persistence
-- discriminator. Route names can stay compatible above this layer.
ALTER TYPE "PublicSubmitSurface" RENAME TO "PublicSubmitSurface_old";
CREATE TYPE "PublicSubmitSurface" AS ENUM ('DIRECT_SUBMISSION', 'FORM');
ALTER TABLE "PublicSubmitIdempotency" ALTER COLUMN "surface" DROP DEFAULT;
ALTER TABLE "PublicSubmitIdempotency"
  ALTER COLUMN "surface" TYPE "PublicSubmitSurface"
  USING (
    CASE
      WHEN "surface"::text = 'TESTIMONIALS' THEN 'DIRECT_SUBMISSION'
      ELSE "surface"::text
    END
  )::"PublicSubmitSurface";
ALTER TABLE "PublicSubmitIdempotency"
  ALTER COLUMN "surface" SET DEFAULT 'DIRECT_SUBMISSION';
DROP TYPE "PublicSubmitSurface_old";

-- Notification events are submission-oriented now.
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
CREATE TYPE "NotificationType" AS ENUM (
  'SUBMISSION_CREATED',
  'SUBMISSION_MODERATED',
  'SUBMISSION_FLAGGED',
  'SUBMISSION_APPROVED',
  'SUBMISSION_REJECTED',
  'EXPORT_DELIVERY_FAILED',
  'EXPORT_DELIVERY_READY',
  'AGENT_ACTION_CREATED',
  'PROJECT_INVITE_RECEIVED',
  'PROJECT_INVITE_ACCEPTED',
  'OUTBOUND_WEBHOOK_DELIVERY_FAILED',
  'SECURITY_ALERT'
);
ALTER TABLE "Notification"
  ALTER COLUMN "type" TYPE "NotificationType"
  USING (
    CASE
      WHEN "type"::text = 'NEW_TESTIMONIAL' THEN 'SUBMISSION_CREATED'
      WHEN "type"::text = 'TESTIMONIAL_FLAGGED' THEN 'SUBMISSION_FLAGGED'
      WHEN "type"::text = 'TESTIMONIAL_APPROVED' THEN 'SUBMISSION_APPROVED'
      WHEN "type"::text = 'TESTIMONIAL_REJECTED' THEN 'SUBMISSION_REJECTED'
      ELSE "type"::text
    END
  )::"NotificationType";
DROP TYPE "NotificationType_old";

UPDATE "NotificationPreferences"
SET "typePreferences" =
  (
    "typePreferences"
    || CASE
      WHEN "typePreferences" ? 'NEW_TESTIMONIAL'
        THEN jsonb_build_object('SUBMISSION_CREATED', "typePreferences" -> 'NEW_TESTIMONIAL')
      ELSE '{}'::jsonb
    END
    || CASE
      WHEN "typePreferences" ? 'TESTIMONIAL_FLAGGED'
        THEN jsonb_build_object('SUBMISSION_FLAGGED', "typePreferences" -> 'TESTIMONIAL_FLAGGED')
      ELSE '{}'::jsonb
    END
    || CASE
      WHEN "typePreferences" ? 'TESTIMONIAL_APPROVED'
        THEN jsonb_build_object('SUBMISSION_APPROVED', "typePreferences" -> 'TESTIMONIAL_APPROVED')
      ELSE '{}'::jsonb
    END
    || CASE
      WHEN "typePreferences" ? 'TESTIMONIAL_REJECTED'
        THEN jsonb_build_object('SUBMISSION_REJECTED', "typePreferences" -> 'TESTIMONIAL_REJECTED')
      ELSE '{}'::jsonb
    END
  )
  - 'NEW_TESTIMONIAL'
  - 'TESTIMONIAL_FLAGGED'
  - 'TESTIMONIAL_APPROVED'
  - 'TESTIMONIAL_REJECTED'
WHERE "typePreferences" IS NOT NULL;

-- Testimonial-specific media purposes collapse into submission attachments.
ALTER TYPE "MediaAssetPurpose" RENAME TO "MediaAssetPurpose_old";
CREATE TYPE "MediaAssetPurpose" AS ENUM (
  'PROJECT_LOGO',
  'ACCOUNT_DEFAULTS_LOGO',
  'FORM_BRANDING_LOGO',
  'SUBMISSION_ATTACHMENT',
  'EXPORT_ARTIFACT'
);
ALTER TABLE "MediaAsset"
  ALTER COLUMN "purpose" TYPE "MediaAssetPurpose"
  USING (
    CASE
      WHEN "purpose"::text IN (
        'TESTIMONIAL_AUTHOR_AVATAR',
        'TESTIMONIAL_VIDEO',
        'TESTIMONIAL_MEDIA'
      ) THEN 'SUBMISSION_ATTACHMENT'
      ELSE "purpose"::text
    END
  )::"MediaAssetPurpose";
DROP TYPE "MediaAssetPurpose_old";

ALTER TABLE "ProjectAnalyticsDaily"
  RENAME COLUMN "testimonialImpressions" TO "submissionImpressions";

CREATE TABLE "SubmissionPrivateMetadata" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "authorEmailEncrypted" TEXT,
  "authorEmailHash" VARCHAR(128),
  "ipAddressEncrypted" TEXT,
  "ipAddressHash" VARCHAR(128),
  "userAgentEncrypted" TEXT,
  "userAgentHash" VARCHAR(128),
  "retentionUntil" TIMESTAMP(3),
  "consentSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SubmissionPrivateMetadata_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SubmissionPrivateMetadata" (
  "id",
  "submissionId",
  "authorEmailEncrypted",
  "authorEmailHash",
  "ipAddressEncrypted",
  "ipAddressHash",
  "userAgentEncrypted",
  "userAgentHash",
  "retentionUntil",
  "consentSnapshot",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "submissionId",
  "authorEmailEncrypted",
  "authorEmailHash",
  "ipAddressEncrypted",
  "ipAddressHash",
  "userAgentEncrypted",
  "userAgentHash",
  "retentionUntil",
  "consentSnapshot",
  "createdAt",
  "updatedAt"
FROM "TestimonialPrivateMetadata"
WHERE "submissionId" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "SubmissionPrivateMetadata_submissionId_key"
  ON "SubmissionPrivateMetadata"("submissionId");
CREATE INDEX "SubmissionPrivateMetadata_authorEmailHash_idx"
  ON "SubmissionPrivateMetadata"("authorEmailHash");
CREATE INDEX "SubmissionPrivateMetadata_ipAddressHash_idx"
  ON "SubmissionPrivateMetadata"("ipAddressHash");
CREATE INDEX "SubmissionPrivateMetadata_retentionUntil_idx"
  ON "SubmissionPrivateMetadata"("retentionUntil");
ALTER TABLE "SubmissionPrivateMetadata"
  ADD CONSTRAINT "SubmissionPrivateMetadata_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "CollectionFormSubmission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionModerationRun"
  DROP CONSTRAINT IF EXISTS "SubmissionModerationRun_testimonialId_fkey";
ALTER TABLE "SubmissionModerationRun"
  DROP COLUMN IF EXISTS "testimonialId";

ALTER TABLE "CollectionFormSubmissionAnnotation"
  DROP CONSTRAINT IF EXISTS "CollectionFormSubmissionAnnotation_testimonialId_fkey";
DROP INDEX IF EXISTS "CollectionFormSubmissionAnnotation_testimonialId_idx";
ALTER TABLE "CollectionFormSubmissionAnnotation"
  DROP COLUMN IF EXISTS "testimonialId";

ALTER TABLE "CollectionFormSubmission"
  DROP CONSTRAINT IF EXISTS "CollectionFormSubmission_testimonialId_fkey";
ALTER TABLE "CollectionFormSubmission"
  DROP COLUMN IF EXISTS "testimonialId";

DROP TABLE IF EXISTS "TestimonialDisplayRevision" CASCADE;
DROP TABLE IF EXISTS "TestimonialImpression" CASCADE;
DROP TABLE IF EXISTS "_TestimonialTags" CASCADE;
DROP TABLE IF EXISTS "Tag" CASCADE;
DROP TABLE IF EXISTS "TestimonialPrivateMetadata" CASCADE;
DROP TABLE IF EXISTS "Testimonial" CASCADE;

DROP TYPE IF EXISTS "DisplayRevisionStatus";
DROP TYPE IF EXISTS "TestimonialType";
