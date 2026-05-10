export type V2UserPlan = "FREE" | "PRO";

// ── API envelope ────────────────────────────────────────────────────────────

export interface V2ApiMeta {
  timestamp: string;
  [key: string]: unknown;
}

export interface V2ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta: V2ApiMeta;
}

// ── User ────────────────────────────────────────────────────────────────────

export interface V2UserDTO {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  plan: V2UserPlan;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type V2ProjectType =
  | "SAAS_APP"
  | "PORTFOLIO"
  | "MOBILE_APP"
  | "CONSULTING_SERVICE"
  | "E_COMMERCE"
  | "AGENCY"
  | "FREELANCE"
  | "PRODUCT"
  | "COURSE"
  | "COMMUNITY"
  | "OTHER";

export type V2ProjectVisibility = "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
export type V2TestimonialType = "TEXT" | "VIDEO" | "AUDIO";
export type V2ModerationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "FLAGGED";
export type V2DisplayRevisionStatus = "SUGGESTED" | "APPROVED" | "REJECTED";
export type V2PublicSubmitTrustMode = "ORIGIN" | "HMAC";
export type V2ActorType = "user" | "api_key" | "agent_key" | "system";
export type V2WidgetType = "EMBED" | "WALL_OF_LOVE";
export type V2LayoutType = "CAROUSEL" | "GRID" | "MASONRY" | "LIST" | "WALL";
export type V2ThemeMode = "LIGHT" | "DARK" | "AUTO";
export type V2CardStyle = "SHADOW" | "BORDERED" | "FLAT" | "ELEVATED";
export type V2WidgetDensity = "COMPACT" | "DEFAULT" | "COZY";
export type V2NotificationType =
  | "NEW_TESTIMONIAL"
  | "TESTIMONIAL_FLAGGED"
  | "TESTIMONIAL_APPROVED"
  | "TESTIMONIAL_REJECTED"
  | "SECURITY_ALERT";
export type V2SubscriptionStatus =
  | "ACTIVE"
  | "CANCELED"
  | "PAST_DUE"
  | "PAUSED"
  | "INCOMPLETE"
  | "TRIALING";
export type V2OutboundWebhookEventType =
  | "submission.created"
  | "submission.moderated"
  | "testimonial.approved"
  | "testimonial.published"
  | "testimonial.unpublished"
  | "export.delivery_failed"
  | "agent.action_created";
export type V2DeliveryStatus =
  | "PENDING"
  | "DELIVERING"
  | "SUCCEEDED"
  | "FAILED"
  | "EXHAUSTED";
export type V2OutboundWebhookStatus = "ACTIVE" | "DISABLED" | "REVOKED";
export type V2ExportDestinationProvider =
  | "CSV"
  | "WEBHOOK"
  | "SLACK"
  | "NOTION"
  | "LINEAR"
  | "GITHUB";
export type V2ExportDestinationStatus = "ACTIVE" | "DISABLED" | "REVOKED";
export type V2IntegrationProvider = "SLACK" | "NOTION" | "LINEAR" | "GITHUB";
export type V2IntegrationAuthStrategy =
  | "CLERK_OAUTH"
  | "NATIVE_OAUTH"
  | "MANUAL_SECRET";
export type V2IntegrationConnectionStatus = "ACTIVE" | "DISABLED" | "REVOKED";

export interface V2PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface V2ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface V2ProjectDTO {
  id: string;
  userId: string;
  organizationId: string | null;
  name: string;
  shortDescription: string | null;
  description: string | null;
  slug: string;
  logoUrl: string | null;
  projectType: V2ProjectType | null;
  websiteUrl: string | null;
  collectionFormUrl: string | null;
  brandColorPrimary: string | null;
  brandColorSecondary: string | null;
  socialLinks: Record<string, string> | null;
  tags: string[];
  visibility: V2ProjectVisibility;
  isActive: boolean;
  autoModeration: boolean;
  autoApproveVerified: boolean;
  profanityFilterLevel: string | null;
  createdAt: string;
  updatedAt: string;
  formConfig: Record<string, unknown> | null;
  _count: {
    testimonials: number;
    pendingModeration: number;
    widgets: number;
    apiKeys: number;
  };
}

export interface V2OrganizationDTO {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
}

export type V2CurrentOrganizationDTO =
  | {
      active: false;
    }
  | {
      active: true;
      organization: V2OrganizationDTO;
      clerk: {
        orgId: string;
        orgSlug: string | null;
        orgRole: string | null;
      };
    };

export interface V2TagDTO {
  id: string;
  name: string;
}

export interface V2TestimonialDTO {
  id: string;
  projectId: string;
  formId: string | null;
  authorName: string;
  authorEmail: string | null;
  authorRole: string | null;
  authorCompany: string | null;
  authorAvatar: string | null;
  content: string;
  type: V2TestimonialType;
  videoUrl: string | null;
  mediaUrl: string | null;
  source: string | null;
  sourceUrl: string | null;
  isPublished: boolean;
  rating: number | null;
  isApproved: boolean;
  isOAuthVerified: boolean;
  oauthProvider: string | null;
  moderationStatus: V2ModerationStatus;
  moderationScore: number | null;
  moderationFlags: string[] | null;
  autoPublished: boolean;
  createdAt: string;
  updatedAt: string;
  tags: V2TagDTO[];
}

export interface V2WidgetDesignTokens {
  preset: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  borderRadius: number;
  fontFamily: string;
  cardStyle: V2CardStyle;
  density: V2WidgetDensity;
}

export interface V2WidgetVisibility {
  showRating: boolean;
  showAvatar: boolean;
  showCompany: boolean;
  showDate: boolean;
  showSource: boolean;
}

export interface V2WidgetBehavior {
  maxItems: number;
  autoRotate: boolean;
  rotateInterval: number;
  showBranding: boolean;
}

export interface V2WallConfig {
  slug: string;
  title: string;
  subhead: string;
}

export interface V2WidgetConfig {
  name: string;
  widgetType: V2WidgetType;
  layoutType: V2LayoutType;
  themeMode: V2ThemeMode;
  tokens: V2WidgetDesignTokens;
  visibility: V2WidgetVisibility;
  behavior: V2WidgetBehavior;
  wall: V2WallConfig | null;
}

export interface V2WidgetListEntry {
  id: string;
  name: string;
  widgetType: V2WidgetType;
  layoutType: V2LayoutType;
  themeMode: V2ThemeMode;
  preset: string;
  createdAt: string;
  updatedAt: string;
  totalLoads: number;
  avgLoadMs: number;
  lastLoadAt: string | null;
}

export interface V2WidgetDTO {
  id: string;
  projectId: string;
  entry: V2WidgetListEntry;
  config: V2WidgetConfig;
}

export interface V2FormConfigEntry {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  abWeight: number;
  createdAt: string;
  updatedAt: string;
  submissions: number;
  views: number;
  responseRate: number;
  avgRating: number;
  lastSubmissionAt: string | null;
}

export interface V2CollectionFormDTO<TConfig = unknown> {
  id: string;
  projectId: string;
  entry: V2FormConfigEntry;
  config: TConfig;
}

export interface V2SubmissionAnnotationDTO {
  id: string;
  projectId: string;
  submissionId: string;
  testimonialId: string | null;
  actorType: V2ActorType;
  actorId: string | null;
  note: string | null;
  labels: string[];
  sentiment: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface V2SubmissionDTO {
  id: string;
  projectId: string;
  formId: string;
  testimonialId: string | null;
  trustMode: V2PublicSubmitTrustMode;
  idempotencyKey: string | null;
  payloadHash: string | null;
  answers: Record<string, unknown>;
  ratingValue: number | null;
  ratingScale: number | null;
  moderationStatus: V2ModerationStatus;
  moderationReason: string | null;
  moderatedByActorType: V2ActorType | null;
  moderatedByActorId: string | null;
  moderatedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  collectionForm: {
    id: string;
    name: string;
  };
  testimonial: {
    id: string;
    authorName: string;
    authorRole: string | null;
    authorCompany: string | null;
    content: string;
    rating: number | null;
    isPublished: boolean;
    moderationStatus: V2ModerationStatus;
    createdAt: string;
    updatedAt: string;
  } | null;
  annotations: V2SubmissionAnnotationDTO[];
}

export interface V2TestimonialDisplayRevisionDTO {
  id: string;
  testimonialId: string;
  projectId: string;
  suggestedByActorType: V2ActorType;
  suggestedByActorId: string | null;
  status: V2DisplayRevisionStatus;
  headline: string | null;
  displayText: string;
  reason: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V2ProjectActionAuditDTO {
  id: string;
  projectId: string;
  actorType: V2ActorType;
  actorId: string | null;
  credentialId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type V2ApiKeyType = "SECRET" | "PUBLISHABLE" | "AGENT";
export type V2ApiKeyStatus = "ACTIVE" | "DISABLED" | "REVOKED" | "EXPIRED";
export type V2ApiKeyScope =
  | "project:read"
  | "submissions:read"
  | "submissions:annotate"
  | "submissions:moderate"
  | "testimonials:read"
  | "testimonials:publish"
  | "testimonials:unpublish"
  | "testimonials:tag"
  | "testimonials:display_suggest"
  | "analytics:read"
  | "exports:read"
  | "exports:write"
  | "webhooks:read"
  | "webhooks:write"
  | "integrations:read"
  | "integrations:write"
  | "credentials:read"
  | "credentials:write"
  | "agent:read"
  | "agent:write";

export interface V2ApiKeyDTO {
  id: string;
  name: string;
  type: V2ApiKeyType;
  keyType: V2ApiKeyType;
  prefix: string;
  keyPrefix: string;
  lastFour: string | null;
  userId: string;
  projectId: string;
  permissions: {
    widgets: boolean;
    testimonials: boolean;
    analytics: boolean;
  } | null;
  scopes: V2ApiKeyScope[];
  usageCount: number;
  usageLimit: number | null;
  rateLimit: number;
  status: V2ApiKeyStatus;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V2CreatedApiKeyDTO extends V2ApiKeyDTO {
  secret: string;
  key: string;
}

export interface V2ApiKeyEventDTO {
  id: string;
  type: "usage.daily";
  apiKeyId: string;
  keyName: string;
  keyPrefix: string;
  keyType: V2ApiKeyType;
  date: string;
  requestCount: number;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export type V2AgentAccessPresetId =
  | "READ_ONLY"
  | "CONTENT_MANAGER"
  | "AUTOMATION_MANAGER"
  | "DEVELOPER";

export interface V2AgentAccessPresetDTO {
  id: V2AgentAccessPresetId;
  label: string;
  description: string;
  scopes: V2ApiKeyScope[];
}

export interface V2AgentAccessOverviewDTO {
  presets: V2AgentAccessPresetDTO[];
  keys: V2ApiKeyDTO[];
}

// ── Outbound webhooks and exports ─────────────────────────────────────────

export interface V2OutboundWebhookEndpointDTO {
  id: string;
  projectId: string;
  name: string;
  url: string;
  subscribedEvents: V2OutboundWebhookEventType[];
  status: V2OutboundWebhookStatus;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V2CreatedOutboundWebhookEndpointDTO
  extends V2OutboundWebhookEndpointDTO {
  signingSecret: string;
}

export interface V2OutboundWebhookDeliveryDTO {
  id: string;
  endpointId: string;
  projectId: string;
  eventType: V2OutboundWebhookEventType;
  payload: Record<string, unknown>;
  status: V2DeliveryStatus;
  attempts: number;
  nextAttemptAt: string | null;
  responseStatus: number | null;
  responseBodySnippet: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V2CreateOutboundWebhookEndpointBody {
  name: string;
  url: string;
  subscribedEvents: V2OutboundWebhookEventType[];
}

export interface V2UpdateOutboundWebhookEndpointBody {
  name?: string;
  url?: string;
  subscribedEvents?: V2OutboundWebhookEventType[];
}

export interface V2ExportDestinationDTO {
  id: string;
  projectId: string;
  provider: V2ExportDestinationProvider;
  name: string;
  config: Record<string, unknown>;
  status: V2ExportDestinationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface V2ExportRuleDTO {
  id: string;
  projectId: string;
  destinationId: string;
  name: string;
  eventTypes: V2OutboundWebhookEventType[];
  filter: Record<string, unknown> | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface V2ExportDeliveryDTO {
  id: string;
  projectId: string;
  destinationId: string;
  ruleId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  status: V2DeliveryStatus;
  attempts: number;
  nextAttemptAt: string | null;
  error: string | null;
  artifactContent: string | null;
  artifactContentType: string | null;
  artifactFilename: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V2CreateCsvExportBody {
  filename?: string;
}

// ── Native thin integrations ──────────────────────────────────────────────

export interface V2IntegrationConnectionDTO {
  id: string;
  projectId: string;
  provider: V2IntegrationProvider;
  authStrategy: V2IntegrationAuthStrategy;
  connectedByUserId: string | null;
  clerkProvider: string | null;
  externalAccountId: string | null;
  status: V2IntegrationConnectionStatus;
  scopes: string[];
  config: Record<string, unknown> | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V2CreateIntegrationConnectionBody {
  provider: V2IntegrationProvider;
  authStrategy?: V2IntegrationAuthStrategy;
  clerkProvider?: string;
  externalAccountId?: string;
  scopes?: string[];
  config?: Record<string, unknown>;
}

export interface V2UpdateIntegrationConnectionBody {
  externalAccountId?: string | null;
  scopes?: string[];
  config?: Record<string, unknown>;
}

export interface V2CreateNativeIntegrationExportBody {
  eventType: V2OutboundWebhookEventType;
  payload: {
    title: string;
    summary?: string;
    content?: string;
    authorName?: string;
    rating?: number;
    sourceUrl?: string;
    testimonialId?: string;
    submissionId?: string;
    labels?: string[];
  };
}

// ── Studio drafts ──────────────────────────────────────────────────────────

export type V2StudioDraftResourceType = "FORM" | "WIDGET";

export interface V2StudioDraftDTO {
  resourceType: V2StudioDraftResourceType;
  resourceId: string;
  version: number;
  publishedVersion: number | null;
  draft: Record<string, unknown> | null;
  updatedByUserId: string | null;
  updatedAt: string | null;
}

// ── Project members ────────────────────────────────────────────────────────

export type V2ProjectMemberRole = "OWNER" | "ADMIN" | "MEMBER";

export interface V2ProjectMemberDTO {
  id: string;
  userId: string;
  role: V2ProjectMemberRole;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatar: string | null;
  };
}

export interface V2NotificationDTO {
  id: string;
  userId: string;
  type: V2NotificationType;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, string> | null;
  isRead: boolean;
  createdAt: string;
}

export interface V2SubscriptionDTO {
  id: string;
  userId: string;
  status: V2SubscriptionStatus;
  userPlan: V2UserPlan;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  amount: number | null;
  currency: string | null;
  interval: string | null;
}
