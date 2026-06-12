# Semblia v2 API Discovery Dossier

## 1. Current State Inventory

### `packages/database`
- `packages/database/prisma/schema.prisma` - current source of truth for Prisma models, enums, and relations.

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

// Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?
// Try Prisma Accelerate: https://pris.ly/cli/accelerate-init

generator client {
  provider      = "prisma-client-js"
  output        = "../src/generated/prisma"
  engineType    = "binary"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
}

model User {
  id        String  @id @default(cuid()) // Clerk user Id
  email     String  @unique
  firstName String?
  lastName  String?
  avatar    String? @db.VarChar(1000) // Avatar URL from Azure Blob Storage

  plan                 UserPlan              @default(FREE)
  projects             Project[]
  testimonials         Testimonial[]
  apiKeys              ApiKey[]
  subscription         Subscription? // null for free tier users
  subscriptionPayments SubscriptionPayment[]

  // Notification system relations
  notifications           Notification[]
  notificationPreferences NotificationPreferences?

  // Admin tracking
  lastLogin DateTime?
  onboardingCompletedAt DateTime? @default(now())

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Project {
  id                  String            @id @default(cuid())
  userId              String
  name                String            @db.VarChar(255)
  shortDescription    String?           @db.VarChar(500)
  description         String?           @db.Text
  slug                String            @unique @db.VarChar(255)
  logoUrl             String?           @db.VarChar(1000)
  projectType         ProjectType?      @default(OTHER)
  websiteUrl          String?           @db.VarChar(1000)
  collectionFormUrl   String?           @db.VarChar(1000)
  brandColorPrimary   String?           @db.VarChar(7) // Hex color code
  brandColorSecondary String?           @db.VarChar(7) // Hex color code
  socialLinks         Json? // { twitter: "...", linkedin: "...", github: "..." }
  tags                String[] // Array of tags for internal categorization
  visibility          ProjectVisibility @default(PRIVATE)
  isActive            Boolean           @default(true)

  // Auto-Moderation Settings
  autoModeration       Boolean @default(true) // Enable auto-moderation
  autoApproveVerified  Boolean @default(false) // Auto-approve verified users
  profanityFilterLevel String? @default("MODERATE") // STRICT, MODERATE, LENIENT
  moderationSettings   Json? // Custom moderation rules

  // Collection Form Configuration
  // {
  //   headerTitle,
  //   headerDescription,
  //   thankYouMessage,
  //   enableRating,
  //   enableJobTitle,
  //   enableCompany,
  //   enableAvatar,
  //   enableVideoUrl,
  //   enableGoogleVerification,
  //   requireRating,
  //   requireJobTitle,
  //   requireCompany,
  //   requireAvatar,
  //   requireVideoUrl,
  //   requireGoogleVerification,
  //   allowAnonymousSubmissions,
  //   notifyOnSubmission
  // }
  formConfig Json?

  testimonials Testimonial[]
  widgets      Widget[]
  collectionForms CollectionForm[]
  apiKeys      ApiKey[]
  formImpressions        FormImpression[]
  testimonialImpressions TestimonialImpression[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([visibility])
  @@index([projectType])
}

model Plan {
  id             String   @id @default(cuid())
  name           String   @db.VarChar(255) // e.g., "Pro Plan", "Starter"
  description    String?  @db.Text
  price          Int // Amount in smallest currency unit (e.g., paise)
  currency       String   @default("INR") @db.VarChar(3)
  interval       String // "month", "year"
  isActive       Boolean  @default(true)
  limits         Json // { "projects": 5, "teamMembers": 2 }
  razorpayPlanId String?  @unique // ID from Razorpay
  type           UserPlan @default(FREE) // Mapping to enum for code compatibility

  subscriptions        Subscription[]
  subscriptionPayments SubscriptionPayment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isActive])
}

model Subscription {
  id     String             @id @default(cuid())
  userId String             @unique
  status SubscriptionStatus // e.g., "active", "canceled", etc.

  // Mirror of provider lifecycle states (Razorpay)
  // Expected values: created, authenticated, active, pending, halted, paused, cancelled, completed, expired
  providerStatus String? @db.VarChar(32)

  // Relations
  planId String?
  plan   Plan?   @relation(fields: [planId], references: [id])

  // Legacy/Code Enum fallback (optional, but good to keep synced)
  userPlan UserPlan @default(FREE) @map("plan")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  externalSubscriptionId String? @unique // Razorpay Subscription ID
  externalCustomerId     String? // Razorpay Customer ID (optional)

  // Razorpay Specifics
  razorpayOrderId      String?
  razorpayPaymentId    String?
  razorpaySignature    String?
  lastPaymentStatus    String?   @db.VarChar(32)
  lastInvoiceStatus    String?   @db.VarChar(32)
  lastWebhookEventId   String?   @db.VarChar(255)
  lastWebhookEventType String?   @db.VarChar(128)
  lastWebhookAt        DateTime?

  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  cancelAtPeriodEnd  Boolean   @default(false)

  // Snapshot of price at time of subscription
  amount   Int? // Amount in smallest currency units
  currency String? @default("INR")
  interval String? // "month", "year"

  user     User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments SubscriptionPayment[]

  @@index([userId])
  @@index([userId, externalSubscriptionId])
  @@index([planId])
  @@index([status])
  @@index([providerStatus])
  @@index([lastWebhookAt])
}

model SubscriptionPayment {
  id                     String    @id @default(cuid())
  provider               String    @default("razorpay") @db.VarChar(32)
  externalPaymentId      String?   @db.VarChar(64)
  externalInvoiceId      String?   @db.VarChar(64)
  externalSubscriptionId String?   @db.VarChar(64)
  userId                 String
  subscriptionId         String
  planId                 String?
  paymentStatus          String?   @db.VarChar(32)
  invoiceStatus          String?   @db.VarChar(32)
  amount                 Int?
  currency               String?   @db.VarChar(8)
  eventType              String    @db.VarChar(128)
  eventCreatedAt         DateTime?
  paidAt                 DateTime?
  failedAt               DateTime?
  rawSnapshot            Json?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  plan         Plan?        @relation(fields: [planId], references: [id], onDelete: SetNull)

  @@unique([provider, externalPaymentId])
  @@unique([provider, externalInvoiceId])
  @@index([userId, createdAt])
  @@index([subscriptionId, createdAt])
  @@index([planId])
  @@index([paymentStatus])
  @@index([invoiceStatus])
  @@index([eventType, eventCreatedAt])
}

model PaymentWebhookEvent {
  id              String    @id @default(cuid())
  provider        String    @db.VarChar(32)
  providerEventId String    @unique @db.VarChar(255)
  eventType       String    @db.VarChar(128)
  subscriptionId  String?
  payload         Json
  status          String    @default("processed") @db.VarChar(32)
  error           String?   @db.Text
  receivedAt      DateTime  @default(now())
  processedAt     DateTime?

  @@index([provider, eventType])
  @@index([subscriptionId])
  @@index([receivedAt])
}

