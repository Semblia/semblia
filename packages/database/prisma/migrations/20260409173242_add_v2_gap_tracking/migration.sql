-- AlterTable
ALTER TABLE "NotificationPreferences" ADD COLUMN     "typePreferences" JSONB;

-- CreateTable
CREATE TABLE "ApiKeyDailyUsage" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "lastRequestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKeyDailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestimonialImpression" (
    "id" TEXT NOT NULL,
    "testimonialId" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "device" VARCHAR(32),
    "country" VARCHAR(8),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestimonialImpression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormImpression" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ipAddress" VARCHAR(255),
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormImpression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiKeyDailyUsage_date_idx" ON "ApiKeyDailyUsage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKeyDailyUsage_apiKeyId_date_key" ON "ApiKeyDailyUsage"("apiKeyId", "date");

-- CreateIndex
CREATE INDEX "TestimonialImpression_testimonialId_timestamp_idx" ON "TestimonialImpression"("testimonialId", "timestamp");

-- CreateIndex
CREATE INDEX "TestimonialImpression_projectId_timestamp_idx" ON "TestimonialImpression"("projectId", "timestamp");

-- CreateIndex
CREATE INDEX "TestimonialImpression_widgetId_timestamp_idx" ON "TestimonialImpression"("widgetId", "timestamp");

-- CreateIndex
CREATE INDEX "FormImpression_projectId_timestamp_idx" ON "FormImpression"("projectId", "timestamp");

-- AddForeignKey
ALTER TABLE "ApiKeyDailyUsage" ADD CONSTRAINT "ApiKeyDailyUsage_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialImpression" ADD CONSTRAINT "TestimonialImpression_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialImpression" ADD CONSTRAINT "TestimonialImpression_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialImpression" ADD CONSTRAINT "TestimonialImpression_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormImpression" ADD CONSTRAINT "FormImpression_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
