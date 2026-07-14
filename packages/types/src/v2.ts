import type {
  WidgetDefinitionDoc,
  WidgetPublishedSnapshot,
} from "@workspace/widgets-core/schema";

export type V2UserPlan = "FREE" | "PRO" | "BUSINESS";
export type V2OnboardingStep =
  | "PROFILE"
  | "REFERRAL"
  | "INTENT"
  | "PROJECT"
  | "COLLECTION"
  | "COMPLETED";

export interface V2OnboardingDataDTO {
  profile?: {
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
  };
  referral?: {
    source?: string;
    other?: string;
  };
  intent?: {
    intents?: string[];
    other?: string;
  };
  project?: {
    id?: string;
    name?: string;
    slug?: string;
    collectionUrl?: string;
  };
}

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
  onboardingStep: V2OnboardingStep;
  onboardingData: V2OnboardingDataDTO | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V2LastUsedProjectRefDTO {
  id: string;
  slug: string;
}

export interface V2LastUsedProjectDTO {
  project: V2LastUsedProjectRefDTO | null;
}

export interface V2SetLastUsedProjectBody {
  slug: string;
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
export type V2FormConfigFontFamily =
  | "inter"
  | "geist"
  | "system"
  | "serif"
  | "mono";
export type V2FormConfigCornerRadius = "sharp" | "subtle" | "rounded" | "pill";
export type V2FormConfigDisplayMode = "light" | "dark" | "system";
export type V2FormConfigInputStyle =
  | "outlined"
  | "filled"
  | "underlined"
  | "minimal";
export type V2FormConfigButtonStyle = "solid" | "outline" | "soft" | "ghost";
export type V2FormConfigShadow = "none" | "subtle" | "medium";
export type V2FormConfigDensity = "compact" | "default" | "spacious";
export type V2FormConfigHeaderAlignment = "left" | "center";
export type V2FormConfigHeadingWeight =
  | "light"
  | "normal"
  | "semibold"
  | "bold";
export type V2FormConfigWatermarkPosition =
  | "bottom-left"
  | "bottom-right"
  | "bottom-center";
export type V2FormConfigOAuthProvider = "google" | "github";
export type V2FormConfigModerationMode = "auto" | "manual";
export type V2FormConfigConsentMode = "declaration" | "checkbox";

export type V2FormConfigSuccessAction =
  | { kind: "message" }
  | { kind: "redirect"; url: string };

export interface V2FormConfigDTO {
  content: {
    headerTitle: string;
    headerDescription: string;
    submitButtonLabel: string;
    thankYouTitle: string;
    thankYouMessage: string;
    successAction: V2FormConfigSuccessAction;
  };
  fields: {
    email: { enabled: boolean; required: boolean };
    rating: { enabled: boolean; required: boolean; scale: 5 | 10 };
    jobTitle: { enabled: boolean; required: boolean };
    company: { enabled: boolean; required: boolean };
    avatar: { enabled: boolean; required: boolean };
    videoUrl: { enabled: boolean; required: boolean };
    consent: {
      enabled: boolean;
      mode: V2FormConfigConsentMode;
      label: string;
    };
  };
  branding: {
    logoAssetId: string | null;
    logo: V2MediaAssetDTO | null;
    colors: {
      primary: string;
      background: string;
      foreground: string;
      accent: string;
    };
    fontFamily: V2FormConfigFontFamily;
    cornerRadius: V2FormConfigCornerRadius;
    mode: V2FormConfigDisplayMode;
    inputStyle: V2FormConfigInputStyle;
    buttonStyle: V2FormConfigButtonStyle;
    shadow: V2FormConfigShadow;
    density: V2FormConfigDensity;
    headerAlignment: V2FormConfigHeaderAlignment;
    headingWeight: V2FormConfigHeadingWeight;
  };
  behavior: {
    allowAnonymous: boolean;
    oauthProviders: V2FormConfigOAuthProvider[];
    notifyOnSubmission: boolean;
    moderation: V2FormConfigModerationMode;
    allowFingerprintOptOut: boolean;
  };
  watermark: {
    show: boolean;
    position: V2FormConfigWatermarkPosition;
  };
  delivery: {
    customDomain: string | null;
    pathSuffix: string;
    embedScriptEnabled: boolean;
  };
}

export interface V2AccountModerationDefaultsDTO {
  autoModeration: boolean;
  autoApproveVerified: boolean;
  profanityFilterLevel: string | null;
}

export interface V2AccountVisibilityAccessDefaultsDTO {
  visibility: V2ProjectVisibility;
  isActive: boolean;
}

export interface V2AccountBrandDefaultsDTO {
  brandColorPrimary: string | null;
  brandColorSecondary: string | null;
  logoAssetId: string | null;
  logo: V2MediaAssetDTO | null;
}

export interface V2AccountDefaultsDTO {
  form: V2FormConfigDTO | null;
  moderation: V2AccountModerationDefaultsDTO | null;
  visibilityAccess: V2AccountVisibilityAccessDefaultsDTO | null;
  brand: V2AccountBrandDefaultsDTO | null;
}

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export interface V2UpdateAccountDefaultsBody {
  form?: DeepPartial<V2FormConfigDTO> | null;
  moderation?: Partial<V2AccountModerationDefaultsDTO> | null;
  visibilityAccess?: Partial<V2AccountVisibilityAccessDefaultsDTO> | null;
  brand?: Partial<V2AccountBrandDefaultsDTO> | null;
}
export type V2FeedbackType = "TEXT" | "VIDEO" | "AUDIO";
export type V2FormResponseReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SPAM"
  | "ARCHIVED";
export type V2FormResponsePublishStatus =
  | "PRIVATE"
  | "PUBLISHABLE"
  | "PUBLISHED"
  | "UNPUBLISHED";
export type V2ModerationStatus = V2FormResponseReviewStatus | "FLAGGED";
export type V2PublicSubmitTrustMode = "ORIGIN" | "HMAC";
export type V2ActorType = "user" | "api_key" | "agent_key" | "system";
export type V2WidgetType = "EMBED" | "WALL_OF_LOVE";
export type V2LayoutType = "CAROUSEL" | "GRID" | "MASONRY" | "LIST" | "WALL";
export type V2ThemeMode = "LIGHT" | "DARK" | "AUTO";
export type V2CardStyle = "SHADOW" | "BORDERED" | "FLAT" | "ELEVATED";
export type V2WidgetDensity = "COMPACT" | "DEFAULT" | "COZY";
export type V2NotificationType =
  | "SUBMISSION_CREATED"
  | "SUBMISSION_MODERATED"
  | "SUBMISSION_FLAGGED"
  | "SUBMISSION_APPROVED"
  | "SUBMISSION_REJECTED"
  | "EXPORT_DELIVERY_FAILED"
  | "EXPORT_DELIVERY_READY"
  | "AGENT_ACTION_CREATED"
  | "PROJECT_INVITE_RECEIVED"
  | "PROJECT_INVITE_ACCEPTED"
  | "PROJECT_TRANSFER_REQUESTED"
  | "PROJECT_TRANSFER_ACCEPTED"
  | "PROJECT_TRANSFER_DECLINED"
  | "PROJECT_TRANSFER_CANCELLED"
  | "OUTBOUND_WEBHOOK_DELIVERY_FAILED"
  | "SECURITY_ALERT";
export type V2ProjectOwnershipTransferStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED"
  | "EXPIRED";
export type V2SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled";
export type V2OutboundWebhookEventType =
  | "submission.created"
  | "submission.moderated"
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
export type V2PublicSurfaceFeature = "COLLECTION" | "WALL";
export type V2PublicSurfaceResourceType = "PROJECT" | "FORM" | "WIDGET";
export type V2PublicSurfaceHostStatus =
  | "ACTIVE"
  | "PENDING_VERIFICATION"
  | "DISABLED";
export type V2MediaAssetPurpose =
  | "PROJECT_LOGO"
  | "ACCOUNT_DEFAULTS_LOGO"
  | "FORM_BRANDING_LOGO"
  | "SUBMISSION_ATTACHMENT"
  | "EXPORT_ARTIFACT";
export type V2MediaAssetVisibility = "PUBLIC" | "PRIVATE";
export type V2MediaAssetStatus = "PENDING" | "ACTIVE" | "DELETED";
export type V2SubmissionModerationRunStatus =
  | "PENDING"
  | "ENQUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "SUPPRESSED";
export type V2SubmissionModerationArtifactType =
  | "TEXT"
  | "IMAGE"
  | "AUDIO"
  | "VIDEO"
  | "VIDEO_FRAME"
  | "TRANSCRIPT";
export type V2SubmissionModerationDecision = "APPROVE" | "REVIEW" | "REJECT";

export type V2SubmissionModerationRunDTO = {
  id: string;
  artifactType: V2SubmissionModerationArtifactType;
  provider: string;
  providerOperation: string;
  status: V2SubmissionModerationRunStatus;
  decision: V2SubmissionModerationDecision | null;
  score: number | null;
  flags: string[];
  categories: Record<string, number>;
  reason: string | null;
  createdAt: string;
  completedAt: string | null;
};

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
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: { timestamp: string };
}

