-- WS-D review follow-up: a retried compose must not email every recipient a
-- second time. The key is content-addressed (project + form + recipients +
-- note + UTC day), so a same-day identical retry lands on the winner row.

-- AlterTable
ALTER TABLE "FormRequest" ADD COLUMN "idempotencyKey" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "FormRequest_idempotencyKey_key" ON "FormRequest"("idempotencyKey");
