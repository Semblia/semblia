-- CreateEnum
CREATE TYPE "MediaAssetPurpose" AS ENUM ('PROJECT_LOGO', 'ACCOUNT_DEFAULTS_LOGO', 'FORM_BRANDING_LOGO', 'TESTIMONIAL_AUTHOR_AVATAR', 'TESTIMONIAL_VIDEO', 'TESTIMONIAL_MEDIA', 'EXPORT_ARTIFACT');

-- CreateEnum
CREATE TYPE "MediaAssetVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('PENDING', 'ACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "storageKey" VARCHAR(512) NOT NULL,
    "bucket" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(120) NOT NULL,
    "byteSize" INTEGER,
    "checksumSha256" VARCHAR(128),
    "purpose" "MediaAssetPurpose" NOT NULL,
    "visibility" "MediaAssetVisibility" NOT NULL,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'PENDING',
    "projectId" TEXT,
    "userId" TEXT,
    "formId" TEXT,
    "submissionId" TEXT,
    "createdByActorType" VARCHAR(20),
    "createdByActorId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "accountDefaultsLogoAssetId" TEXT;
ALTER TABLE "Project" DROP COLUMN "logoUrl", ADD COLUMN "logoAssetId" TEXT;
ALTER TABLE "Testimonial"
    DROP COLUMN "authorAvatar",
    DROP COLUMN "videoUrl",
    DROP COLUMN "mediaUrl",
    ADD COLUMN "authorAvatarAssetId" TEXT,
    ADD COLUMN "videoAssetId" TEXT,
    ADD COLUMN "mediaAssetId" TEXT;
ALTER TABLE "ExportDelivery"
    DROP COLUMN "artifactContent",
    DROP COLUMN "artifactContentType",
    DROP COLUMN "artifactFilename",
    ADD COLUMN "artifactAssetId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");
CREATE INDEX "MediaAsset_projectId_purpose_idx" ON "MediaAsset"("projectId", "purpose");
CREATE INDEX "MediaAsset_userId_purpose_idx" ON "MediaAsset"("userId", "purpose");
CREATE INDEX "MediaAsset_status_createdAt_idx" ON "MediaAsset"("status", "createdAt");
CREATE INDEX "MediaAsset_visibility_status_idx" ON "MediaAsset"("visibility", "status");
CREATE INDEX "MediaAsset_formId_idx" ON "MediaAsset"("formId");
CREATE INDEX "MediaAsset_submissionId_idx" ON "MediaAsset"("submissionId");
CREATE UNIQUE INDEX "User_accountDefaultsLogoAssetId_key" ON "User"("accountDefaultsLogoAssetId");
CREATE UNIQUE INDEX "Project_logoAssetId_key" ON "Project"("logoAssetId");
CREATE UNIQUE INDEX "Testimonial_authorAvatarAssetId_key" ON "Testimonial"("authorAvatarAssetId");
CREATE UNIQUE INDEX "Testimonial_videoAssetId_key" ON "Testimonial"("videoAssetId");
CREATE UNIQUE INDEX "Testimonial_mediaAssetId_key" ON "Testimonial"("mediaAssetId");
CREATE INDEX "Testimonial_authorAvatarAssetId_idx" ON "Testimonial"("authorAvatarAssetId");
CREATE INDEX "Testimonial_videoAssetId_idx" ON "Testimonial"("videoAssetId");
CREATE INDEX "Testimonial_mediaAssetId_idx" ON "Testimonial"("mediaAssetId");
CREATE UNIQUE INDEX "ExportDelivery_artifactAssetId_key" ON "ExportDelivery"("artifactAssetId");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_formId_fkey" FOREIGN KEY ("formId") REFERENCES "CollectionForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CollectionFormSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_accountDefaultsLogoAssetId_fkey" FOREIGN KEY ("accountDefaultsLogoAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_authorAvatarAssetId_fkey" FOREIGN KEY ("authorAvatarAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExportDelivery" ADD CONSTRAINT "ExportDelivery_artifactAssetId_fkey" FOREIGN KEY ("artifactAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