export type V2ProjectAccessRole =
  | "OWNER"
  | "ADMIN"
  | "EDITOR"
  | "VIEWER"
  | "ORG_ADMIN"
  | "ORG_MEMBER"
  | "API_KEY"
  | "AGENT_KEY";

export type V2ProjectCapability =
  | "VIEW_PROJECT"
  | "OPERATE_PROJECT"
  | "REVIEW_RESPONSES"
  | "PUBLISH_RESPONSES"
  | "MANAGE_PUBLISH_SURFACES"
  | "VIEW_CREDENTIALS"
  | "VIEW_INTEGRATIONS"
  | "MANAGE_INTEGRATIONS"
  | "VIEW_AGENT_ACCESS"
  | "MANAGE_CREDENTIALS"
  | "MANAGE_AGENT_ACCESS"
  | "MANAGE_PROJECT"
  | "MANAGE_MEMBERS"
  | "MANAGE_BILLING";

export interface V2ProjectAccessDTO {
  role: V2ProjectAccessRole;
  capabilities: V2ProjectCapability[];
  isPrimaryOwner: boolean;
}

export interface V2MediaAssetDTO {
  id: string;
  url: string | null;
  contentType: string;
  byteSize: number | null;
  purpose: V2MediaAssetPurpose;
  visibility: V2MediaAssetVisibility;
  status: V2MediaAssetStatus;
  createdAt: string;
}

