/*
  Warnings:

  - You are about to drop the column `accentColor` on the `Widget` table. All the data in the column will be lost.
  - You are about to drop the column `bgColor` on the `Widget` table. All the data in the column will be lost.
  - You are about to drop the column `borderRadius` on the `Widget` table. All the data in the column will be lost.
  - You are about to drop the column `config` on the `Widget` table. All the data in the column will be lost.
  - You are about to drop the column `layoutType` on the `Widget` table. All the data in the column will be lost.
  - You are about to drop the column `textColor` on the `Widget` table. All the data in the column will be lost.
  - You are about to drop the column `themeMode` on the `Widget` table. All the data in the column will be lost.
  - You are about to drop the column `widgetType` on the `Widget` table. All the data in the column will be lost.
  - You are about to alter the column `wallSlug` on the `Widget` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(64)`.
  - Made the column `projectId` on table `Widget` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "TrustedOriginKind" AS ENUM ('COLLECTION', 'WALL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PublicTrustStatus" AS ENUM ('ACTIVE', 'DISABLED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ProjectSigningSecretStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "PublicSurfaceFeature" AS ENUM ('COLLECTION', 'WALL');

-- CreateEnum
CREATE TYPE "PublicSurfaceResourceType" AS ENUM ('PROJECT', 'FORM', 'WIDGET');

-- CreateEnum
CREATE TYPE "PublicSurfaceHostStatus" AS ENUM ('ACTIVE', 'PENDING_VERIFICATION', 'DISABLED');

-- CreateEnum
CREATE TYPE "PublicSubmitSurface" AS ENUM ('TESTIMONIALS');

-- CreateEnum
CREATE TYPE "PublicSubmitTrustMode" AS ENUM ('ORIGIN', 'HMAC');

-- CreateEnum
CREATE TYPE "StudioDraftResourceType" AS ENUM ('FORM', 'WIDGET');

-- CreateEnum
CREATE TYPE "WidgetContentMode" AS ENUM ('ALL', 'HANDPICKED');

-- CreateEnum
CREATE TYPE "ApiKeyType" AS ENUM ('SECRET', 'PUBLISHABLE');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'DISABLED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- DropIndex
DROP INDEX "Widget_wallSlug_idx";

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "keyType" "ApiKeyType" NOT NULL DEFAULT 'SECRET',
ADD COLUMN     "lastFour" VARCHAR(8),
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "signingSecretEncrypted" TEXT,
ADD COLUMN     "signingSecretRotatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "onboardingCompletedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Widget" DROP COLUMN "accentColor",
DROP COLUMN "bgColor",
DROP COLUMN "borderRadius",
DROP COLUMN "config",
DROP COLUMN "layoutType",
DROP COLUMN "textColor",
DROP COLUMN "themeMode",
DROP COLUMN "widgetType",
ADD COLUMN     "accent" VARCHAR(64) NOT NULL DEFAULT '#0f172a',
ADD COLUMN     "bg" VARCHAR(64) NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "contentMode" "WidgetContentMode" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "fontHead" VARCHAR(255) NOT NULL DEFAULT '"Geist", system-ui, sans-serif',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "kind" "WidgetType" NOT NULL DEFAULT 'EMBED',
ADD COLUMN     "layout" "LayoutType" NOT NULL DEFAULT 'CAROUSEL',
ADD COLUMN     "line" VARCHAR(64) NOT NULL DEFAULT '#e5e7eb',
ADD COLUMN     "pickedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "radius" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "surface" VARCHAR(64) NOT NULL DEFAULT '#f7f7f8',
ADD COLUMN     "text" VARCHAR(64) NOT NULL DEFAULT '#0a0a0b',
ADD COLUMN     "theme" "ThemeMode" NOT NULL DEFAULT 'LIGHT',
ALTER COLUMN "projectId" SET NOT NULL,
ALTER COLUMN "fontFamily" SET DEFAULT '"Geist", system-ui, sans-serif',
ALTER COLUMN "fontFamily" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "cardStyle" SET DEFAULT 'BORDERED',
ALTER COLUMN "maxItems" SET DEFAULT 9,
ALTER COLUMN "wallSlug" SET DATA TYPE VARCHAR(64);

-- AlterTable
ALTER TABLE "_TestimonialTags" ADD CONSTRAINT "_TestimonialTags_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_TestimonialTags_AB_unique";

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTrustedOrigin" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "origin" VARCHAR(1000) NOT NULL,
    "kind" "TrustedOriginKind" NOT NULL DEFAULT 'CUSTOM',
    "status" "PublicTrustStatus" NOT NULL DEFAULT 'ACTIVE',
    "verifiedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTrustedOrigin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSigningSecret" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" VARCHAR(120),
    "secretEncrypted" TEXT NOT NULL,
    "secretHash" VARCHAR(128),
    "status" "ProjectSigningSecretStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT,
    "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedFromIpHash" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSigningSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicSurfaceHost" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "feature" "PublicSurfaceFeature" NOT NULL,
    "resourceType" "PublicSurfaceResourceType" NOT NULL DEFAULT 'PROJECT',
    "resourceId" TEXT,
    "hostname" VARCHAR(255) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "PublicSurfaceHostStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationTokenHash" VARCHAR(128),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicSurfaceHost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicSubmitIdempotency" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "surface" "PublicSubmitSurface" NOT NULL DEFAULT 'TESTIMONIALS',
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "submissionId" TEXT,
    "responseStatusCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicSubmitIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClerkWebhookEvent" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processed',
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "ClerkWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionFormSubmission" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "testimonialId" TEXT,
    "trustedOriginId" TEXT,
    "signingSecretId" TEXT,
    "trustMode" "PublicSubmitTrustMode" NOT NULL,
    "idempotencyKey" VARCHAR(255),
    "payloadHash" VARCHAR(64),
    "answers" JSONB NOT NULL,
    "ratingValue" SMALLINT,
    "ratingScale" SMALLINT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestimonialPrivateMetadata" (
    "id" TEXT NOT NULL,
    "testimonialId" TEXT,
    "submissionId" TEXT,
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

    CONSTRAINT "TestimonialPrivateMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioDraft" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "resourceType" "StudioDraftResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedVersion" INTEGER,
    "draft" JSONB NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAnalyticsDaily" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "formViews" INTEGER NOT NULL DEFAULT 0,
    "formSubmissions" INTEGER NOT NULL DEFAULT 0,
    "widgetLoads" INTEGER NOT NULL DEFAULT 0,
    "testimonialImpressions" INTEGER NOT NULL DEFAULT 0,
    "hostedPageViews" INTEGER NOT NULL DEFAULT 0,
    "apiRequests" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAnalyticsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX "ProjectTrustedOrigin_projectId_status_idx" ON "ProjectTrustedOrigin"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectTrustedOrigin_projectId_kind_status_idx" ON "ProjectTrustedOrigin"("projectId", "kind", "status");

-- CreateIndex
CREATE INDEX "ProjectTrustedOrigin_createdByUserId_idx" ON "ProjectTrustedOrigin"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTrustedOrigin_projectId_origin_key" ON "ProjectTrustedOrigin"("projectId", "origin");

-- CreateIndex
CREATE INDEX "ProjectSigningSecret_projectId_status_idx" ON "ProjectSigningSecret"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectSigningSecret_createdByUserId_idx" ON "ProjectSigningSecret"("createdByUserId");

-- CreateIndex
CREATE INDEX "ProjectSigningSecret_lastUsedAt_idx" ON "ProjectSigningSecret"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSigningSecret_projectId_version_key" ON "ProjectSigningSecret"("projectId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PublicSurfaceHost_hostname_key" ON "PublicSurfaceHost"("hostname");

-- CreateIndex
CREATE INDEX "PublicSurfaceHost_projectId_feature_status_idx" ON "PublicSurfaceHost"("projectId", "feature", "status");

-- CreateIndex
CREATE INDEX "PublicSurfaceHost_resourceType_resourceId_idx" ON "PublicSurfaceHost"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "PublicSurfaceHost_hostname_status_idx" ON "PublicSurfaceHost"("hostname", "status");

-- CreateIndex
CREATE INDEX "PublicSubmitIdempotency_submissionId_idx" ON "PublicSubmitIdempotency"("submissionId");

-- CreateIndex
CREATE INDEX "PublicSubmitIdempotency_expiresAt_idx" ON "PublicSubmitIdempotency"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PublicSubmitIdempotency_projectId_idempotencyKey_key" ON "PublicSubmitIdempotency"("projectId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PublicSubmitIdempotency_projectId_surface_idempotencyKey_key" ON "PublicSubmitIdempotency"("projectId", "surface", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ClerkWebhookEvent_providerEventId_key" ON "ClerkWebhookEvent"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionFormSubmission_testimonialId_key" ON "CollectionFormSubmission"("testimonialId");

-- CreateIndex
CREATE INDEX "CollectionFormSubmission_projectId_createdAt_idx" ON "CollectionFormSubmission"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionFormSubmission_formId_createdAt_idx" ON "CollectionFormSubmission"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionFormSubmission_projectId_formId_createdAt_idx" ON "CollectionFormSubmission"("projectId", "formId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionFormSubmission_trustedOriginId_idx" ON "CollectionFormSubmission"("trustedOriginId");

-- CreateIndex
CREATE INDEX "CollectionFormSubmission_signingSecretId_idx" ON "CollectionFormSubmission"("signingSecretId");

-- CreateIndex
CREATE UNIQUE INDEX "TestimonialPrivateMetadata_testimonialId_key" ON "TestimonialPrivateMetadata"("testimonialId");

-- CreateIndex
CREATE UNIQUE INDEX "TestimonialPrivateMetadata_submissionId_key" ON "TestimonialPrivateMetadata"("submissionId");

-- CreateIndex
CREATE INDEX "TestimonialPrivateMetadata_authorEmailHash_idx" ON "TestimonialPrivateMetadata"("authorEmailHash");

-- CreateIndex
CREATE INDEX "TestimonialPrivateMetadata_ipAddressHash_idx" ON "TestimonialPrivateMetadata"("ipAddressHash");

-- CreateIndex
CREATE INDEX "TestimonialPrivateMetadata_retentionUntil_idx" ON "TestimonialPrivateMetadata"("retentionUntil");

-- CreateIndex
CREATE INDEX "StudioDraft_projectId_resourceType_idx" ON "StudioDraft"("projectId", "resourceType");

-- CreateIndex
CREATE INDEX "StudioDraft_updatedByUserId_idx" ON "StudioDraft"("updatedByUserId");

-- CreateIndex
CREATE INDEX "StudioDraft_updatedAt_idx" ON "StudioDraft"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudioDraft_projectId_resourceType_resourceId_key" ON "StudioDraft"("projectId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ProjectAnalyticsDaily_day_idx" ON "ProjectAnalyticsDaily"("day");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAnalyticsDaily_projectId_day_key" ON "ProjectAnalyticsDaily"("projectId", "day");

-- CreateIndex
CREATE INDEX "ApiKey_projectId_status_idx" ON "ApiKey"("projectId", "status");

-- CreateIndex
CREATE INDEX "ApiKey_keyType_status_idx" ON "ApiKey"("keyType", "status");

-- CreateIndex
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTrustedOrigin" ADD CONSTRAINT "ProjectTrustedOrigin_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTrustedOrigin" ADD CONSTRAINT "ProjectTrustedOrigin_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSigningSecret" ADD CONSTRAINT "ProjectSigningSecret_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSigningSecret" ADD CONSTRAINT "ProjectSigningSecret_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicSurfaceHost" ADD CONSTRAINT "PublicSurfaceHost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicSubmitIdempotency" ADD CONSTRAINT "PublicSubmitIdempotency_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicSubmitIdempotency" ADD CONSTRAINT "PublicSubmitIdempotency_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CollectionFormSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionFormSubmission" ADD CONSTRAINT "CollectionFormSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionFormSubmission" ADD CONSTRAINT "CollectionFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "CollectionForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionFormSubmission" ADD CONSTRAINT "CollectionFormSubmission_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionFormSubmission" ADD CONSTRAINT "CollectionFormSubmission_trustedOriginId_fkey" FOREIGN KEY ("trustedOriginId") REFERENCES "ProjectTrustedOrigin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionFormSubmission" ADD CONSTRAINT "CollectionFormSubmission_signingSecretId_fkey" FOREIGN KEY ("signingSecretId") REFERENCES "ProjectSigningSecret"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialPrivateMetadata" ADD CONSTRAINT "TestimonialPrivateMetadata_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialPrivateMetadata" ADD CONSTRAINT "TestimonialPrivateMetadata_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CollectionFormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioDraft" ADD CONSTRAINT "StudioDraft_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioDraft" ADD CONSTRAINT "StudioDraft_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAnalyticsDaily" ADD CONSTRAINT "ProjectAnalyticsDaily_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
