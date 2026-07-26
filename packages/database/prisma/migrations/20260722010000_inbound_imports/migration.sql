CREATE TYPE "FormResponseOrigin" AS ENUM ('FORM', 'IMPORT');
CREATE TYPE "ImportMode" AS ENUM ('SPREADSHEET', 'MANUAL', 'PUBLIC_URL', 'CONNECTED_API', 'MIGRATION');
CREATE TYPE "ImportJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');
CREATE TYPE "ImportItemResult" AS ENUM ('IMPORTED', 'DUPLICATE', 'SKIPPED', 'FAILED');
CREATE TYPE "ImportConnectionAuthStrategy" AS ENUM ('CLERK_OAUTH', 'PUBLIC_URL');

ALTER TABLE "FormResponse"
  ADD COLUMN "origin" "FormResponseOrigin" NOT NULL DEFAULT 'FORM',
  ALTER COLUMN "formId" DROP NOT NULL,
  ALTER COLUMN "versionId" DROP NOT NULL,
  ALTER COLUMN "version" DROP NOT NULL;

ALTER TABLE "FormResponse"
  DROP CONSTRAINT "FormResponse_formId_fkey",
  DROP CONSTRAINT "FormResponse_versionId_fkey";

ALTER TABLE "FormResponse"
  ADD CONSTRAINT "FormResponse_formId_fkey"
    FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FormResponse_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "FormVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FormResponse"
  ADD CONSTRAINT "FormResponse_origin_provenance_check"
  CHECK (
    (
      "origin" = 'FORM'
      AND "trustMode" IN ('ORIGIN', 'HMAC')
      AND "formId" IS NOT NULL
      AND "versionId" IS NOT NULL
      AND "version" IS NOT NULL
    )
    OR (
      "origin" = 'IMPORT'
      AND "trustMode" = 'IMPORT'
      AND "formId" IS NULL
      AND "versionId" IS NULL
      AND "version" IS NULL
    )
  ) NOT VALID;

ALTER TABLE "FormResponse"
  VALIDATE CONSTRAINT "FormResponse_origin_provenance_check";

CREATE TABLE "ImportConnection" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sourceKey" VARCHAR(120) NOT NULL,
  "authStrategy" "ImportConnectionAuthStrategy" NOT NULL,
  "connectedByUserId" TEXT,
  "clerkProvider" VARCHAR(120),
  "externalAccountId" VARCHAR(255),
  "publicUrl" VARCHAR(1000),
  "requestedScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "config" JSONB,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
  "cursor" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "lastErrorCode" VARCHAR(120),
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportJob" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "mode" "ImportMode" NOT NULL,
  "sourceKey" VARCHAR(120) NOT NULL,
  "status" "ImportJobStatus" NOT NULL DEFAULT 'QUEUED',
  "config" JSONB,
  "mediaAssetId" TEXT,
  "connectionId" TEXT,
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "importedCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCode" VARCHAR(120),
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportItem" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "rowIndex" INTEGER NOT NULL,
  "result" "ImportItemResult" NOT NULL,
  "sourceUrl" VARCHAR(1000),
  "externalIdHash" VARCHAR(64),
  "responseId" TEXT,
  "errorCode" VARCHAR(120),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResponseImportIdentity" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sourceKey" VARCHAR(120) NOT NULL,
  "externalIdHash" VARCHAR(64) NOT NULL,
  "responseId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResponseImportIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImportJob_mediaAssetId_key" ON "ImportJob"("mediaAssetId");
CREATE INDEX "ImportConnection_projectId_sourceKey_idx" ON "ImportConnection"("projectId", "sourceKey");
CREATE INDEX "ImportConnection_projectId_enabled_idx" ON "ImportConnection"("projectId", "enabled");
CREATE INDEX "ImportConnection_connectedByUserId_idx" ON "ImportConnection"("connectedByUserId");
CREATE INDEX "ImportJob_projectId_createdAt_idx" ON "ImportJob"("projectId", "createdAt");
CREATE INDEX "ImportJob_projectId_status_createdAt_idx" ON "ImportJob"("projectId", "status", "createdAt");
CREATE INDEX "ImportJob_connectionId_createdAt_idx" ON "ImportJob"("connectionId", "createdAt");
CREATE UNIQUE INDEX "ImportJob_one_active_connection_job_key"
  ON "ImportJob"("connectionId")
  WHERE "connectionId" IS NOT NULL
    AND "status" IN ('QUEUED'::"ImportJobStatus", 'RUNNING'::"ImportJobStatus", 'FAILED'::"ImportJobStatus");
CREATE INDEX "ImportJob_actorUserId_idx" ON "ImportJob"("actorUserId");
CREATE INDEX "ImportItem_jobId_result_idx" ON "ImportItem"("jobId", "result");
CREATE INDEX "ImportItem_responseId_idx" ON "ImportItem"("responseId");
CREATE UNIQUE INDEX "ImportItem_jobId_rowIndex_key" ON "ImportItem"("jobId", "rowIndex");
CREATE UNIQUE INDEX "ResponseImportIdentity_responseId_key" ON "ResponseImportIdentity"("responseId");
CREATE UNIQUE INDEX "ResponseImportIdentity_projectId_sourceKey_externalIdHash_key" ON "ResponseImportIdentity"("projectId", "sourceKey", "externalIdHash");

ALTER TABLE "ImportConnection"
  ADD CONSTRAINT "ImportConnection_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ImportConnection_connectedByUserId_fkey"
    FOREIGN KEY ("connectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImportJob"
  ADD CONSTRAINT "ImportJob_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ImportJob_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ImportJob_mediaAssetId_fkey"
    FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ImportJob_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "ImportConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImportItem"
  ADD CONSTRAINT "ImportItem_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ImportItem_responseId_fkey"
    FOREIGN KEY ("responseId") REFERENCES "FormResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResponseImportIdentity"
  ADD CONSTRAINT "ResponseImportIdentity_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ResponseImportIdentity_responseId_fkey"
    FOREIGN KEY ("responseId") REFERENCES "FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
