ALTER TABLE "PublicSurfaceHost"
  ADD COLUMN "retiredAt" TIMESTAMP(3),
  ALTER COLUMN "projectId" DROP NOT NULL;

ALTER TABLE "PublicSurfaceHost"
  DROP CONSTRAINT "PublicSurfaceHost_projectId_fkey";

ALTER TABLE "PublicSurfaceHost"
  ADD CONSTRAINT "PublicSurfaceHost_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Widget"
  ADD COLUMN "isPrimaryWall" BOOLEAN DEFAULT false;