model Testimonial {
  id            String          @id @default(cuid())
  userId        String?
  projectId     String?
  formId        String?
  authorName    String          @db.VarChar(255)
  authorEmail   String?         @db.VarChar(255)
  authorRole    String?         @db.VarChar(255) // e.g., "CEO", "Marketing Manager"
  authorCompany String?         @db.VarChar(255) // e.g., "Acme Inc."
  authorAvatar  String?         @db.VarChar(1000) // Avatar URL from Azure Blob Storage
  content       String          @db.Text
  type          TestimonialType @default(TEXT)
  videoUrl      String?
  mediaUrl      String?
  source        String?         @db.VarChar(100) // e.g., "manual", "twitter", etc.
  sourceUrl     String?         @db.VarChar(500) // e.g., URL of the tweet if sourced from Twitter
  oembedData    Json? // Store oEmbed (Extracted Embed Info)
  isPublished   Boolean         @default(false)
  rating        Int?            @db.SmallInt // e.g., 1 to 5 stars
  isApproved    Boolean         @default(false) // For moderation purposes
  ipAddress     String?         @db.VarChar(45) // To store IPv6 addresses if needed
  userAgent     String?         @db.Text // To store user agent string if needed

  // OAuth Verification
  isOAuthVerified Boolean @default(false) // True if verified via OAuth
  oauthProvider   String? @db.VarChar(50) // e.g., "google", "github"
  oauthSubject    String? @db.VarChar(255) // OAuth subject/user ID for verification

  // Auto-Moderation
  moderationStatus ModerationStatus @default(PENDING)
  moderationScore  Float? // 0-1, higher = more likely spam
  moderationFlags  Json? // Array of detected issues
  autoPublished    Boolean          @default(false) // True if auto-approved by moderation

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  User    User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  Project Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  collectionForm CollectionForm? @relation(fields: [formId], references: [id], onDelete: SetNull)
  tags    Tag[]    @relation("TestimonialTags")
  impressions TestimonialImpression[]

  @@index([userId])
  @@index([projectId])
  @@index([formId])
  @@index([isPublished])
  @@index([createdAt])
  @@index([isOAuthVerified])
  // Composite indexes for common query patterns
  @@index([projectId, isPublished, isApproved, createdAt]) // Public widget embed + API-key listing
  @@index([projectId, moderationStatus, createdAt]) // Moderation queue + admin filtering
  @@index([projectId, createdAt]) // Paginated list ordered by date
  @@index([ipAddress, createdAt]) // IP velocity check (moderation)
  @@index([ipAddress, projectId, createdAt]) // IP+project velocity (moderation)
  @@index([authorEmail, createdAt]) // Email velocity + privacy queries
}

model CollectionForm {
  id          String  @id @default(cuid())
  projectId   String
  name        String  @default("Default Form") @db.VarChar(255)
  description String  @default("") @db.VarChar(500)
  isActive    Boolean @default(true)
  abWeight    Int     @default(100)
  config      Json

  project      Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  testimonials Testimonial[]
  impressions  FormImpression[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId])
  @@index([projectId, isActive])
}

enum TestimonialType {
  TEXT
  VIDEO
  AUDIO
}

enum ModerationStatus {
  PENDING
  APPROVED
  REJECTED
  FLAGGED
}

enum WidgetType {
  EMBED
  WALL_OF_LOVE
}

enum LayoutType {
  CAROUSEL
  GRID
  MASONRY
  LIST
  WALL
}

enum ThemeMode {
  LIGHT
  DARK
  AUTO
}

enum CardStyle {
  SHADOW
  BORDERED
  FLAT
  ELEVATED
}

enum WidgetDensity {
  COMPACT
  DEFAULT
  COZY
}

model Widget {
  id        String @id @default(cuid())
  projectId String?
  name      String @default("Untitled widget") @db.VarChar(255)

  // ─── Type & Layout ───────────────────────────────────
  widgetType WidgetType    @default(EMBED)
  layoutType LayoutType    @default(CAROUSEL)
  themeMode  ThemeMode     @default(LIGHT)

  // ─── Design tokens (preset-driven, user-tweakable) ──
  preset       String        @default("clean") @db.VarChar(64)
  accentColor  String?       @db.VarChar(32)
  bgColor      String?       @db.VarChar(32)
  textColor    String?       @db.VarChar(32)
  borderRadius Int           @default(12)
  fontFamily   String        @default("inter") @db.VarChar(64)
  cardStyle    CardStyle     @default(SHADOW)
  density      WidgetDensity @default(DEFAULT)

  // ─── Content visibility ─────────────────────────────
  showRating  Boolean @default(true)
  showAvatar  Boolean @default(true)
  showCompany Boolean @default(true)
  showDate    Boolean @default(false)
  showSource  Boolean @default(false)

  // ─── Behavior ───────────────────────────────────────
  maxItems       Int     @default(10)
  autoRotate     Boolean @default(true)
  rotateInterval Int     @default(5000)
  showBranding   Boolean @default(true)

  // ─── Wall of Love specific ──────────────────────────
  wallSlug    String? @unique @db.VarChar(255)
  wallTitle   String? @db.VarChar(500)
  wallSubhead String? @db.Text

  // ─── Legacy (kept for migration, nullable now) ──────
  config Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  Project     Project?                @relation(fields: [projectId], references: [id], onDelete: Cascade)
  impressions TestimonialImpression[]

  @@index([projectId])
  @@index([wallSlug])
}

model ApiKey {
  id        String @id @default(cuid())
  name      String @db.VarChar(255) // e.g., "Production Widget Key", "Development Key"
  keyHash   String @unique @db.VarChar(255) // Hashed API key (bcrypt)
  keyPrefix String @db.VarChar(20) // Visible prefix for identification (e.g., "semblia_live_abcd1234")

  // Relations
  userId    String
  projectId String

  // Permissions & Limits
  permissions Json? // { widgets: true, testimonials: false, analytics: false }
  usageCount  Int   @default(0) // Total number of requests
  usageLimit  Int? // Maximum allowed requests (null = unlimited)
  rateLimit   Int   @default(100) // Requests per hour

  // Status & Lifecycle
  isActive   Boolean   @default(true)
  lastUsedAt DateTime?
  expiresAt  DateTime? // null = never expires

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  dailyUsage ApiKeyDailyUsage[]

  @@index([userId])
  @@index([projectId])
  @@index([keyHash])
  @@index([isActive])
}

model Tag {
  id           String        @id @default(cuid())
  name         String        @unique
  testimonials Testimonial[] @relation("TestimonialTags")
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  PAUSED
  INCOMPLETE
  TRIALING
}

enum UserPlan {
  FREE
  PRO
}

enum ProjectType {
  SAAS_APP
  PORTFOLIO
  MOBILE_APP
  CONSULTING_SERVICE
  E_COMMERCE
  AGENCY
  FREELANCE
  PRODUCT
  COURSE
  COMMUNITY
  OTHER
}

enum ProjectVisibility {
  PUBLIC
  PRIVATE
  INVITE_ONLY
}

// ============================================
// Notification System Models
// ============================================

model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  message   String           @db.Text // Sanitized HTML-safe content
  link      String?
  metadata  Json? // Additional data (submissionId, projectId, etc.)
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@index([createdAt])
}

enum NotificationType {
  SUBMISSION_CREATED
  SUBMISSION_MODERATED
  SUBMISSION_FLAGGED
  SUBMISSION_APPROVED
  SUBMISSION_REJECTED
  SECURITY_ALERT
}

model NotificationPreferences {
  id           String   @id @default(cuid())
  userId       String   @unique
  emailEnabled Boolean  @default(true)
  typePreferences Json? // { SUBMISSION_CREATED: { email: true, inApp: true } }
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ApiKeyDailyUsage {
  id           String   @id @default(cuid())
  apiKeyId     String
  date         String   @db.VarChar(10) // YYYY-MM-DD in UTC
  requestCount Int      @default(0)
  lastRequestAt DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  apiKey ApiKey @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)

  @@unique([apiKeyId, date])
  @@index([date])
}

