-- Per-project email suppression: unsubscribing from one project's mail must not
-- silence another project the same recipient engaged with. The table is empty
-- at this point (created in 20260812120000 and unused pre-launch), so the new
-- NOT NULL column and swapped unique index apply without a backfill.

-- DropIndex
DROP INDEX "EmailSuppression_emailHash_key";

-- AlterTable
ALTER TABLE "EmailSuppression" ADD COLUMN "projectId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EmailSuppression_projectId_emailHash_key" ON "EmailSuppression"("projectId", "emailHash");
