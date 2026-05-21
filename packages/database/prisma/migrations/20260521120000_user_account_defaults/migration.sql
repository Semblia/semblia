-- Add a nullable per-user defaults document for new-project prefill settings.
ALTER TABLE "User" ADD COLUMN "defaults" JSONB;
