-- Base V2: first-class collection forms and typed widget columns.

-- CreateEnum
CREATE TYPE "WidgetType" AS ENUM ('EMBED', 'WALL_OF_LOVE');

-- CreateEnum
CREATE TYPE "LayoutType" AS ENUM ('CAROUSEL', 'GRID', 'MASONRY', 'LIST', 'WALL');

-- CreateEnum
CREATE TYPE "ThemeMode" AS ENUM ('LIGHT', 'DARK', 'AUTO');

-- CreateEnum
CREATE TYPE "CardStyle" AS ENUM ('SHADOW', 'BORDERED', 'FLAT', 'ELEVATED');

-- CreateEnum
CREATE TYPE "WidgetDensity" AS ENUM ('COMPACT', 'DEFAULT', 'COZY');

-- AlterTable: Widget typed columns used by web_v2.
ALTER TABLE "Widget" ADD COLUMN "name" VARCHAR(255) NOT NULL DEFAULT 'Untitled widget';
ALTER TABLE "Widget" ADD COLUMN "widgetType" "WidgetType" NOT NULL DEFAULT 'EMBED';
ALTER TABLE "Widget" ADD COLUMN "layoutType" "LayoutType" NOT NULL DEFAULT 'CAROUSEL';
ALTER TABLE "Widget" ADD COLUMN "themeMode" "ThemeMode" NOT NULL DEFAULT 'LIGHT';
ALTER TABLE "Widget" ADD COLUMN "preset" VARCHAR(64) NOT NULL DEFAULT 'clean';
ALTER TABLE "Widget" ADD COLUMN "accentColor" VARCHAR(32);
ALTER TABLE "Widget" ADD COLUMN "bgColor" VARCHAR(32);
ALTER TABLE "Widget" ADD COLUMN "textColor" VARCHAR(32);
ALTER TABLE "Widget" ADD COLUMN "borderRadius" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "Widget" ADD COLUMN "fontFamily" VARCHAR(64) NOT NULL DEFAULT 'inter';
ALTER TABLE "Widget" ADD COLUMN "cardStyle" "CardStyle" NOT NULL DEFAULT 'SHADOW';
ALTER TABLE "Widget" ADD COLUMN "density" "WidgetDensity" NOT NULL DEFAULT 'DEFAULT';
ALTER TABLE "Widget" ADD COLUMN "showRating" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Widget" ADD COLUMN "showAvatar" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Widget" ADD COLUMN "showCompany" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Widget" ADD COLUMN "showDate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Widget" ADD COLUMN "showSource" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Widget" ADD COLUMN "maxItems" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Widget" ADD COLUMN "autoRotate" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Widget" ADD COLUMN "rotateInterval" INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE "Widget" ADD COLUMN "showBranding" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Widget" ADD COLUMN "wallSlug" VARCHAR(255);
ALTER TABLE "Widget" ADD COLUMN "wallTitle" VARCHAR(500);
ALTER TABLE "Widget" ADD COLUMN "wallSubhead" TEXT;
ALTER TABLE "Widget" ALTER COLUMN "config" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CollectionForm" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL DEFAULT 'Default Form',
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "abWeight" INTEGER NOT NULL DEFAULT 100,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionForm_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN "formId" TEXT;
ALTER TABLE "FormImpression" ADD COLUMN "formId" TEXT;

-- Backfill one default form per existing project from the legacy Project.formConfig.
INSERT INTO "CollectionForm" (
    "id",
    "projectId",
    "name",
    "description",
    "isActive",
    "abWeight",
    "config",
    "createdAt",
    "updatedAt"
)
SELECT
    'form_' || "Project"."id",
    "Project"."id",
    'Default Form',
    'Primary testimonial collection form',
    true,
    100,
    COALESCE(
      "Project"."formConfig",
      jsonb_build_object(
        'headline', 'How was your experience?',
        'subhead', 'We''d love to hear your story.',
        'questions', jsonb_build_array(),
        'preset', 'legacy'
      )
    ),
    "Project"."createdAt",
    "Project"."updatedAt"
FROM "Project";

UPDATE "Testimonial"
SET "formId" = 'form_' || "projectId"
WHERE "projectId" IS NOT NULL AND "formId" IS NULL;

UPDATE "FormImpression"
SET "formId" = 'form_' || "projectId"
WHERE "projectId" IS NOT NULL AND "formId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Widget_wallSlug_key" ON "Widget"("wallSlug");
CREATE INDEX "Widget_wallSlug_idx" ON "Widget"("wallSlug");
CREATE INDEX "CollectionForm_projectId_idx" ON "CollectionForm"("projectId");
CREATE INDEX "CollectionForm_projectId_isActive_idx" ON "CollectionForm"("projectId", "isActive");
CREATE INDEX "Testimonial_formId_idx" ON "Testimonial"("formId");
CREATE INDEX "FormImpression_formId_timestamp_idx" ON "FormImpression"("formId", "timestamp");

-- AddForeignKey
ALTER TABLE "CollectionForm" ADD CONSTRAINT "CollectionForm_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_formId_fkey" FOREIGN KEY ("formId") REFERENCES "CollectionForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormImpression" ADD CONSTRAINT "FormImpression_formId_fkey" FOREIGN KEY ("formId") REFERENCES "CollectionForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