model EmailUsage {
  id                String   @id @default(cuid())
  date              String   @unique // Format: YYYY-MM-DD (UTC timezone)
  count             Int      @default(0)
  lastSnapshotCount Int      @default(0) // Track last snapshot for reconciliation
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([date])
}

// Transactional outbox pattern - ensures reliable job enqueuing
model NotificationOutbox {
  id             String    @id @default(cuid())
  notificationId String
  jobType        String // 'send-notification' or 'send-email'
  payload        Json
  status         String    @default("pending") // pending, enqueued, failed
  attempts       Int       @default(0)
  createdAt      DateTime  @default(now())
  enqueuedAt     DateTime?

  @@index([status, createdAt])
  @@index([notificationId])
}

// Dead Letter Queue for failed jobs
model DeadLetterJob {
  id               String    @id @default(cuid())
  jobId            String
  queue            String // 'notifications' or 'send-email'
  data             Json
  error            String    @db.Text
  errorType        String // 'transient' or 'permanent'
  statusCode       Int?
  providerResponse String?   @db.Text // Truncated provider response
  failedAt         DateTime
  retried          Boolean   @default(false)
  retriedAt        DateTime?
  retryHistory     Json? // Array of retry attempts with timestamps

  @@index([queue, failedAt])
  @@index([retried])
  @@index([errorType])
}

// Job idempotency tracking (durable across restarts)
model JobIdempotency {
  id          String    @id @default(cuid())
  jobKey      String    @unique // Format: {jobType}:{entityId}
  jobId       String // BullMQ job ID
  status      String // 'processing', 'completed', 'failed'
  createdAt   DateTime  @default(now())
  completedAt DateTime?

  @@index([jobKey, status])
  @@index([createdAt])
}

// ============================================
// Admin Panel Models
// ============================================

model AuditLog {
  id          String   @id @default(cuid())
  adminId     String // Clerk user ID of admin
  action      String // e.g., "PATCH /admin/testimonials/:id/status"
  method      String // HTTP method (GET, POST, PUT, PATCH, DELETE)
  path        String // Request path
  targetType  String? // e.g., "user", "project", "testimonial"
  targetId    String? // ID of the affected resource
  requestBody Json? // Sanitized request body
  statusCode  Int? // HTTP response status code
  success     Boolean  @default(true)
  requestId   String // X-Request-ID for correlation with Sentry
  ipAddress   String?
  userAgent   String?  @db.Text
  createdAt   DateTime @default(now())

  @@index([adminId, createdAt])
  @@index([targetType, targetId])
  @@index([requestId])
  @@index([createdAt])
}

model SystemSettings {
  id        String   @id @default(cuid())
  key       String   @unique // e.g., "email_quota_limit", "ably_connection_limit"
  value     String   @db.Text // JSON-encoded value
  version   Int      @default(1) // For optimistic locking
  updatedBy String? // Admin user ID who last updated
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())

  @@index([key])
}

model AlertConfig {
  id                     String   @id @default(cuid())
  emailQuotaThreshold    Int      @default(80) // Percentage (0-100)
  dlqCountThreshold      Int      @default(100)
  failedJobRateThreshold Float    @default(0.1) // 0-1 (10%)
  updatedBy              String? // Admin user ID
  updatedAt              DateTime @updatedAt
  createdAt              DateTime @default(now())
}

model AlertHistory {
  id         String        @id @default(cuid())
  alertType  String // e.g., "EMAIL_QUOTA_EXCEEDED", "DLQ_THRESHOLD_EXCEEDED"
  severity   AlertSeverity
  message    String        @db.Text
  metadata   Json? // Additional context
  resolved   Boolean       @default(false)
  resolvedAt DateTime?
  resolvedBy String? // Admin user ID
  createdAt  DateTime      @default(now())

  @@index([alertType, createdAt])
  @@index([resolved])
  @@index([createdAt])
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
}

model ErrorLog {
  id            String        @id @default(cuid())
  severity      ErrorSeverity
  errorType     String // e.g., "DatabaseError", "ValidationError"
  message       String        @db.Text
  stackTrace    String?       @db.Text
  requestId     String? // X-Request-ID for correlation
  sentryEventId String? // Sentry event ID
  userId        String? // Affected user ID
  metadata      Json? // Additional context
  archived      Boolean       @default(false)
  archivedAt    DateTime?
  createdAt     DateTime      @default(now())

  @@index([severity, createdAt])
  @@index([errorType])
  @@index([requestId])
  @@index([sentryEventId])
  @@index([archived, createdAt])
}

enum ErrorSeverity {
  ERROR
  WARNING
  CRITICAL
}

model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique // e.g., "auto_moderation", "bulk_operations"
  name        String // Human-readable name
  description String?  @db.Text
  enabled     Boolean  @default(false)
  metadata    Json? // Additional configuration
  updatedBy   String? // Admin user ID
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  @@index([key])
  @@index([enabled])
}

// ============================================
// Widget Analytics Models
// ============================================

model WidgetAnalytics {
  id         String   @id @default(cuid())
  widgetId   String
  projectId  String
  loadTime   Int // Load time in milliseconds
  layoutType String // carousel, grid, masonry, wall, list
  browser    String? // Browser name
  device     String? // desktop, mobile, tablet
  country    String? // ISO country code
  errorCode  String? // Error code if load failed
  version    String // Widget version
  timestamp  DateTime @default(now())

  @@index([widgetId, timestamp])
  @@index([projectId, timestamp])
  @@index([timestamp])
  @@index([errorCode])
}

model TestimonialImpression {
  id            String   @id @default(cuid())
  testimonialId String
  widgetId      String
  projectId     String
  device        String?  @db.VarChar(32)
  country       String?  @db.VarChar(8)
  timestamp     DateTime @default(now())

  testimonial Testimonial @relation(fields: [testimonialId], references: [id], onDelete: Cascade)
  widget      Widget      @relation(fields: [widgetId], references: [id], onDelete: Cascade)
  project     Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([testimonialId, timestamp])
  @@index([projectId, timestamp])
  @@index([widgetId, timestamp])
}

model FormImpression {
  id        String   @id @default(cuid())
  projectId String
  formId    String?
  ipAddress String?  @db.VarChar(255)
  userAgent String?  @db.Text
  timestamp DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  collectionForm CollectionForm? @relation(fields: [formId], references: [id], onDelete: SetNull)

  @@index([projectId, timestamp])
  @@index([formId, timestamp])
}

model WidgetPerformanceAlert {
  id          String          @id @default(cuid())
  widgetId    String
  projectId   String
  alertType   WidgetAlertType
  severity    AlertSeverity
  message     String          @db.Text
  threshold   Float // The threshold that was exceeded
  actualValue Float // The actual value that triggered the alert
  resolved    Boolean         @default(false)
  resolvedAt  DateTime?
  createdAt   DateTime        @default(now())

  @@index([widgetId, createdAt])
  @@index([projectId, createdAt])
  @@index([resolved])
  @@index([widgetId, resolved, alertType, createdAt]) // Batch dedup check in perf service
}

