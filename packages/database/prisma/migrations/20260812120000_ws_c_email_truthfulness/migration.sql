-- AlterEnum
ALTER TYPE "EmailTemplateKey" ADD VALUE 'RESPONSE_PUBLISHED';

-- CreateEnum
CREATE TYPE "EmailSuppressionReason" AS ENUM ('DELIVERY_DISABLED', 'RECIPIENT_SUPPRESSED');

-- AlterTable
ALTER TABLE "EmailDelivery"
  ALTER COLUMN "payload" DROP NOT NULL,
  ADD COLUMN "suppressionReason" "EmailSuppressionReason";

-- CreateTable
CREATE TABLE "EmailSuppression" (
  "id" TEXT NOT NULL,
  "emailHash" VARCHAR(64) NOT NULL,
  "reason" "EmailSuppressionReason" NOT NULL,
  "sourceDeliveryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailSuppression_emailHash_key" ON "EmailSuppression"("emailHash");

-- CreateIndex
CREATE INDEX "EmailSuppression_sourceDeliveryId_idx" ON "EmailSuppression"("sourceDeliveryId");

-- AddForeignKey
ALTER TABLE "EmailSuppression"
  ADD CONSTRAINT "EmailSuppression_sourceDeliveryId_fkey"
  FOREIGN KEY ("sourceDeliveryId") REFERENCES "EmailDelivery"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
