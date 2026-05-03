-- V1 organization foundation: local Clerk organization mirror and project tenancy.

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "clerkOrgId" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "organizationId" TEXT;

-- Backfill one deterministic legacy organization per current project owner.
INSERT INTO "Organization" (
    "id",
    "clerkOrgId",
    "name",
    "slug",
    "createdByUserId",
    "createdAt",
    "updatedAt"
)
SELECT
    'org_legacy_' || substr(md5("Project"."userId"), 1, 24),
    left('legacy_user_' || "Project"."userId", 255),
    left(COALESCE(NULLIF("User"."email", ''), 'Personal') || ' Workspace', 255),
    NULL,
    "Project"."userId",
    MIN("Project"."createdAt"),
    CURRENT_TIMESTAMP
FROM "Project"
LEFT JOIN "User" ON "User"."id" = "Project"."userId"
GROUP BY "Project"."userId", "User"."email";

UPDATE "Project"
SET "organizationId" = "Organization"."id"
FROM "Organization"
WHERE "Organization"."clerkOrgId" = left('legacy_user_' || "Project"."userId", 255)
  AND "Project"."organizationId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_clerkOrgId_key" ON "Organization"("clerkOrgId");
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");
CREATE INDEX "Organization_createdByUserId_idx" ON "Organization"("createdByUserId");
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