enum WidgetAlertType {
  LOAD_TIME_EXCEEDED
  ERROR_RATE_EXCEEDED
}
```

- `User` - Clerk-backed account record plus plan/subscription/notification relations.
- `Project` - owned project/workspace entity with moderation and widget/form relations.
- `Plan` - pricing catalog and entitlement limits.
- `Subscription` - current user subscription snapshot and provider lifecycle mirror.
- `SubscriptionPayment` - normalized payment/invoice history for a subscription.
- `PaymentWebhookEvent` - deduplicated provider webhook ingestion ledger.
- `Testimonial` - testimonial core record, moderation state, and provenance fields.
- `CollectionForm` - per-project submission form configuration and A/B weight.
- `Widget` - widget config record with design tokens and wall slug fields.
- `ApiKey` - hashed API credential record with project/user ownership.
- `Tag` - reusable testimonial tag.
- `Notification` - in-app notification feed item.
- `NotificationPreferences` - per-user notification settings.
- `ApiKeyDailyUsage` - daily usage rollup for API keys.
- `EmailUsage` - daily email quota tracker.
- `NotificationOutbox` - transactional outbox for notification/email dispatch.
- `DeadLetterJob` - failed-job quarantine table.
- `JobIdempotency` - durable job de-dupe and status tracking.
- `AuditLog` - admin activity ledger.
- `SystemSettings` - key/value runtime admin settings.
- `AlertConfig` - alert threshold configuration.
- `AlertHistory` - generated operational alert history.
- `ErrorLog` - aggregated error tracking table.
- `FeatureFlag` - runtime feature toggle registry.
- `WidgetAnalytics` - widget load telemetry.
- `TestimonialImpression` - testimonial impression telemetry.
- `FormImpression` - form impression telemetry.
- `WidgetPerformanceAlert` - widget health alert history.

### `apps/api_v2`
- `src/main.ts` - Nest bootstrap, CORS, raw body capture, and `/v2` global prefix.
- `src/app.module.ts` - root module wiring config, BullMQ, Prisma, Redis, Clerk, health, and users.
- `src/config/env.ts` - Zod validation for `DATABASE_URL`, `REDIS_URL`, Clerk, and port config.
- `src/common/guards/clerk-auth.guard.ts` - global Bearer-token guard that verifies Clerk session JWTs.
- `src/common/decorators/public.decorator.ts` - route metadata escape hatch for public endpoints.
- `src/common/decorators/current-user-id.decorator.ts` - pulls `clerkUserId` from the request.
- `src/modules/clerk/clerk.module.ts` - global Clerk client provider.
- `src/modules/clerk/clerk.service.ts` - Clerk SDK factory and configuration probe.
- `src/modules/health/health.module.ts` - health module wrapper.
- `src/modules/health/health.controller.ts` - public health probe for DB, Redis, and Clerk config.
- `src/modules/prisma/prisma.module.ts` - global Prisma provider.
- `src/modules/prisma/prisma.service.ts` - shared Prisma client lifecycle and healthcheck.
- `src/modules/redis/redis.module.ts` - global Redis provider.
- `src/modules/redis/redis.service.ts` - Redis ping/quit wrapper.
- `src/modules/users/users.module.ts` - users feature module.
- `src/modules/users/users.controller.ts` - `GET /v2/users/me` and Clerk webhook ingestion.
- `src/modules/users/users.service.ts` - get-or-upsert user records from Clerk.
- `src/modules/users/users.service.spec.ts` - users service tests.
- `src/modules/base-v2/` - absent from source tree; only generated declarations exist in `dist/`.

### Former `apps/api` cross-reference

Historical note: this section was captured before the v1 codepaths were
removed. The files below no longer exist in the v2-only repo line; keep this
only as implementation archaeology when validating why a current `api_v2`
contract was shaped a certain way.

- `src/routes/public.route.ts` - public project, testimonial, upload, embed, and client-error ingress.
- `src/routes/project.route.ts` - authenticated project CRUD and nested testimonial routes.
- `src/routes/testimonial.route.ts` - testimonial CRUD plus moderation queue/bulk actions.
- `src/routes/widget.route.ts` - widget CRUD and public embed data fetch.
- `src/routes/api-key.route.ts` - project-scoped API-key management.
- `src/routes/account-api-key.route.ts` - account-level API-key management.
- `src/routes/notifications.route.ts` - in-app notification inbox.
- `src/routes/payments.route.ts` - subscriptions, invoices, cancellation, payment verification.
- `src/routes/plan.route.ts` - plan catalog and plan mutations.
- `src/routes/privacy.routes.ts` - privacy/data-rights endpoints.
- `src/routes/webhook.route.ts` - webhook ingress, including Razorpay.
- `src/routes/ably/token.route.ts` - Ably token minting.
- `src/routes/admin/index.ts` - admin router composition.
- `src/routes/admin/alerts.route.ts` - admin alerts/settings.
- `src/routes/admin/audit-logs.route.ts` - admin audit log inspection.
- `src/routes/admin/billing.route.ts` - admin billing controls.
- `src/routes/admin/dlq.route.ts` - dead-letter queue inspection/retry.
- `src/routes/admin/errors.route.ts` - error log triage.
- `src/routes/admin/feature-flags.route.ts` - feature-flag toggles.
- `src/routes/admin/health.route.ts` - admin health summary.
- `src/routes/admin/metrics.route.ts` - operational metrics.
- `src/routes/admin/plans.route.ts` - admin plan management.
- `src/routes/admin/projects.route.ts` - admin project management.
- `src/routes/admin/sessions.route.ts` - admin session controls.
- `src/routes/admin/settings.route.ts` - admin system settings.
- `src/routes/admin/system.route.ts` - admin system controls.
- `src/routes/admin/testimonials.route.ts` - admin testimonial moderation.
- `src/routes/admin/users.route.ts` - admin user management.
- `src/routes/admin/widgets.route.ts` - admin widget management.

### `apps/web_v2/lib`
- `apps/web_v2/lib/api.ts` - mock async API layer; mirrors the real `/v2` client surface.
- `apps/web_v2/lib/api-client.ts` - actual HTTP client wrapper for `/v2` requests.
- `apps/web_v2/lib/mock-data.ts` - seed/mock contract types and records.
- `apps/web_v2/lib/format.ts` - shared display-format helpers.
- `apps/web_v2/lib/pagination.ts` - UI pagination helper for page-number chips.
- `apps/web_v2/lib/utils.ts` - `cn()` class merge helper.
- `apps/web_v2/lib/analytics/types.ts` - analytics DTOs and aggregation shapes.
- `apps/web_v2/lib/analytics/aggregate.ts` - analytics reducer used by the dashboard.
- `apps/web_v2/lib/analytics/mock-timeseries.ts` - analytics time-series fixtures.
- `apps/web_v2/lib/analytics/range.ts` - date-range helpers.
- `apps/web_v2/lib/widgets/widget-types.ts` - widget studio contract types.
- `apps/web_v2/lib/widgets/widget-presets.ts` - widget preset defaults and builders.
- `apps/web_v2/lib/widgets/widget-fallback-testimonials.ts` - preview-only fallback testimonial pool.
- `apps/web_v2/lib/widgets/widget-studio-store.ts` - widget studio local persistence and mutation store.
- `apps/web_v2/lib/widgets/widget-token-css.ts` - widget design-token-to-CSS mapping.
- `apps/web_v2/lib/collect/types.ts` - canonical testimonial form config types and migration helpers.
- `apps/web_v2/lib/collect/studio-types.ts` - form studio question/layout/design types.
- `apps/web_v2/lib/collect/presets.ts` - form preset definitions.
- `apps/web_v2/lib/collect/studio-presets.ts` - form studio presets and default builder.
- `apps/web_v2/lib/collect/studio-store.ts` - form studio local persistence and mutation store.
- `apps/web_v2/lib/collect/studio-token-css.ts` - form design-token-to-CSS mapping.

### Exported `api*` functions
- `apps/web_v2/lib/api-client.ts`: `export async function apiRequest<T>(path: string, token: string | null, options: RequestInit = {}): Promise<T>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetProjects(): Promise<MockProject[]>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetProject(slug: string): Promise<MockProject | null>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetTestimonials(projectId: string, filter: TestimonialsFilter = {}): Promise<PaginatedResponse<MockTestimonial>>`.
- `apps/web_v2/lib/api.ts`: `export async function apiApproveTestimonial(id: string): Promise<{ success: boolean }>`.
- `apps/web_v2/lib/api.ts`: `export async function apiRejectTestimonial(id: string): Promise<{ success: boolean }>`.
- `apps/web_v2/lib/api.ts`: `export async function apiPublishTestimonial(id: string, published: boolean): Promise<{ success: boolean }>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetTestimonial(projectId: string, testimonialId: string): Promise<MockTestimonial | null>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetWidgets(projectId: string): Promise<MockWidget[]>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetApiKeys(projectId: string): Promise<MockApiKey[]>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetApiKeyById(keyId: string): Promise<MockApiKey | null>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetApiKeyEvents(keyId: string): Promise<MockApiKeyEvent[]>`.
- `apps/web_v2/lib/api.ts`: `export async function apiCreateApiKey(projectId: string, draft: CreateApiKeyDraft): Promise<{ key: MockApiKey; plaintext: string }>`.
- `apps/web_v2/lib/api.ts`: `export async function apiRevokeApiKey(keyId: string): Promise<{ success: boolean }>`.
- `apps/web_v2/lib/api.ts`: `export async function apiRotateApiKey(keyId: string): Promise<{ plaintext: string }>`.
- `apps/web_v2/lib/api.ts`: `export async function apiUpdateApiKey(keyId: string, patch: ApiKeyPatch): Promise<MockApiKey>`.
- `apps/web_v2/lib/api.ts`: `export async function apiUpdateProject(slug: string, patch: ProjectPatch): Promise<MockProject>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetNotifications(): Promise<MockNotification[]>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetSubscription(): Promise<MockSubscription>`.
- `apps/web_v2/lib/api.ts`: `export async function apiCancelSubscription(): Promise<MockSubscription>`.
- `apps/web_v2/lib/api.ts`: `export async function apiSwitchPlan(planId: string): Promise<MockSubscription>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetInvoices(): Promise<Invoice[]>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetPaymentMethods(): Promise<PaymentMethod[]>`.
- `apps/web_v2/lib/api.ts`: `export async function apiDeletePaymentMethod(id: string): Promise<void>`.
- `apps/web_v2/lib/api.ts`: `export async function apiSetDefaultPaymentMethod(id: string): Promise<PaymentMethod[]>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetBillingProfile(): Promise<BillingProfile>`.
- `apps/web_v2/lib/api.ts`: `export async function apiUpdateBillingProfile(input: Partial<BillingProfile>): Promise<BillingProfile>`.
- `apps/web_v2/lib/api.ts`: `export async function apiGetUser(): Promise<MockUser>`.

## 2. Per-Domain Contract Spec

### Users
- Domain summary: Clerk is the source of identity truth. The v2 API must keep the user row in sync with Clerk and expose a `/users/me` record for authenticated UI reads.
- Web_v2 client calls: `apiGetUser(): Promise<MockUser>`.
- Mock data shape:

```ts
export interface MockUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  plan: UserPlan;
  createdAt: Date;
  updatedAt: Date;
}
```

- Request DTOs: `ClerkWebhookEvent { type: string; data: ClerkUserPayload }`, `ClerkUserPayload { id; emailAddresses; firstName; lastName; imageUrl }`.
- Response shapes: `MockUser` for `GET /v2/users/me`; `{ received: true }` for the Clerk webhook.
- Auth model: `GET /v2/users/me` requires a valid Clerk session; `POST /v2/webhooks/clerk` is public but must pass Svix signature verification.
- Open questions: should `users/me` 404 for a never-synced Clerk account or auto-create on first read; should plan remain on `users` or be derived from billing at read time.

### Projects
- Domain summary: Projects are the top-level owned entity for every in-scope workflow. The UI treats slug as the stable public handle and uses project ownership for all privileged reads and writes.
- Web_v2 client calls: `apiGetProjects(): Promise<MockProject[]>`, `apiGetProject(slug: string): Promise<MockProject | null>`, `apiUpdateProject(slug: string, patch: ProjectPatch): Promise<MockProject>`.
- Mock data shape:

```ts
export interface CustomSocialLink {
  platformName: string;
  platformUrl: string;
  profileUrl: string;
}

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
  youtube?: string;
  instagram?: string;
  facebook?: string;
  custom?: CustomSocialLink[];
}

