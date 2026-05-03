-- CreateEnum
CREATE TYPE "TestimonialType" AS ENUM ('TEXT', 'VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'PAUSED', 'INCOMPLETE', 'TRIALING');

-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('SAAS_APP', 'PORTFOLIO', 'MOBILE_APP', 'CONSULTING_SERVICE', 'E_COMMERCE', 'AGENCY', 'FREELANCE', 'PRODUCT', 'COURSE', 'COMMUNITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_TESTIMONIAL', 'TESTIMONIAL_FLAGGED', 'TESTIMONIAL_APPROVED', 'TESTIMONIAL_REJECTED', 'SECURITY_ALERT');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('ERROR', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WidgetAlertType" AS ENUM ('LOAD_TIME_EXCEEDED', 'ERROR_RATE_EXCEEDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" VARCHAR(1000),
    "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
    "lastLogin" TIMESTAMP(3),
    "onboardingCompletedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "shortDescription" VARCHAR(500),
    "description" TEXT,
    "slug" VARCHAR(255) NOT NULL,
    "logoUrl" VARCHAR(1000),
    "projectType" "ProjectType" DEFAULT 'OTHER',
    "websiteUrl" VARCHAR(1000),
    "collectionFormUrl" VARCHAR(1000),
    "brandColorPrimary" VARCHAR(7),
    "brandColorSecondary" VARCHAR(7),
    "socialLinks" JSONB,
    "tags" TEXT[],
    "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoModeration" BOOLEAN NOT NULL DEFAULT true,
    "autoApproveVerified" BOOLEAN NOT NULL DEFAULT false,
    "profanityFilterLevel" TEXT DEFAULT 'MODERATE',
    "moderationSettings" JSONB,
    "formConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "interval" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "limits" JSONB NOT NULL,
    "razorpayPlanId" TEXT,
    "type" "UserPlan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "providerStatus" VARCHAR(32),
    "planId" TEXT,
    "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalSubscriptionId" TEXT,
    "externalCustomerId" TEXT,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "lastPaymentStatus" VARCHAR(32),
    "lastInvoiceStatus" VARCHAR(32),
    "lastWebhookEventId" VARCHAR(255),
    "lastWebhookEventType" VARCHAR(128),
    "lastWebhookAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER,
    "currency" TEXT DEFAULT 'INR',
    "interval" TEXT,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL DEFAULT 'razorpay',
    "externalPaymentId" VARCHAR(64),
    "externalInvoiceId" VARCHAR(64),
    "externalSubscriptionId" VARCHAR(64),
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "planId" TEXT,
    "paymentStatus" VARCHAR(32),
    "invoiceStatus" VARCHAR(32),
    "amount" INTEGER,
    "currency" VARCHAR(8),
    "eventType" VARCHAR(128) NOT NULL,
    "eventCreatedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "rawSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "providerEventId" VARCHAR(255) NOT NULL,
    "eventType" VARCHAR(128) NOT NULL,
    "subscriptionId" TEXT,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'processed',
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "authorName" VARCHAR(255) NOT NULL,
    "authorEmail" VARCHAR(255),
    "authorRole" VARCHAR(255),
    "authorCompany" VARCHAR(255),
    "authorAvatar" VARCHAR(1000),
    "content" TEXT NOT NULL,
    "type" "TestimonialType" NOT NULL DEFAULT 'TEXT',
    "videoUrl" TEXT,
    "mediaUrl" TEXT,
    "source" VARCHAR(100),
    "sourceUrl" VARCHAR(500),
    "oembedData" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "rating" SMALLINT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "isOAuthVerified" BOOLEAN NOT NULL DEFAULT false,
    "oauthProvider" VARCHAR(50),
    "oauthSubject" VARCHAR(255),
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderationScore" DOUBLE PRECISION,
    "moderationFlags" JSONB,
    "autoPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "keyHash" VARCHAR(255) NOT NULL,
    "keyPrefix" VARCHAR(20) NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "permissions" JSONB,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "usageLimit" INTEGER,
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailUsage" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastSnapshotCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enqueuedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadLetterJob" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "error" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "statusCode" INTEGER,
    "providerResponse" TEXT,
    "failedAt" TIMESTAMP(3) NOT NULL,
    "retried" BOOLEAN NOT NULL DEFAULT false,
    "retriedAt" TIMESTAMP(3),
    "retryHistory" JSONB,

    CONSTRAINT "DeadLetterJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobIdempotency" (
    "id" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "JobIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "requestBody" JSONB,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "requestId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertConfig" (
    "id" TEXT NOT NULL,
    "emailQuotaThreshold" INTEGER NOT NULL DEFAULT 80,
    "dlqCountThreshold" INTEGER NOT NULL DEFAULT 100,
    "failedJobRateThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertHistory" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "severity" "ErrorSeverity" NOT NULL,
    "errorType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "requestId" TEXT,
    "sentryEventId" TEXT,
    "userId" TEXT,
    "metadata" JSONB,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetAnalytics" (
    "id" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "loadTime" INTEGER NOT NULL,
    "layoutType" TEXT NOT NULL,
    "browser" TEXT,
    "device" TEXT,
    "country" TEXT,
    "errorCode" TEXT,
    "version" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WidgetAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetPerformanceAlert" (
    "id" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "alertType" "WidgetAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WidgetPerformanceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TestimonialTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_visibility_idx" ON "Project"("visibility");

-- CreateIndex
CREATE INDEX "Project_projectType_idx" ON "Project"("projectType");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_razorpayPlanId_key" ON "Plan"("razorpayPlanId");

-- CreateIndex
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_externalSubscriptionId_key" ON "Subscription"("externalSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_userId_externalSubscriptionId_idx" ON "Subscription"("userId", "externalSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_providerStatus_idx" ON "Subscription"("providerStatus");

-- CreateIndex
CREATE INDEX "Subscription_lastWebhookAt_idx" ON "Subscription"("lastWebhookAt");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_userId_createdAt_idx" ON "SubscriptionPayment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_subscriptionId_createdAt_idx" ON "SubscriptionPayment"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_planId_idx" ON "SubscriptionPayment"("planId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_paymentStatus_idx" ON "SubscriptionPayment"("paymentStatus");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_invoiceStatus_idx" ON "SubscriptionPayment"("invoiceStatus");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_eventType_eventCreatedAt_idx" ON "SubscriptionPayment"("eventType", "eventCreatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_provider_externalPaymentId_key" ON "SubscriptionPayment"("provider", "externalPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_provider_externalInvoiceId_key" ON "SubscriptionPayment"("provider", "externalInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_providerEventId_key" ON "PaymentWebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_provider_eventType_idx" ON "PaymentWebhookEvent"("provider", "eventType");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_subscriptionId_idx" ON "PaymentWebhookEvent"("subscriptionId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_receivedAt_idx" ON "PaymentWebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "Testimonial_userId_idx" ON "Testimonial"("userId");

-- CreateIndex
CREATE INDEX "Testimonial_projectId_idx" ON "Testimonial"("projectId");

-- CreateIndex
CREATE INDEX "Testimonial_isPublished_idx" ON "Testimonial"("isPublished");

-- CreateIndex
CREATE INDEX "Testimonial_createdAt_idx" ON "Testimonial"("createdAt");

-- CreateIndex
CREATE INDEX "Testimonial_isOAuthVerified_idx" ON "Testimonial"("isOAuthVerified");

-- CreateIndex
CREATE INDEX "Testimonial_projectId_isPublished_isApproved_createdAt_idx" ON "Testimonial"("projectId", "isPublished", "isApproved", "createdAt");

-- CreateIndex
CREATE INDEX "Testimonial_projectId_moderationStatus_createdAt_idx" ON "Testimonial"("projectId", "moderationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Testimonial_projectId_createdAt_idx" ON "Testimonial"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Testimonial_ipAddress_createdAt_idx" ON "Testimonial"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "Testimonial_ipAddress_projectId_createdAt_idx" ON "Testimonial"("ipAddress", "projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Testimonial_authorEmail_createdAt_idx" ON "Testimonial"("authorEmail", "createdAt");

-- CreateIndex
CREATE INDEX "Widget_projectId_idx" ON "Widget"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_projectId_idx" ON "ApiKey"("projectId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailUsage_date_key" ON "EmailUsage"("date");

-- CreateIndex
CREATE INDEX "EmailUsage_date_idx" ON "EmailUsage"("date");

-- CreateIndex
CREATE INDEX "NotificationOutbox_status_createdAt_idx" ON "NotificationOutbox"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationOutbox_notificationId_idx" ON "NotificationOutbox"("notificationId");

-- CreateIndex
CREATE INDEX "DeadLetterJob_queue_failedAt_idx" ON "DeadLetterJob"("queue", "failedAt");

-- CreateIndex
CREATE INDEX "DeadLetterJob_retried_idx" ON "DeadLetterJob"("retried");

-- CreateIndex
CREATE INDEX "DeadLetterJob_errorType_idx" ON "DeadLetterJob"("errorType");

-- CreateIndex
CREATE UNIQUE INDEX "JobIdempotency_jobKey_key" ON "JobIdempotency"("jobKey");

-- CreateIndex
CREATE INDEX "JobIdempotency_jobKey_status_idx" ON "JobIdempotency"("jobKey", "status");

-- CreateIndex
CREATE INDEX "JobIdempotency_createdAt_idx" ON "JobIdempotency"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_createdAt_idx" ON "AuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- CreateIndex
CREATE INDEX "SystemSettings_key_idx" ON "SystemSettings"("key");

-- CreateIndex
CREATE INDEX "AlertHistory_alertType_createdAt_idx" ON "AlertHistory"("alertType", "createdAt");

-- CreateIndex
CREATE INDEX "AlertHistory_resolved_idx" ON "AlertHistory"("resolved");

-- CreateIndex
CREATE INDEX "AlertHistory_createdAt_idx" ON "AlertHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ErrorLog_severity_createdAt_idx" ON "ErrorLog"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "ErrorLog_errorType_idx" ON "ErrorLog"("errorType");

-- CreateIndex
CREATE INDEX "ErrorLog_requestId_idx" ON "ErrorLog"("requestId");

-- CreateIndex
CREATE INDEX "ErrorLog_sentryEventId_idx" ON "ErrorLog"("sentryEventId");

-- CreateIndex
CREATE INDEX "ErrorLog_archived_createdAt_idx" ON "ErrorLog"("archived", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE INDEX "WidgetAnalytics_widgetId_timestamp_idx" ON "WidgetAnalytics"("widgetId", "timestamp");

-- CreateIndex
CREATE INDEX "WidgetAnalytics_projectId_timestamp_idx" ON "WidgetAnalytics"("projectId", "timestamp");

-- CreateIndex
CREATE INDEX "WidgetAnalytics_timestamp_idx" ON "WidgetAnalytics"("timestamp");

-- CreateIndex
CREATE INDEX "WidgetAnalytics_errorCode_idx" ON "WidgetAnalytics"("errorCode");

-- CreateIndex
CREATE INDEX "WidgetPerformanceAlert_widgetId_createdAt_idx" ON "WidgetPerformanceAlert"("widgetId", "createdAt");

-- CreateIndex
CREATE INDEX "WidgetPerformanceAlert_projectId_createdAt_idx" ON "WidgetPerformanceAlert"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "WidgetPerformanceAlert_resolved_idx" ON "WidgetPerformanceAlert"("resolved");

-- CreateIndex
CREATE INDEX "WidgetPerformanceAlert_widgetId_resolved_alertType_createdA_idx" ON "WidgetPerformanceAlert"("widgetId", "resolved", "alertType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_TestimonialTags_AB_unique" ON "_TestimonialTags"("A", "B");

-- CreateIndex
CREATE INDEX "_TestimonialTags_B_index" ON "_TestimonialTags"("B");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TestimonialTags" ADD CONSTRAINT "_TestimonialTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TestimonialTags" ADD CONSTRAINT "_TestimonialTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Testimonial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
