-- Media optimization pipeline: worker-generated derivative bookkeeping.
ALTER TABLE "MediaAsset" ADD COLUMN "derivatives" JSONB;
ALTER TABLE "MediaAsset" ADD COLUMN "optimizedAt" TIMESTAMP(3);