export interface FormConfig {
  headerTitle: string;
  headerDescription: string;
  thankYouMessage: string;
  enableRating: boolean;
  enableJobTitle: boolean;
  enableCompany: boolean;
  enableAvatar: boolean;
  enableVideoUrl: boolean;
  enableGoogleVerification: boolean;
  requireRating: boolean;
  requireJobTitle: boolean;
  requireCompany: boolean;
  requireAvatar: boolean;
  requireVideoUrl: boolean;
  requireGoogleVerification: boolean;
  allowAnonymousSubmissions: boolean;
  notifyOnSubmission: boolean;
  allowFingerprintOptOut: boolean;
}

export interface MockProject {
  id: string;
  userId: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  slug: string;
  logoUrl: string | null;
  projectType: ProjectType | null;
  websiteUrl: string | null;
  collectionFormUrl: string | null;
  brandColorPrimary: string | null;
  brandColorSecondary: string | null;
  socialLinks: SocialLinks | null;
  tags: string[];
  visibility: ProjectVisibility;
  isActive: boolean;
  autoModeration: boolean;
  autoApproveVerified: boolean;
  profanityFilterLevel: string | null;
  formConfig: FormConfig | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    testimonials: number;
    pendingModeration: number;
    widgets: number;
    apiKeys: number;
  };
}
```

- Request DTOs: `ProjectPatch = Partial<Pick<MockProject, "name" | "slug" | "shortDescription" | "description" | "visibility" | "autoModeration" | "autoApproveVerified" | "profanityFilterLevel" | "websiteUrl" | "socialLinks" | "tags">>`.
- Response shapes: `MockProject[]` for list, `MockProject | null` for get-by-slug, `MockProject` for update.
- Auth model: all project reads/writes are Clerk-session gated and should require ownership or explicit membership; `collectionFormUrl` and slug are public outputs, not public access grants.
- Open questions: should public project reads remain slug-only, or should invite-only projects require an access token; should the UI `_count` aggregates be materialized in SQL or computed in service code.

### Widgets
- Domain summary: The UI has a rich widget studio, but today the actual widget mutations are local store actions rather than API calls. The v2 API only needs to satisfy the list/read surface unless the orchestrator decides to wire the studio to network-backed CRUD.
- Web_v2 client calls: `apiGetWidgets(projectId: string): Promise<MockWidget[]>`.
- Mock data shape:

```ts
export type ApiKeyType = "publishable" | "secret";
export type ApiKeyEventType = "created" | "used" | "revoked" | "rotated" | "limit_hit";

export interface MockWidgetConfig {
  layoutType: "carousel" | "grid" | "masonry" | "wall" | "list";
  theme: "light" | "dark" | "auto";
  accentColor: string | null;
  showRating: boolean;
  showAvatar: boolean;
  showCompany: boolean;
  showDate: boolean;
  maxItems: number;
  testimonialIds: string[] | null;
}

