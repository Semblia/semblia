-- Add feedback workflow state without changing the immutable source payload.
CREATE TYPE "DisplayRevisionStatus" AS ENUM ('SUGGESTED', 'APPROVED', 'REJECTED');

ALTER TABLE "CollectionFormSubmission"
ADD COLUMN "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "moderationReason" TEXT,
ADD COLUMN "moderatedByActorType" VARCHAR(32),
ADD COLUMN "moderatedByActorId" VARCHAR(255),
ADD COLUMN "moderatedAt" TIMESTAMP(3);

UPDATE "CollectionFormSubmission" AS submission
SET "moderationStatus" = testimonial."moderationStatus"
FROM "Testimonial" AS testimonial
WHERE submission."testimonialId" = testimonial."id";

CREATE TABLE "CollectionFormSubmissionAnnotation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "testimonialId" TEXT,
    "actorType" VARCHAR(32) NOT NULL,
    "actorId" VARCHAR(255),
    "note" TEXT,
    "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sentiment" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionFormSubmissionAnnotation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestimonialDisplayRevision" (
    "id" TEXT NOT NULL,
    "testimonialId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "suggestedByActorType" VARCHAR(32) NOT NULL,
    "suggestedByActorId" VARCHAR(255),
    "status" "DisplayRevisionStatus" NOT NULL DEFAULT 'SUGGESTED',
    "headline" VARCHAR(255),
    "displayText" TEXT NOT NULL,
    "reason" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestimonialDisplayRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectActionAudit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actorType" VARCHAR(32) NOT NULL,
    "actorId" VARCHAR(255),
    "credentialId" VARCHAR(255),
    "action" VARCHAR(120) NOT NULL,
    "targetType" VARCHAR(120),
    "targetId" VARCHAR(255),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectActionAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollectionFormSubmission_projectId_moderationStatus_createdAt_idx" ON "CollectionFormSubmission"("projectId", "moderationStatus", "createdAt");

CREATE INDEX "CollectionFormSubmissionAnnotation_projectId_createdAt_idx" ON "CollectionFormSubmissionAnnotation"("projectId", "createdAt");
CREATE INDEX "CollectionFormSubmissionAnnotation_submissionId_createdAt_idx" ON "CollectionFormSubmissionAnnotation"("submissionId", "createdAt");
CREATE INDEX "CollectionFormSubmissionAnnotation_testimonialId_idx" ON "CollectionFormSubmissionAnnotation"("testimonialId");
CREATE INDEX "CollectionFormSubmissionAnnotation_actorType_actorId_idx" ON "CollectionFormSubmissionAnnotation"("actorType", "actorId");

CREATE INDEX "TestimonialDisplayRevision_projectId_createdAt_idx" ON "TestimonialDisplayRevision"("projectId", "createdAt");
CREATE INDEX "TestimonialDisplayRevision_testimonialId_status_idx" ON "TestimonialDisplayRevision"("testimonialId", "status");
CREATE INDEX "TestimonialDisplayRevision_suggestedByActorType_suggestedByActorId_idx" ON "TestimonialDisplayRevision"("suggestedByActorType", "suggestedByActorId");

CREATE INDEX "ProjectActionAudit_projectId_createdAt_idx" ON "ProjectActionAudit"("projectId", "createdAt");
CREATE INDEX "ProjectActionAudit_projectId_action_createdAt_idx" ON "ProjectActionAudit"("projectId", "action", "createdAt");
CREATE INDEX "ProjectActionAudit_targetType_targetId_idx" ON "ProjectActionAudit"("targetType", "targetId");
CREATE INDEX "ProjectActionAudit_actorType_actorId_idx" ON "ProjectActionAudit"("actorType", "actorId");
CREATE INDEX "ProjectActionAudit_credentialId_idx" ON "ProjectActionAudit"("credentialId");

ALTER TABLE "CollectionFormSubmissionAnnotation" ADD CONSTRAINT "CollectionFormSubmissionAnnotation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionFormSubmissionAnnotation" ADD CONSTRAINT "CollectionFormSubmissionAnnotation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CollectionFormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionFormSubmissionAnnotation" ADD CONSTRAINT "CollectionFormSubmissionAnnotation_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TestimonialDisplayRevision" ADD CONSTRAINT "TestimonialDisplayRevision_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestimonialDisplayRevision" ADD CONSTRAINT "TestimonialDisplayRevision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectActionAudit" ADD CONSTRAINT "ProjectActionAudit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
