-- Add stable project-scoped slugs for hosted collection form paths.
ALTER TABLE "CollectionForm" ADD COLUMN "slug" VARCHAR(255);

-- Existing records receive their id as a stable, collision-free path token.
UPDATE "CollectionForm"
SET "slug" = "id"
WHERE "slug" IS NULL;

CREATE UNIQUE INDEX "CollectionForm_projectId_slug_key" ON "CollectionForm"("projectId", "slug");

-- Backfill the default hosted forms runtime host for existing projects.
INSERT INTO "PublicSurfaceHost" (
  "id",
  "projectId",
  "feature",
  "resourceType",
  "hostname",
  "isDefault",
  "status",
  "verifiedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  "Project"."id" || '_collect_host',
  "Project"."id",
  'COLLECTION',
  'PROJECT',
  "Project"."slug" || '.collect.semblia.com',
  true,
  'ACTIVE',
  NOW(),
  NOW(),
  NOW()
FROM "Project"
ON CONFLICT ("hostname") DO NOTHING;