export type V2CreateUploadIntentBody =
  | {
      purpose: "PROJECT_LOGO";
      projectSlug: string;
      contentType: string;
      byteSize: number;
      checksumSha256?: string;
    }
  | {
      purpose: "ACCOUNT_DEFAULTS_LOGO";
      contentType: string;
      byteSize: number;
      checksumSha256?: string;
    }
  | {
      purpose: "FORM_BRANDING_LOGO";
      projectSlug: string;
      formId: string;
      contentType: string;
      byteSize: number;
      checksumSha256?: string;
    }
  | {
      purpose: "SUBMISSION_ATTACHMENT";
      projectSlug: string;
      formId?: string;
      contentType: string;
      byteSize: number;
      checksumSha256?: string;
    };

export type V2PublicCreateUploadIntentBody = {
  purpose: "SUBMISSION_ATTACHMENT";
  contentType: string;
  byteSize: number;
  checksumSha256?: string;
};

export interface V2UploadIntentDTO {
  assetId: string;
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
}

export interface V2ConfirmUploadBody {
  byteSize: number;
  checksumSha256?: string;
}

export interface V2ProjectDTO {
  id: string;
  userId: string;
  organizationId: string | null;
  name: string;
  shortDescription: string | null;
  description: string | null;
  slug: string;
  logo: V2MediaAssetDTO | null;
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
  formConfig: V2FormConfigDTO | Record<string, unknown> | null;
  publicSurfaceHosts: V2PublicSurfaceHostDTO[];
  _count: {
    responses: number;
    pendingModeration: number;
    widgets: number;
    apiKeys: number;
  };
  access: V2ProjectAccessDTO;
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
  definition: WidgetDefinitionDoc;
  publishedSnapshot: WidgetPublishedSnapshot | null;
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
  isActive: boolean;
  isPrimaryWall: boolean;
  publicUrl: string | null;
}

export interface V2WidgetDTO {
  id: string;
  projectId: string;
  entry: V2WidgetListEntry;
  config: V2WidgetConfig;
}