export interface MockWidget {
  id: string;
  projectId: string;
  name: string;
  widgetType: "EMBED" | "WALL_OF_LOVE";
  layoutType: "CAROUSEL" | "GRID" | "MASONRY" | "LIST" | "WALL";
  config: MockWidgetConfig;
  createdAt: Date;
  updatedAt: Date;
  _analytics: {
    totalLoads: number;
    avgLoadMs: number;
    lastLoadAt: Date | null;
  };
}

export interface WidgetDesignTokens {
  preset: string;
  accent: string;
  text: string;
  bg: string;
  line: string;
  surface: string;
  radius: number;
  fontFamily: string;
  fontHead: string;
  cardStyle: WidgetCardStyle;
  density: WidgetDensity;
}

export interface WidgetVisibility {
  showRating: boolean;
  showAvatar: boolean;
  showCompany: boolean;
  showDate: boolean;
  showSource: boolean;
}

export interface WidgetBehavior {
  maxItems: number;
  autoRotate: boolean;
  rotateInterval: number;
  showBranding: boolean;
}

export interface WallConfig {
  slug: string;
  title: string;
  subhead: string;
}

export interface WidgetContentConfig {
  mode: "all" | "handpicked";
  pickedIds: string[];
}

export interface WidgetStudioConfig {
  name: string;
  kind: "embed" | "wall";
  layout: "carousel" | "grid" | "masonry" | "list" | "wall";
  theme: "light" | "dark" | "auto";
  tokens: WidgetDesignTokens;
  visibility: WidgetVisibility;
  behavior: WidgetBehavior;
  content: WidgetContentConfig;
  wall: WallConfig;
}

export interface WidgetListEntry {
  id: string;
  name: string;
  kind: "embed" | "wall";
  layout: "carousel" | "grid" | "masonry" | "list" | "wall";
  theme: "light" | "dark" | "auto";
  accent: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  metrics: {
    totalLoads: number;
    avgLoadMs: number;
    lastLoadAt: number | null;
  };
}
```

- Request DTOs: none in `lib/api.ts`; the widget studio currently mutates local store state only. If CRUD is exposed in v2, the natural payload shape is the `WidgetStudioConfig` draft.
- Response shapes: `MockWidget[]` for list/read. The editor preview uses local `WidgetStudioConfig` snapshots, not network responses.
- Auth model: project ownership or membership for list/read on the dashboard; widget-public/embed-tokenized reads must stay public and scoped by widget id or wall slug.
- Open questions: should v2 mirror the widget studio with CRUD endpoints or keep studio state client-owned; should public widget rendering consume `widgetId` or `wallSlug` as the primary public handle.

### Testimonials
- Domain summary: Testimonials are the highest-traffic moderation object and the core embed payload. The UI reads lists, details, and performs optimistic moderation mutations from the dashboard.
- Web_v2 client calls: `apiGetTestimonials(projectId: string, filter?: TestimonialsFilter): Promise<PaginatedResponse<MockTestimonial>>`, `apiGetTestimonial(projectId: string, testimonialId: string): Promise<MockTestimonial | null>`, `apiApproveTestimonial(id: string): Promise<{ success: boolean }>, `apiRejectTestimonial(id: string): Promise<{ success: boolean }>, `apiPublishTestimonial(id: string, published: boolean): Promise<{ success: boolean }>`.
- Mock data shape:

```ts
export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";
export type TestimonialType = "TEXT" | "VIDEO" | "AUDIO";

export interface MockTag {
  id: string;
  name: string;
}

export interface MockTestimonial {
  id: string;
  projectId: string;
  authorName: string;
  authorEmail: string | null;
  authorRole: string | null;
  authorCompany: string | null;
  authorAvatar: string | null;
  content: string;
  type: TestimonialType;
  videoUrl: string | null;
  mediaUrl: string | null;
  source: string | null;
  sourceUrl: string | null;
  isPublished: boolean;
  rating: number | null;
  isApproved: boolean;
  isOAuthVerified: boolean;
  oauthProvider: string | null;
  moderationStatus: ModerationStatus;
  moderationScore: number | null;
  moderationFlags: string[] | null;
  autoPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: MockTag[];
}
```

- Request DTOs: `TestimonialsFilter { status?: ModerationStatus | "ALL"; type?: TestimonialType | "ALL"; search?: string; sort?: "newest" | "oldest" | "rating_desc" | "rating_asc"; page?: number; pageSize?: number }`.
- Response shapes: `PaginatedResponse<MockTestimonial>` for list; `MockTestimonial | null` for detail; `{ success: boolean }` for moderation mutations.
- Auth model: list/detail/moderation require Clerk session plus ownership or membership; public/embed-tokenized testimonial reads should only ever expose approved and published rows.
- Open questions: should moderation actions be idempotent no-ops on already-approved rows; should `publish` be orthogonal to approval or force approval on first publish.

### Forms
- Domain summary: The form builder and collect studio are currently local-state driven and use two different contract layers: a legacy collection-form config and a richer studio config. The API should decide whether to persist the legacy config, the studio config, or both.
- Web_v2 client calls: none in `lib/api.ts`; current form interactions are local store mutations only.
- Mock data shape:

```ts
export type FieldKey = "name" | "email" | "content" | "rating" | "jobTitle" | "company" | "avatar" | "videoUrl" | "consent";
export type FontFamily = "inter" | "geist" | "system" | "serif" | "mono";
export type CornerRadius = "sharp" | "subtle" | "rounded" | "pill";
export type DisplayMode = "light" | "dark" | "system";
export type InputStyle = "outlined" | "filled" | "underlined" | "minimal";
export type ButtonStyle = "solid" | "outline" | "soft" | "ghost";
export type Shadow = "none" | "subtle" | "medium";
export type Density = "compact" | "default" | "spacious";
export type HeaderAlignment = "left" | "center";
export type HeadingWeight = "light" | "normal" | "semibold" | "bold";
export type WatermarkPosition = "bottom-left" | "bottom-right" | "bottom-center";
export type OAuthProvider = "google" | "github";
export type ModerationMode = "auto" | "manual";
export type ConsentMode = "declaration" | "checkbox";

export interface FormConfig {
  content: {
    headerTitle: string;
    headerDescription: string;
    submitButtonLabel: string;
    thankYouTitle: string;
    thankYouMessage: string;
    successAction: { kind: "message" } | { kind: "redirect"; url: string };
  };
  fields: {
    email: { enabled: boolean; required: boolean };
    rating: { enabled: boolean; required: boolean; scale: 5 | 10 };
    jobTitle: { enabled: boolean; required: boolean };
    company: { enabled: boolean; required: boolean };
    avatar: { enabled: boolean; required: boolean };
    videoUrl: { enabled: boolean; required: boolean };
    consent: { enabled: boolean; mode: ConsentMode; label: string };
  };
  branding: {
    logoUrl: string | null;
    colors: {
      primary: string;
      background: string;
      foreground: string;
      accent: string;
    };
    fontFamily: FontFamily;
    cornerRadius: CornerRadius;
    mode: DisplayMode;
    inputStyle: InputStyle;
    buttonStyle: ButtonStyle;
    shadow: Shadow;
    density: Density;
    headerAlignment: HeaderAlignment;
    headingWeight: HeadingWeight;
  };
  behavior: {
    allowAnonymous: boolean;
    oauthProviders: OAuthProvider[];
    notifyOnSubmission: boolean;
    moderation: ModerationMode;
    allowFingerprintOptOut: boolean;
  };
  watermark: {
    show: boolean;
    position: WatermarkPosition;
  };
  delivery: {
    customDomain: string | null;
    pathSuffix: string;
    embedScriptEnabled: boolean;
  };
}

