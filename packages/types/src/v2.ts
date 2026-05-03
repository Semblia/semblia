export type V2UserPlan = "FREE" | "PRO";

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
export type V2ModerationStatus = "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";
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
  _count: {
    testimonials: number;
    pendingModeration: number;
    widgets: number;
    apiKeys: number;
    forms: number;
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

export interface V2ApiKeyDTO {
  id: string;
  name: string;
  keyPrefix: string;
  userId: string;
  projectId: string;
  permissions: {
    widgets: boolean;
    testimonials: boolean;
    analytics: boolean;
  } | null;
  usageCount: number;
  usageLimit: number | null;
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V2CreatedApiKeyDTO extends V2ApiKeyDTO {
  key: string;
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
