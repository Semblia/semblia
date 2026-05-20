-- CreateEnum
CREATE TYPE "PaymentMethodBrand" AS ENUM ('VISA', 'MASTERCARD', 'RUPAY', 'AMEX');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'OPEN', 'VOID');

-- AlterEnum
ALTER TYPE "UserPlan" ADD VALUE 'BUSINESS';

-- AlterTable
ALTER TABLE "ProjectMemberInvite" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '14 days');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "razorpaySubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brand" "PaymentMethodBrand" NOT NULL,
    "last4" VARCHAR(4) NOT NULL,
    "expMonth" INTEGER NOT NULL,
    "expYear" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "razorpayTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "number" VARCHAR(120) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "InvoiceStatus" NOT NULL,
    "planName" VARCHAR(255) NOT NULL,
    "razorpayInvoiceId" TEXT,
    "downloadUrl" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL DEFAULT '',
    "line1" VARCHAR(500) NOT NULL DEFAULT '',
    "line2" VARCHAR(500),
    "city" VARCHAR(255) NOT NULL DEFAULT '',
    "state" VARCHAR(255) NOT NULL DEFAULT '',
    "postalCode" VARCHAR(32) NOT NULL DEFAULT '',
    "country" VARCHAR(2) NOT NULL DEFAULT 'IN',
    "gstin" VARCHAR(32),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_razorpayTokenId_key" ON "PaymentMethod"("razorpayTokenId");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_isDefault_idx" ON "PaymentMethod"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_razorpayInvoiceId_key" ON "Invoice"("razorpayInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_userId_issuedAt_idx" ON "Invoice"("userId", "issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingProfile_userId_key" ON "BillingProfile"("userId");

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "CollectionFormSubmission_projectId_moderationStatus_createdAt_i" RENAME TO "CollectionFormSubmission_projectId_moderationStatus_created_idx";

-- RenameIndex
ALTER INDEX "TestimonialDisplayRevision_suggestedByActorType_suggestedByActo" RENAME TO "TestimonialDisplayRevision_suggestedByActorType_suggestedBy_idx";