export interface StudioQuestion {
  id: string;
  type: "shorttext" | "longtext" | "stars" | "nps" | "emoji" | "radio" | "checkbox" | "dropdown" | "file";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  showIf?: { questionId: string; op: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "includes"; value: string | number } | null;
}

export interface LayoutConfig {
  flow: "all" | "stepped" | "cards" | "conversational";
  container: "boxed" | "split" | "fullbleed" | "centered";
  hero: "none" | "top" | "side" | "floating";
  mobileFlow: "all" | "stepped" | "cards" | "conversational" | "auto";
  mobileContainer: "boxed" | "split" | "fullbleed" | "centered" | "auto";
  stickyProgress: boolean;
  showBrandPill: boolean;
}

export interface DesignTokens {
  fontHead: string;
  fontBody: string;
  fontMono: string;
  sizeBase: number;
  sizeHead: number;
  trackingHead: number;
  weightHead: number;
  weightBody: number;
  bg: string;
  surface: string;
  ink: string;
  inkSoft: string;
  line: string;
  accent: string;
  accentInk: string;
  radius: number;
  fieldShape: "rounded" | "square" | "underline" | "pill";
  density: "compact" | "default" | "cozy" | "airy";
  buttonStyle: "solid" | "pill" | "block" | "ghost";
  shadow: "none" | "sm" | "soft" | "hard" | "glow";
  texture: "none" | "grain" | "dots" | "lines";
  dark: boolean;
  brandName: string;
}

export interface StudioConfig {
  tokens: DesignTokens;
  layout: LayoutConfig;
  questions: StudioQuestion[];
  headline: string;
  subhead: string;
  brandName: string;
  logoUrl: string | null;
  preset: string;
  layoutPreset: string;
}

