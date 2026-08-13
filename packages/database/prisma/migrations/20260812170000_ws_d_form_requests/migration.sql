-- WS-D: request a testimonial. One FormRequest per compose action, one
-- recipient row per address. Delivery state is not mirrored onto recipient
-- rows — each links to its EmailDelivery and state is read live.

-- AlterEnum
ALTER TYPE "EmailTemplateKey" ADD VALUE 'FORM_REQUEST';

-- CreateTable
CREATE TABLE "FormRequest" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FormRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormRequestRecipient" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "emailHash" VARCHAR(128) NOT NULL,
  "emailDeliveryId" TEXT,
  "submittedAt" TIMESTAMP(3),
  "submittedResponseId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FormRequestRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormRequest_projectId_createdAt_idx" ON "FormRequest"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "FormRequest_formId_createdAt_idx" ON "FormRequest"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "FormRequest_createdByUserId_idx" ON "FormRequest"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "FormRequestRecipient_emailDeliveryId_key" ON "FormRequestRecipient"("emailDeliveryId");

-- CreateIndex
CREATE INDEX "FormRequestRecipient_formId_emailHash_idx" ON "FormRequestRecipient"("formId", "emailHash");

-- CreateIndex
CREATE INDEX "FormRequestRecipient_projectId_emailHash_idx" ON "FormRequestRecipient"("projectId", "emailHash");

-- CreateIndex
CREATE INDEX "FormRequestRecipient_submittedResponseId_idx" ON "FormRequestRecipient"("submittedResponseId");

-- CreateIndex
CREATE UNIQUE INDEX "FormRequestRecipient_requestId_emailHash_key" ON "FormRequestRecipient"("requestId", "emailHash");

-- AddForeignKey
ALTER TABLE "FormRequest" ADD CONSTRAINT "FormRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRequest" ADD CONSTRAINT "FormRequest_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRequest" ADD CONSTRAINT "FormRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRequestRecipient" ADD CONSTRAINT "FormRequestRecipient_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FormRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRequestRecipient" ADD CONSTRAINT "FormRequestRecipient_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRequestRecipient" ADD CONSTRAINT "FormRequestRecipient_emailDeliveryId_fkey" FOREIGN KEY ("emailDeliveryId") REFERENCES "EmailDelivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRequestRecipient" ADD CONSTRAINT "FormRequestRecipient_submittedResponseId_fkey" FOREIGN KEY ("submittedResponseId") REFERENCES "FormResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