export type V2FormIntent =
  | "TESTIMONIAL"
  | "REVIEW"
  | "PRODUCT_FEEDBACK"
  | "CUSTOMER_STORY"
  | "CUSTOM";
export type V2FormStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
export type V2FormVersionStatus = "PUBLISHED" | "ARCHIVED";
export type V2PublicFormSnapshotDTO = Record<string, unknown>;

export interface V2FormSummaryDTO {
  id: string;
  projectId: string;
  intent: V2FormIntent;
  name: string;
  slug: string | null;
  status: V2FormStatus;
  open: boolean;
  draftVersion: number;
  currentVersion: number | null;
  /**
   * The working draft (a FormDefinitionDoc, loosely typed across the wire).
   * Carried on the summary so list and card views can render a real, scaled
   * preview of the actual form without an extra fetch per row.
   * ponytail: full draft per row is fine for normal list sizes; if a project
   * accumulates hundreds of forms, swap this for a server-precompiled compact
   * preview snapshot.
   */
  draft: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface V2FormDTO extends V2FormSummaryDTO {
  updatedByUserId: string | null;
}

export interface V2FormDraftDTO {
  draft: Record<string, unknown>;
  draftVersion: number;
}

export interface V2FormVersionSummaryDTO {
  id: string;
  formId: string;
  projectId: string;
  slug: string | null;
  version: number;
  schemaVersion: string;
  rendererVersion: string;
  coreVersion: string;
  status: V2FormVersionStatus;
  checksum: string;
  previewImageUrl: string | null;
  publishedAt: string;
}

export interface V2FormVersionDTO extends V2FormVersionSummaryDTO {
  snapshot: V2PublicFormSnapshotDTO;
}

export interface V2FormConfigEntry {
  id: string;
  slug?: string | null;
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

export interface V2ResponseAnnotationDTO {
  id: string;
  projectId: string;
  responseId: string;
  actorType: V2ActorType;
  actorId: string | null;
  note: string | null;
  labels: string[];
  sentiment: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface V2ResponseConsentDTO {
  canPublishText: boolean;
  canPublishName: boolean;
  canPublishCompany: boolean;
  canPublishRole: boolean;
  canPublishAvatar: boolean;
  canEditForClarity: boolean;
}

export interface V2SafeResponseAnswerDTO {
  fieldId: string;
  type: string;
  role: string;
  labelSnapshot: string;
  value: unknown;
  publishable: boolean;
  usedInWidget: boolean;
}

export interface V2ResponseDTO {
  id: string;
  projectId: string;
  formId: string;
  versionId: string;
  version: number;
  trustMode: V2PublicSubmitTrustMode;
  answers: V2SafeResponseAnswerDTO[];
  ratingValue: number | null;
  ratingScale: number | null;
  authorName: string | null;
  authorRole: string | null;
  authorCompany: string | null;
  authorAvatarAssetId: string | null;
  consent: V2ResponseConsentDTO;
  reviewStatus: V2FormResponseReviewStatus;
  publishStatus: V2FormResponsePublishStatus;
  moderationReason: string | null;
  moderatedByActorType: V2ActorType | null;
  moderatedByActorId: string | null;
  moderatedAt: string | null;
  sourceMetadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  form: {
    id: string;
    name: string;
    slug: string | null;
    intent: V2FormIntent;
  };
  annotations: V2ResponseAnnotationDTO[];
  moderationRuns: V2SubmissionModerationRunDTO[];
}

export interface V2RuntimeFormSubmitResponseDTO {
  id: string;
  projectId: string;
  formId: string;
  versionId: string;
  version: number;
  reviewStatus: V2FormResponseReviewStatus;
  publishStatus: V2FormResponsePublishStatus;
  createdAt: string;
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

export interface V2AnalyticsDailyDTO {
  day: string;
  formViews: number;
  formSubmissions: number;
  widgetLoads: number;
  testimonialImpressions: number;
  hostedPageViews: number;
  apiRequests: number;
}

export interface V2AnalyticsSummaryDTO {
  range: {
    days: number;
    since: string;
    until: string;
  };
  totals: {
    formViews: number;
    formSubmissions: number;
    widgetLoads: number;
    testimonialImpressions: number;
    hostedPageViews: number;
    apiRequests: number;
  };
  daily: V2AnalyticsDailyDTO[];
}

export interface V2AnalyticsDailyPointDTO {
  day: string;
  formViews: number;
  formSubmissions: number;
  approved: number;
  rejected: number;
  flagged: number;
  widgetLoads: number;
  testimonialImpressions: number;
  hostedPageViews: number;
  apiRequests: number;
  avgLoadMs: number;
  errorCount: number;
}

export interface V2AnalyticsFunnelDTO {
  steps: Array<{
    key: "form_impressions" | "submitted" | "approved";
    label: string;
    value: number;
  }>;
}

export interface V2AnalyticsPipelineDTO {
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  autoResolved: number;
  totalWithAutoMod: number;
  medianApprovalHours: number | null;
}

export interface V2AnalyticsSourceEntryDTO {
  source: string;
  count: number;
  approvalRate: number;
  oauthVerified: boolean;
}

export interface V2AnalyticsRatingsDTO {
  distribution: { rating: 1 | 2 | 3 | 4 | 5; count: number }[];
  average: number;
  total: number;
}

export interface V2AnalyticsWidgetEngagementDTO {
  widgetId: string;
  widgetName: string;
  widgetType: string;
  layoutType: string;
  totalLoads: number;
  avgLoadMs: number;
  errorCount: number;
  impressions: number;
  lastLoadAt: string | null;
}

export interface V2AnalyticsCountryEntryDTO {
  countryCode: string;
  impressions: number;
}

export interface V2AnalyticsDeviceSplitDTO {
  mobile: number;
  tablet: number;
  desktop: number;
  unknown: number;
}

export interface V2AnalyticsContentRowDTO {
  submissionId: string;
  authorName: string;
  authorCompany: string | null;
  content: string;
  impressions: number;
  rating: number | null;
  moderationStatus: string;
  createdAt: string;
}

export interface V2AnalyticsApiKeyUsageDTO {
  keyId: string;
  keyName: string;
  keyPrefix: string;
  keyType: V2ApiKeyType;
  usageCount: number;
  usageLimit: number | null;
  rateLimit: number;
  lastUsedAt: string | null;
  isActive: boolean;
  series: number[];
}

export interface V2AnalyticsHeatmapCellDTO {
  day: number;
  hour: number;
  count: number;
}

export type V2AnalyticsDashboardTotalsDTO = V2AnalyticsSummaryDTO["totals"] & {
  approved: number;
  rejected: number;
  flagged: number;
};

export interface V2AnalyticsDashboardDTO {
  range: {
    days: number;
    since: string;
    until: string;
  };
  totals: V2AnalyticsDashboardTotalsDTO;
  daily: V2AnalyticsDailyPointDTO[];
  previous: {
    range: { days: number; since: string; until: string };
    totals: V2AnalyticsDashboardTotalsDTO;
    daily: V2AnalyticsDailyPointDTO[];
  } | null;
  funnel: V2AnalyticsFunnelDTO;
  pipeline: V2AnalyticsPipelineDTO;
  topSources: V2AnalyticsSourceEntryDTO[];
  ratings: V2AnalyticsRatingsDTO;
  widgetEngagement: V2AnalyticsWidgetEngagementDTO[];
  topCountries: V2AnalyticsCountryEntryDTO[];
  deviceSplit: V2AnalyticsDeviceSplitDTO;
  contentPerformance: V2AnalyticsContentRowDTO[];
  apiKeyUsage: V2AnalyticsApiKeyUsageDTO[];
  oauthVerifiedShare: number;
  submissionsByDayHour: V2AnalyticsHeatmapCellDTO[];
  alerts: [];
}

export interface V2AnalyticsEventAckDTO {
  accepted: true;
  type:
    | "form_view"
    | "widget_load"
    | "submission_impression"
    | "hosted_page_view";
}

export interface V2PublicSurfaceWallResourceDTO {
  widgetId: string;
  wallSlug: string;
  title: string;
  subhead: string;
  endpoint: string;
  isPrimaryWall: boolean;
  publicUrl: string | null;
}

export interface V2PublicSurfaceHostDTO {
  id: string;
  projectId: string | null;
  feature: V2PublicSurfaceFeature;
  resourceType: V2PublicSurfaceResourceType;
  resourceId: string | null;
  hostname: string;
  isDefault: boolean;
  status: V2PublicSurfaceHostStatus;
  verifiedAt: string | null;
  retiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V2PublicSurfaceResolutionDTO {
  id: string;
  hostname: string;
  requestedHostname: string;
  canonicalHostname: string;
  isCanonical: boolean;
  feature: V2PublicSurfaceFeature;
  resourceType: V2PublicSurfaceResourceType;
  resourceId: string | null;
  isDefault: boolean;
  canonicalUrl: string;
  project: {
    id: string;
    slug: string;
    name: string;
    logo: V2MediaAssetDTO | null;
    brandColorPrimary: string | null;
    brandColorSecondary: string | null;
    websiteUrl: string | null;
  };
  endpoints: {
    forms: string | null;
    responses: string | null;
    wall: string | null;
  };
  walls: V2PublicSurfaceWallResourceDTO[];
}

export type V2ApiKeyType = "SECRET" | "PUBLISHABLE" | "AGENT";
export type V2ApiKeyStatus = "ACTIVE" | "DISABLED" | "REVOKED" | "EXPIRED";
export type V2ApiKeyScope =
  | "project:read"
  | "responses:read"
  | "responses:annotate"
  | "responses:moderate"
  | "responses:publish"
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
  keyType: V2ApiKeyType;
  keyPrefix: string;
  lastFour: string | null;
  userId: string;
  projectId: string;
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

export type V2UpdateApiKeyBody =
  | { name: string; rateLimit?: number }
  | { name?: string; rateLimit: number };

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
  artifactAssetId: string | null;
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

export interface V2IntegrationResourceDTO {
  id: string;
  provider: V2IntegrationProvider;
  label: string;
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface V2IntegrationResourceListDTO {
  provider: V2IntegrationProvider;
  items: V2IntegrationResourceDTO[];
  nextCursor: string | null;
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

export type V2ProjectMemberRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

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

export type V2ProjectMemberInviteStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "EXPIRED";

export interface V2ProjectMemberInviteDTO {
  id: string;
  projectId: string;
  email: string;
  role: V2ProjectMemberRole;
  status: V2ProjectMemberInviteStatus;
  invitedByUserId: string | null;
  acceptedByUserId: string | null;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface V2ProjectOwnershipTransferUserDTO {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
}

export interface V2ProjectOwnershipTransferDTO {
  id: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  fromUser: V2ProjectOwnershipTransferUserDTO;
  toUser: V2ProjectOwnershipTransferUserDTO;
  status: V2ProjectOwnershipTransferStatus;
  expiresAt: string;
  createdAt: string;
  respondedAt: string | null;
}

export interface V2InitiateProjectOwnershipTransferBody {
  toUserId: string;
  confirmName: string;
}

export interface V2NotificationDTO {
  id: string;
  userId: string;
  type: V2NotificationType;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface V2NotificationTypePreferenceDTO {
  email: boolean;
  inApp: boolean;
}

export interface V2NotificationPreferencesDTO {
  userId: string;
  emailEnabled: boolean;
  typePreferences: Partial<
    Record<V2NotificationType, V2NotificationTypePreferenceDTO>
  >;
  updatedAt: string | null;
}

export interface V2SubscriptionDTO {
  id: string;
  userId: string;
  status: V2SubscriptionStatus;
  userPlan: V2UserPlan;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: "INR";
  interval: "month" | "year";
}

export interface V2SubscriptionCheckoutDTO {
  subscriptionId: string;
  shortUrl: string | null;
  razorpayKeyId: string;
  planId: "PRO" | "BUSINESS";
}

export interface V2PaymentMethodDTO {
  id: string;
  brand: "visa" | "mastercard" | "rupay" | "amex";
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface V2InvoiceDTO {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void";
  planName: string;
  downloadUrl: string | null;
}

export interface V2BillingProfileDTO {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  gstin?: string;
}

export interface V2UsageLimitDTO {
  used: number;
  limit: number;
}

export interface V2UsageDTO {
  forms: V2UsageLimitDTO;
  responses: V2UsageLimitDTO;
  widgets: V2UsageLimitDTO;
  projects: V2UsageLimitDTO;
}