export interface FormConfigEntry {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  abWeight: number;
  createdAt: number;
  updatedAt: number;
  submissions: number;
  views: number;
  responseRate: number;
  avgRating: number;
  lastSubmissionAt: number | null;
}
```

- Request DTOs: none in current network contract; if v2 exposes form CRUD, the likely payload should merge `FormConfig` plus `StudioConfig` or a canonical server form schema.
- Response shapes: local store exposes `FormConfigEntry[]` and `StudioConfig` snapshots; no API response exists yet.
- Auth model: project ownership or membership for dashboard access; public collect forms and embed delivery should be tokenized or slug-scoped.
- Open questions: should the persisted server config be legacy `CollectionForm.config` JSON, a normalized studio model, or both; should A/B weights and publish state live with the form record or in a separate delivery table.

### Webhooks
- Domain summary: Webhooks are the external ingress path for identity and payments. In api_v2 the only implemented webhook is Clerk user sync; the legacy app also has Razorpay webhook processing.
- Web_v2 client calls: none.
- Mock data shape: none in `lib/mock-data.ts`.
- Request DTOs: `POST /v2/webhooks/clerk` expects raw Svix headers plus a body that verifies to `ClerkWebhookEvent`.
- Response shapes: `{ received: true }` on success; errors are surfaced via HTTP exceptions.
- Auth model: public route with Svix signature verification, not Clerk auth.
- Open questions: should v2 also own Razorpay webhook ingress or keep billing webhooks in the legacy service until cutover; should webhook idempotency be handled by a dedicated table the way legacy payment webhooks do.

### Alerts
- Domain summary: Operational alerts are present in the legacy backend and schema, but the v2 UI does not currently call any alert APIs. This domain should stay behind admin auth if it lands in v2.
- Web_v2 client calls: none.
- Mock data shape: no alert-specific mock layer in `web_v2`.
- Request DTOs: none in current UI contract.
- Response shapes: none in current UI contract.
- Auth model: admin-only if exposed.
- Open questions: whether alerts belong in a dedicated `/v2/admin` namespace or are purely internal backend jobs.

### Ops/Admin
- Domain summary: The legacy backend has a full admin surface and the schema already contains the corresponding operational tables. The v2 frontend does not yet call these endpoints, so this section is a gap analysis rather than a live contract.
- Web_v2 client calls: none.
- Mock data shape: no admin mock layer in `web_v2`.
- Request DTOs: none in current UI contract.
- Response shapes: none in current UI contract.
- Auth model: admin Clerk sessions only.
- Open questions: whether v2 should expose admin reads in a single consolidated namespace or preserve the legacy route split; whether audit logs remain out of scope for the public cutover.

## 3. Proposed Prisma Schema Deltas

### Users
- Proposed models: keep `User`, but remove the generated default id and let Clerk ids be stored verbatim.

```prisma
model User {
  id        String   @id // Clerk user id
  email     String   @unique
  firstName String?
  lastName  String?
  avatar    String?  @db.VarChar(1000)
  plan      UserPlan @default(FREE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- Enums needed: none beyond existing `UserPlan`.
- Relations + cascade rules: keep `onDelete: Cascade` from dependent records to `User`; any new ownership tables should cascade from user deletion.
- Indexes: `email` unique is sufficient for current UI reads.
- Conflicts: current `User.id @default(cuid())` conflicts with Clerk ids written directly in `users.service.ts`; current schema also carries billing/notification relations that the v2 users slice does not currently use.

### Projects
- Proposed models: keep `Project`, but align fields to the UI contract and preserve `formConfig` as JSON until form persistence is formalized.

```prisma
model Project {
  id                  String            @id @default(cuid())
  userId              String
  name                String            @db.VarChar(255)
  shortDescription    String?           @db.VarChar(500)
  description         String?           @db.Text
  slug                String            @unique @db.VarChar(255)
  logoUrl             String?           @db.VarChar(1000)
  projectType         ProjectType?      @default(OTHER)
  websiteUrl          String?           @db.VarChar(1000)
  collectionFormUrl   String?           @db.VarChar(1000)
  brandColorPrimary   String?           @db.VarChar(7)
  brandColorSecondary String?           @db.VarChar(7)
  socialLinks         Json?
  tags                String[]
  visibility          ProjectVisibility @default(PRIVATE)
  isActive            Boolean           @default(true)
  autoModeration      Boolean           @default(true)
  autoApproveVerified Boolean           @default(false)
  profanityFilterLevel String?          @default("MODERATE")
  moderationSettings  Json?
  formConfig          Json?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  user                User              @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- Enums needed: existing `ProjectType`, `ProjectVisibility`.
- Relations + cascade rules: keep project deletion cascading to widgets, testimonials, forms, impressions, and api keys.
- Indexes: `userId`, `visibility`, `projectType`; consider a compound `userId, slug` helper if lookups stay frequent.
- Conflicts: no membership table exists today, so ownership checks are single-owner only; if invite-only needs multi-user access, a new membership model is required.

### Testimonials
- Proposed models: keep `Testimonial`, but use the existing moderation fields as the public contract source and add only what the UI actually filters on.

```prisma
model Testimonial {
  id               String           @id @default(cuid())
  userId           String?
  projectId        String?
  formId           String?
  authorName       String           @db.VarChar(255)
  authorEmail      String?          @db.VarChar(255)
  authorRole       String?          @db.VarChar(255)
  authorCompany    String?          @db.VarChar(255)
  authorAvatar     String?          @db.VarChar(1000)
  content          String           @db.Text
  type             TestimonialType  @default(TEXT)
  videoUrl         String?
  mediaUrl         String?
  source           String?          @db.VarChar(100)
  sourceUrl        String?          @db.VarChar(500)
  oembedData       Json?
  isPublished      Boolean          @default(false)
  rating           Int?             @db.SmallInt
  isApproved       Boolean          @default(false)
  ipAddress        String?          @db.VarChar(45)
  userAgent        String?          @db.Text
  isOAuthVerified  Boolean          @default(false)
  oauthProvider    String?          @db.VarChar(50)
  oauthSubject     String?          @db.VarChar(255)
  moderationStatus ModerationStatus @default(PENDING)
  moderationScore  Float?
  moderationFlags  Json?
  autoPublished    Boolean          @default(false)
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}
```

- Enums needed: existing `TestimonialType`, `ModerationStatus`.
- Relations + cascade rules: cascade on project and user deletion; set-null on form deletion.
- Indexes: keep the current moderation and public-embed composites; those match the UI query patterns.
- Conflicts: current schema already matches most of the testimonial dashboard needs; the only gap is an explicit public/embed projection serializer for safe fields like `authorEmail`.

### Widgets
- Proposed models: refactor `Widget` toward the UI studio contract instead of the current legacy token fields.

```prisma
model Widget {
  id        String   @id @default(cuid())
  projectId String
  name      String
  kind      WidgetType
  layout    LayoutType
  theme     ThemeMode
  tokens    Json
  visibility Json
  behavior  Json
  content   Json
  wall      Json?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

- Enums needed: existing `WidgetType`, `LayoutType`, `ThemeMode`; consider adding widget-studio-only enums only if you want strict DB validation for `cardStyle` and `density`.
- Relations + cascade rules: delete widgets with project deletion; impressions and analytics should cascade too.
- Indexes: `projectId`, `wallSlug` or `wall.slug` if preserved, and a unique public wall slug if walls are public.
- Conflicts: current schema stores widget design tokens as scalar columns (`preset`, `accentColor`, `bgColor`, etc.) while the UI studio model is nested JSON; the DB must choose one canonical representation before code lands.

### Forms
- Proposed models: keep `CollectionForm`, but either expand `config` to the canonical studio JSON or split out a normalized `FormConfig` model.

```prisma
model CollectionForm {
  id          String   @id @default(cuid())
  projectId   String
  name        String   @default("Default Form")
  description String   @default("")
  isActive    Boolean  @default(true)
  abWeight    Int      @default(100)
  config      Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  project    Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

- Enums needed: if normalized, add enums for `flow`, `container`, `hero`, `fieldShape`, `buttonStyle`, `shadow`, `density`, and `moderation`.
- Relations + cascade rules: project delete should cascade to forms, submissions, and impressions; form delete should set testimonial `formId` null.
- Indexes: `projectId` and `projectId, isActive` are the main query paths visible in the UI store.
- Conflicts: the collect UI has both a legacy `FormConfig` and a richer `StudioConfig`; the current schema only has a single `config` JSON blob, so migration strategy must be explicit.

### Webhooks
- Proposed models: keep `PaymentWebhookEvent` and add a Clerk webhook log if webhook replay visibility is needed.

```prisma
model ClerkWebhookEvent {
  id              String   @id @default(cuid())
  providerEventId  String   @unique
  eventType       String
  payload         Json
  status          String   @default("processed")
  error           String?  @db.Text
  receivedAt      DateTime @default(now())
  processedAt     DateTime?
}
```

- Enums needed: none.
- Relations + cascade rules: none required unless webhook processing touches other ledger tables.
- Indexes: `providerEventId` unique and `eventType, receivedAt` if replay/debug queries matter.
- Conflicts: the current schema has payment webhook tracking but no Clerk webhook ledger; if webhook observability is a requirement, that gap needs a new table.

### Alerts
- Proposed models: existing `AlertConfig`, `AlertHistory`, `ErrorLog`, and `FeatureFlag` already fit the admin/ops slice; preserve them and add a serializer layer rather than refactoring unless the UI needs new fields.

```prisma
model AlertConfig {
  id                     String   @id @default(cuid())
  emailQuotaThreshold    Int      @default(80)
  dlqCountThreshold      Int      @default(100)
  failedJobRateThreshold Float    @default(0.1)
  updatedBy              String?
  updatedAt              DateTime @updatedAt
  createdAt              DateTime @default(now())
}
```

- Enums needed: existing `AlertSeverity`, `ErrorSeverity`.
- Relations + cascade rules: keep alerts independent; they are operational ledgers, not user-owned records.
- Indexes: current alert and error indexes already match admin search/filter paths.
- Conflicts: no v2 UI contract exists yet, so schema work here should be deferred until an admin surface is committed.

### Ops/Admin
- Proposed models: use the existing admin tables as-is and introduce a v2 response serializer instead of reshaping the data model up front.
- Enums needed: none beyond existing admin enums.
- Relations + cascade rules: admin tables should remain append-only or soft-archive oriented where possible.
- Indexes: existing `AuditLog`, `SystemSettings`, `FeatureFlag`, and `ErrorLog` indexes are sufficient for now.
- Conflicts: the legacy admin surface is broad, but the in-scope v2 UI does not yet consume any of it, so the safest approach is to keep the schema stable and implement API slices lazily.

## 4. Cross-Cutting Concerns

- Pagination: `apps/api_v2` does not have source `base-v2` files in the scaffold, but the generated declarations and graph report show a `BaseV2Service` + `paginate()` + `pagination()` pair. The visible contract is `V2PaginatedResponse` with `items`, `total`, `page`, `pageSize`, `totalPages`, `hasNext`, and `hasPrev`; the legacy Express helper uses `ResponseHandler.paginated()` with `meta.pagination { page, limit, total, totalPages, hasNextPage, hasPreviousPage }`.
- Error envelope: legacy `ResponseHandler.success()` returns `{ success, message, data, meta: { timestamp, ... } }`; `ResponseHandler.error()` returns `{ success: false, error: { code, message, details }, meta: { timestamp } }`. That is the clearest existing envelope to preserve.
- Public-route wiring: `@Public()` sets `IS_PUBLIC_KEY`; `ClerkAuthGuard` checks that metadata first, then verifies `Authorization: Bearer <token>` using `@clerk/backend.verifyToken()`, and writes `request.clerkUserId` for `CurrentUserId` to read.
- Webhook signature strategy: `users.controller.ts` uses Svix raw-body verification with `svix-id`, `svix-timestamp`, and `svix-signature` headers plus `CLERK_WEBHOOK_SIGNING_SECRET`.
- Serializer pattern: `apps/api_v2/src/modules/base-v2/` is missing from the source tree, so there is no concrete serializer implementation to inspect; the generated declarations show DTO-returning service methods, which implies direct DTO serialization rather than Express-style envelopes.
- Endpoint prefixing: `apps/api_v2/src/main.ts` applies the global `/v2` prefix to everything except `health`, so the dossier should treat all API routes as `/v2/...` paths.
- HTTP client: `apiRequest()` in `apps/web_v2/lib/api-client.ts` always prefixes with `/v2` and throws `ApiError(status, text)` on non-2xx responses, so response bodies should be human-readable on failure.

## 5. Risk + Sequencing Notes

- Deepest mock-data graph: widgets and forms are the deepest because they span studio state, local persistence, token builders, and embed/public rendering semantics.
- Cleanest contract: users and projects are the cleanest because the UI already consumes simple read shapes and one project patch object.
- Highest divergence risk: widgets and forms, because the UI currently mutates local state rather than calling `api*` functions.
- Public/public-tokenized split risk: testimonials and widgets, because those are the only in-scope domains where public/embed exposure matters.
- Scope revision signal: alerts and ops/admin currently have no `web_v2` client calls, so if the orchestrator wants them in v2 this pass should be treated as schema and backend groundwork only, not a completed UI contract.
