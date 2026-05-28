CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'ENQUEUED', 'SENDING', 'SENT', 'FAILED', 'EXHAUSTED', 'SUPPRESSED');

CREATE TYPE "EmailTemplateKey" AS ENUM ('NOTIFICATION', 'PROJECT_MEMBER_INVITE');

CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "notificationId" TEXT,
    "projectId" TEXT,
    "recipientEmail" VARCHAR(320) NOT NULL,
    "recipientName" VARCHAR(255),
    "template" "EmailTemplateKey" NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "provider" VARCHAR(40) NOT NULL DEFAULT 'resend',
    "providerMessageId" VARCHAR(255),
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "providerError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailDelivery_idempotencyKey_key" ON "EmailDelivery"("idempotencyKey");
CREATE INDEX "EmailDelivery_status_nextAttemptAt_createdAt_idx" ON "EmailDelivery"("status", "nextAttemptAt", "createdAt");
CREATE INDEX "EmailDelivery_userId_createdAt_idx" ON "EmailDelivery"("userId", "createdAt");
CREATE INDEX "EmailDelivery_notificationId_idx" ON "EmailDelivery"("notificationId");
CREATE INDEX "EmailDelivery_projectId_createdAt_idx" ON "EmailDelivery"("projectId", "createdAt");
CREATE INDEX "EmailDelivery_recipientEmail_createdAt_idx" ON "EmailDelivery"("recipientEmail", "createdAt");
