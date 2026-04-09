/**
 * Mock data that mirrors the Prisma schema exactly.
 * Safe-to-expose fields only — no keyHash, ipAddress, userAgent,
 * oauthSubject, rawSnapshot, razorpaySignature, or admin models.
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserPlan = "FREE" | "PRO";
export type ProjectType =
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
export type ProjectVisibility = "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
export type TestimonialType = "TEXT" | "VIDEO" | "AUDIO";
export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";
export type NotificationType =
  | "NEW_TESTIMONIAL"
  | "TESTIMONIAL_FLAGGED"
  | "TESTIMONIAL_APPROVED"
  | "TESTIMONIAL_REJECTED"
  | "SECURITY_ALERT";
export type SubscriptionStatus =
  | "ACTIVE"
  | "CANCELED"
  | "PAST_DUE"
  | "PAUSED"
  | "INCOMPLETE"
  | "TRIALING";

// ── Types ──────────────────────────────────────────────────────────────────────

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
  socialLinks: Record<string, string> | null;
  tags: string[];
  visibility: ProjectVisibility;
  isActive: boolean;
  autoModeration: boolean;
  autoApproveVerified: boolean;
  profanityFilterLevel: string | null;
  formConfig: FormConfig | null;
  createdAt: Date;
  updatedAt: Date;
  // UI-only aggregates (computed server-side in real impl)
  _count: {
    testimonials: number;
    pendingModeration: number;
    widgets: number;
    apiKeys: number;
  };
}

export interface MockTag {
  id: string;
  name: string;
}

export interface MockTestimonial {
  id: string;
  projectId: string;
  authorName: string;
  authorEmail: string | null; // shown only to project owner
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

export interface MockWidgetConfig {
  layoutType: "carousel" | "grid" | "masonry" | "wall" | "list";
  theme: "light" | "dark" | "auto";
  accentColor: string | null;
  showRating: boolean;
  showAvatar: boolean;
  showCompany: boolean;
  showDate: boolean;
  maxItems: number;
  testimonialIds: string[] | null; // null = all approved
}

export interface MockWidget {
  id: string;
  projectId: string;
  config: MockWidgetConfig;
  createdAt: Date;
  updatedAt: Date;
  // UI-only aggregates
  _analytics: {
    totalLoads: number;
    avgLoadMs: number;
    lastLoadAt: Date | null;
  };
}

export interface MockApiKey {
  id: string;
  name: string;
  keyPrefix: string; // e.g. "tresta_live_abcd1234" — never expose keyHash
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
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, string> | null;
  isRead: boolean;
  createdAt: Date;
}

export interface MockSubscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  userPlan: UserPlan;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  amount: number | null;
  currency: string | null;
  interval: string | null;
}

// ── Seed Data ──────────────────────────────────────────────────────────────────

export const MOCK_USER: MockUser = {
  id: "user_2abc123def456",
  email: "alex@launchpad.io",
  firstName: "Alex",
  lastName: "Chen",
  avatar: null,
  plan: "PRO",
  createdAt: new Date("2024-01-15T09:00:00Z"),
  updatedAt: new Date("2024-11-01T10:30:00Z"),
};

const defaultFormConfig: FormConfig = {
  headerTitle: "Share your experience",
  headerDescription: "Your honest feedback helps others make better decisions.",
  thankYouMessage: "Thank you for your testimonial!",
  enableRating: true,
  enableJobTitle: true,
  enableCompany: true,
  enableAvatar: true,
  enableVideoUrl: false,
  enableGoogleVerification: true,
  requireRating: false,
  requireJobTitle: false,
  requireCompany: false,
  requireAvatar: false,
  requireVideoUrl: false,
  requireGoogleVerification: false,
  allowAnonymousSubmissions: true,
  notifyOnSubmission: true,
  allowFingerprintOptOut: true,
};

export const MOCK_PROJECTS: MockProject[] = [
  {
    id: "proj_launchpad",
    userId: "user_2abc123def456",
    name: "Launchpad",
    shortDescription: "Project management for indie makers",
    description:
      "Launchpad is a minimal, focused project management tool built for solo founders and small teams. Designed to get out of your way.",
    slug: "launchpad",
    logoUrl: null,
    projectType: "SAAS_APP",
    websiteUrl: "https://launchpad.example.com",
    collectionFormUrl: "https://tresta.io/t/launchpad",
    brandColorPrimary: "#6366f1",
    brandColorSecondary: "#4f46e5",
    socialLinks: {
      twitter: "https://twitter.com/launchpad",
      github: "https://github.com/launchpad",
    },
    tags: ["productivity", "saas", "indie"],
    visibility: "PUBLIC",
    isActive: true,
    autoModeration: true,
    autoApproveVerified: false,
    profanityFilterLevel: "MODERATE",
    formConfig: {
      ...defaultFormConfig,
      headerTitle: "How has Launchpad helped you?",
      enableVideoUrl: true,
    },
    createdAt: new Date("2024-01-15T09:00:00Z"),
    updatedAt: new Date("2024-12-10T14:22:00Z"),
    _count: {
      testimonials: 47,
      pendingModeration: 3,
      widgets: 2,
      apiKeys: 2,
    },
  },
  {
    id: "proj_portfoliopro",
    userId: "user_2abc123def456",
    name: "PortfolioPro",
    shortDescription: "Design portfolio builder for creatives",
    description:
      "PortfolioPro lets designers and developers publish beautiful case-study portfolios in minutes, no code required.",
    slug: "portfoliopro",
    logoUrl: null,
    projectType: "PORTFOLIO",
    websiteUrl: "https://portfoliopro.example.com",
    collectionFormUrl: "https://tresta.io/t/portfoliopro",
    brandColorPrimary: "#f59e0b",
    brandColorSecondary: "#d97706",
    socialLinks: {
      twitter: "https://twitter.com/portfoliopro",
    },
    tags: ["design", "portfolio", "no-code"],
    visibility: "PUBLIC",
    isActive: true,
    autoModeration: true,
    autoApproveVerified: true,
    profanityFilterLevel: "LENIENT",
    formConfig: {
      ...defaultFormConfig,
      headerTitle: "Would you recommend PortfolioPro?",
      enableVideoUrl: false,
    },
    createdAt: new Date("2024-03-22T11:00:00Z"),
    updatedAt: new Date("2024-12-08T09:15:00Z"),
    _count: {
      testimonials: 12,
      pendingModeration: 0,
      widgets: 1,
      apiKeys: 1,
    },
  },
  {
    id: "proj_mobilekit",
    userId: "user_2abc123def456",
    name: "MobileKit",
    shortDescription: "React Native component library",
    description:
      "Production-ready React Native components for building polished mobile apps fast. Includes 80+ components with full TypeScript support.",
    slug: "mobilekit",
    logoUrl: null,
    projectType: "MOBILE_APP",
    websiteUrl: "https://mobilekit.dev",
    collectionFormUrl: "https://tresta.io/t/mobilekit",
    brandColorPrimary: "#10b981",
    brandColorSecondary: "#059669",
    socialLinks: {
      github: "https://github.com/mobilekit",
      twitter: "https://twitter.com/mobilekitdev",
    },
    tags: ["react-native", "components", "mobile"],
    visibility: "PUBLIC",
    isActive: true,
    autoModeration: false,
    autoApproveVerified: false,
    profanityFilterLevel: "STRICT",
    formConfig: defaultFormConfig,
    createdAt: new Date("2024-06-10T08:00:00Z"),
    updatedAt: new Date("2024-12-01T16:45:00Z"),
    _count: {
      testimonials: 8,
      pendingModeration: 2,
      widgets: 1,
      apiKeys: 1,
    },
  },
];

const TAG_EASY_SETUP: MockTag = { id: "tag_1", name: "easy-setup" };
const TAG_SAVES_TIME: MockTag = { id: "tag_2", name: "saves-time" };
const TAG_GREAT_SUPPORT: MockTag = { id: "tag_3", name: "great-support" };
const TAG_GAME_CHANGER: MockTag = { id: "tag_4", name: "game-changer" };

export const MOCK_TESTIMONIALS: Record<string, MockTestimonial[]> = {
  proj_launchpad: [
    {
      id: "test_l1",
      projectId: "proj_launchpad",
      authorName: "Sarah Kim",
      authorEmail: "sarah@designstudio.co",
      authorRole: "Founder",
      authorCompany: "Design Studio Co.",
      authorAvatar: null,
      content:
        "Launchpad completely changed how I run my indie projects. The focus mode alone saved me 2+ hours every week. I can't imagine going back.",
      type: "TEXT",
      videoUrl: null,
      mediaUrl: null,
      source: "manual",
      sourceUrl: null,
      isPublished: true,
      rating: 5,
      isApproved: true,
      isOAuthVerified: true,
      oauthProvider: "google",
      moderationStatus: "APPROVED",
      moderationScore: 0.02,
      moderationFlags: null,
      autoPublished: false,
      createdAt: new Date("2024-11-28T10:15:00Z"),
      updatedAt: new Date("2024-11-29T09:00:00Z"),
      tags: [TAG_SAVES_TIME, TAG_GAME_CHANGER],
    },
    {
      id: "test_l2",
      projectId: "proj_launchpad",
      authorName: "Marcus Webb",
      authorEmail: "marcus@webbconsulting.io",
      authorRole: "Product Manager",
      authorCompany: "Webb Consulting",
      authorAvatar: null,
      content:
        "I've tried every task manager under the sun. Launchpad is the first one that actually fits the way indie makers work. Simple, fast, no fluff.",
      type: "TEXT",
      videoUrl: null,
      mediaUrl: null,
      source: "manual",
      sourceUrl: null,
      isPublished: true,
      rating: 5,
      isApproved: true,
      isOAuthVerified: false,
      oauthProvider: null,
      moderationStatus: "APPROVED",
      moderationScore: 0.05,
      moderationFlags: null,
      autoPublished: true,
      createdAt: new Date("2024-11-20T14:30:00Z"),
      updatedAt: new Date("2024-11-20T14:30:00Z"),
      tags: [TAG_EASY_SETUP],
    },
    {
      id: "test_l3",
      projectId: "proj_launchpad",
      authorName: "Anonymous",
      authorEmail: null,
      authorRole: null,
      authorCompany: null,
      authorAvatar: null,
      content: "Great product but could use better mobile support.",
      type: "TEXT",
      videoUrl: null,
      mediaUrl: null,
      source: "manual",
      sourceUrl: null,
      isPublished: false,
      rating: 3,
      isApproved: false,
      isOAuthVerified: false,
      oauthProvider: null,
      moderationStatus: "PENDING",
      moderationScore: 0.12,
      moderationFlags: null,
      autoPublished: false,
      createdAt: new Date("2024-12-09T08:00:00Z"),
      updatedAt: new Date("2024-12-09T08:00:00Z"),
      tags: [],
    },
    {
      id: "test_l4",
      projectId: "proj_launchpad",
      authorName: "Priya Nair",
      authorEmail: "priya@buildwithpriya.com",
      authorRole: "Indie Developer",
      authorCompany: null,
      authorAvatar: null,
      content:
        "Honestly a bit spammy — buy this product it is the best!!!! click here for more",
      type: "TEXT",
      videoUrl: null,
      mediaUrl: null,
      source: "manual",
      sourceUrl: null,
      isPublished: false,
      rating: 5,
      isApproved: false,
      isOAuthVerified: false,
      oauthProvider: null,
      moderationStatus: "FLAGGED",
      moderationScore: 0.87,
      moderationFlags: ["spam_patterns", "excessive_punctuation", "promotional_language"],
      autoPublished: false,
      createdAt: new Date("2024-12-10T06:12:00Z"),
      updatedAt: new Date("2024-12-10T06:12:00Z"),
      tags: [],
    },
    {
      id: "test_l5",
      projectId: "proj_launchpad",
      authorName: "Tom Eriksen",
      authorEmail: "tom@nordicrouter.no",
      authorRole: "CTO",
      authorCompany: "Nordic Router",
      authorAvatar: null,
      content:
        "We switched from Notion to Launchpad for our sprint planning. The simplicity is exactly what a 3-person team needs. No bloat, just work.",
      type: "TEXT",
      videoUrl: null,
      mediaUrl: null,
      source: "manual",
      sourceUrl: null,
      isPublished: true,
      rating: 4,
      isApproved: true,
      isOAuthVerified: true,
      oauthProvider: "google",
      moderationStatus: "APPROVED",
      moderationScore: 0.03,
      moderationFlags: null,
      autoPublished: false,
      createdAt: new Date("2024-12-05T11:00:00Z"),
      updatedAt: new Date("2024-12-06T09:00:00Z"),
      tags: [TAG_SAVES_TIME, TAG_GREAT_SUPPORT],
    },
  ],
  proj_portfoliopro: [
    {
      id: "test_p1",
      projectId: "proj_portfoliopro",
      authorName: "Lena Hoffmann",
      authorEmail: "lena@creative.de",
      authorRole: "UX Designer",
      authorCompany: "Creative GmbH",
      authorAvatar: null,
      content:
        "PortfolioPro made my case studies look 10× better in a single afternoon. My hiring rate from portfolio views went up noticeably.",
      type: "TEXT",
      videoUrl: null,
      mediaUrl: null,
      source: "manual",
      sourceUrl: null,
      isPublished: true,
      rating: 5,
      isApproved: true,
      isOAuthVerified: true,
      oauthProvider: "google",
      moderationStatus: "APPROVED",
      moderationScore: 0.01,
      moderationFlags: null,
      autoPublished: false,
      createdAt: new Date("2024-12-03T13:45:00Z"),
      updatedAt: new Date("2024-12-04T08:00:00Z"),
      tags: [TAG_GAME_CHANGER],
    },
    {
      id: "test_p2",
      projectId: "proj_portfoliopro",
      authorName: "James Okafor",
      authorEmail: "james.ok@freelance.ng",
      authorRole: "Full-stack Developer",
      authorCompany: null,
      authorAvatar: null,
      content:
        "Clean, fast, and does exactly what it promises. No learning curve — I had my portfolio live in under an hour.",
      type: "TEXT",
      videoUrl: null,
      mediaUrl: null,
      source: "manual",
      sourceUrl: null,
      isPublished: true,
      rating: 5,
      isApproved: true,
      isOAuthVerified: false,
      oauthProvider: null,
      moderationStatus: "APPROVED",
      moderationScore: 0.04,
      moderationFlags: null,
      autoPublished: true,
      createdAt: new Date("2024-11-18T09:30:00Z"),
      updatedAt: new Date("2024-11-18T09:30:00Z"),
      tags: [TAG_EASY_SETUP],
    },
  ],
  proj_mobilekit: [
    {
      id: "test_m1",
      projectId: "proj_mobilekit",
      authorName: "Ravi Sharma",
      authorEmail: "ravi@mobilestartup.in",
      authorRole: "Lead Mobile Engineer",
      authorCompany: "MobileStartup",
      authorAvatar: null,
      content:
        "MobileKit saved our team weeks of setup time. The components are polished and the TypeScript types are excellent.",
      type: "TEXT",
      videoUrl: null,
      mediaUrl: null,
      source: "manual",
      sourceUrl: null,
      isPublished: false,
      rating: 5,
      isApproved: false,
      isOAuthVerified: true,
      oauthProvider: "google",
      moderationStatus: "PENDING",
      moderationScore: 0.03,
      moderationFlags: null,
      autoPublished: false,
      createdAt: new Date("2024-12-09T16:00:00Z"),
      updatedAt: new Date("2024-12-09T16:00:00Z"),
      tags: [],
    },
  ],
};

export const MOCK_WIDGETS: Record<string, MockWidget[]> = {
  proj_launchpad: [
    {
      id: "widget_l1",
      projectId: "proj_launchpad",
      config: {
        layoutType: "carousel",
        theme: "light",
        accentColor: "#6366f1",
        showRating: true,
        showAvatar: true,
        showCompany: true,
        showDate: false,
        maxItems: 5,
        testimonialIds: null,
      },
      createdAt: new Date("2024-02-01T10:00:00Z"),
      updatedAt: new Date("2024-12-01T10:00:00Z"),
      _analytics: {
        totalLoads: 4820,
        avgLoadMs: 312,
        lastLoadAt: new Date("2024-12-10T12:00:00Z"),
      },
    },
    {
      id: "widget_l2",
      projectId: "proj_launchpad",
      config: {
        layoutType: "wall",
        theme: "auto",
        accentColor: null,
        showRating: true,
        showAvatar: false,
        showCompany: true,
        showDate: true,
        maxItems: 12,
        testimonialIds: null,
      },
      createdAt: new Date("2024-05-15T11:00:00Z"),
      updatedAt: new Date("2024-11-20T11:00:00Z"),
      _analytics: {
        totalLoads: 1203,
        avgLoadMs: 428,
        lastLoadAt: new Date("2024-12-09T18:30:00Z"),
      },
    },
  ],
  proj_portfoliopro: [
    {
      id: "widget_p1",
      projectId: "proj_portfoliopro",
      config: {
        layoutType: "grid",
        theme: "light",
        accentColor: "#f59e0b",
        showRating: true,
        showAvatar: true,
        showCompany: false,
        showDate: false,
        maxItems: 6,
        testimonialIds: null,
      },
      createdAt: new Date("2024-04-10T09:00:00Z"),
      updatedAt: new Date("2024-11-01T09:00:00Z"),
      _analytics: {
        totalLoads: 892,
        avgLoadMs: 289,
        lastLoadAt: new Date("2024-12-08T14:00:00Z"),
      },
    },
  ],
  proj_mobilekit: [
    {
      id: "widget_m1",
      projectId: "proj_mobilekit",
      config: {
        layoutType: "list",
        theme: "dark",
        accentColor: "#10b981",
        showRating: true,
        showAvatar: true,
        showCompany: true,
        showDate: true,
        maxItems: 10,
        testimonialIds: null,
      },
      createdAt: new Date("2024-07-01T08:00:00Z"),
      updatedAt: new Date("2024-10-15T08:00:00Z"),
      _analytics: {
        totalLoads: 341,
        avgLoadMs: 395,
        lastLoadAt: new Date("2024-12-07T10:00:00Z"),
      },
    },
  ],
};

export const MOCK_API_KEYS: Record<string, MockApiKey[]> = {
  proj_launchpad: [
    {
      id: "key_l1",
      name: "Production Widget",
      keyPrefix: "tresta_live_a8f2",
      userId: "user_2abc123def456",
      projectId: "proj_launchpad",
      permissions: { widgets: true, testimonials: false, analytics: false },
      usageCount: 12483,
      usageLimit: null,
      rateLimit: 100,
      isActive: true,
      lastUsedAt: new Date("2024-12-10T11:45:00Z"),
      expiresAt: null,
      createdAt: new Date("2024-02-01T10:00:00Z"),
      updatedAt: new Date("2024-12-10T11:45:00Z"),
    },
    {
      id: "key_l2",
      name: "Dev Testing",
      keyPrefix: "tresta_test_c3e7",
      userId: "user_2abc123def456",
      projectId: "proj_launchpad",
      permissions: { widgets: true, testimonials: true, analytics: true },
      usageCount: 847,
      usageLimit: 5000,
      rateLimit: 50,
      isActive: true,
      lastUsedAt: new Date("2024-12-08T09:00:00Z"),
      expiresAt: new Date("2025-02-01T00:00:00Z"),
      createdAt: new Date("2024-08-15T12:00:00Z"),
      updatedAt: new Date("2024-12-08T09:00:00Z"),
    },
  ],
  proj_portfoliopro: [
    {
      id: "key_p1",
      name: "Main Widget Key",
      keyPrefix: "tresta_live_b9d4",
      userId: "user_2abc123def456",
      projectId: "proj_portfoliopro",
      permissions: { widgets: true, testimonials: false, analytics: false },
      usageCount: 3201,
      usageLimit: null,
      rateLimit: 100,
      isActive: true,
      lastUsedAt: new Date("2024-12-08T15:00:00Z"),
      expiresAt: null,
      createdAt: new Date("2024-04-01T10:00:00Z"),
      updatedAt: new Date("2024-12-08T15:00:00Z"),
    },
  ],
  proj_mobilekit: [
    {
      id: "key_m1",
      name: "Docs Widget",
      keyPrefix: "tresta_live_f1a6",
      userId: "user_2abc123def456",
      projectId: "proj_mobilekit",
      permissions: { widgets: true, testimonials: false, analytics: false },
      usageCount: 1102,
      usageLimit: null,
      rateLimit: 100,
      isActive: true,
      lastUsedAt: new Date("2024-12-07T10:00:00Z"),
      expiresAt: null,
      createdAt: new Date("2024-07-01T08:00:00Z"),
      updatedAt: new Date("2024-12-07T10:00:00Z"),
    },
  ],
};

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: "notif_1",
    userId: "user_2abc123def456",
    type: "TESTIMONIAL_FLAGGED",
    title: "Testimonial flagged",
    message: "A testimonial on Launchpad was flagged for spam patterns.",
    link: "/projects/launchpad/testimonials/test_l4",
    metadata: { testimonialId: "test_l4", projectId: "proj_launchpad" },
    isRead: false,
    createdAt: new Date("2024-12-10T06:13:00Z"),
  },
  {
    id: "notif_2",
    userId: "user_2abc123def456",
    type: "NEW_TESTIMONIAL",
    title: "New testimonial",
    message: "Ravi Sharma left a testimonial on MobileKit.",
    link: "/projects/mobilekit/testimonials/test_m1",
    metadata: { testimonialId: "test_m1", projectId: "proj_mobilekit" },
    isRead: false,
    createdAt: new Date("2024-12-09T16:01:00Z"),
  },
  {
    id: "notif_3",
    userId: "user_2abc123def456",
    type: "TESTIMONIAL_APPROVED",
    title: "Testimonial approved",
    message: "Tom Eriksen's testimonial on Launchpad was auto-approved.",
    link: "/projects/launchpad/testimonials/test_l5",
    metadata: { testimonialId: "test_l5", projectId: "proj_launchpad" },
    isRead: true,
    createdAt: new Date("2024-12-05T11:05:00Z"),
  },
  {
    id: "notif_4",
    userId: "user_2abc123def456",
    type: "NEW_TESTIMONIAL",
    title: "New testimonial",
    message: "Anonymous submitted a testimonial on Launchpad.",
    link: "/projects/launchpad/testimonials/test_l3",
    metadata: { testimonialId: "test_l3", projectId: "proj_launchpad" },
    isRead: true,
    createdAt: new Date("2024-12-09T08:01:00Z"),
  },
];

export const MOCK_SUBSCRIPTION: MockSubscription = {
  id: "sub_xyz789",
  userId: "user_2abc123def456",
  status: "ACTIVE",
  userPlan: "PRO",
  currentPeriodStart: new Date("2024-12-01T00:00:00Z"),
  currentPeriodEnd: new Date("2025-01-01T00:00:00Z"),
  cancelAtPeriodEnd: false,
  amount: 79900, // paise = ₹799
  currency: "INR",
  interval: "month",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a project by slug, or null */
export function getProjectBySlug(slug: string): MockProject | null {
  return MOCK_PROJECTS.find((p) => p.slug === slug) ?? null;
}

/** Returns testimonials for a project */
export function getTestimonialsByProject(projectId: string): MockTestimonial[] {
  return MOCK_TESTIMONIALS[projectId] ?? [];
}

/** Returns the unread notification count */
export function getUnreadNotificationCount(): number {
  return MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length;
}

/** Returns project type display label */
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  SAAS_APP: "SaaS App",
  PORTFOLIO: "Portfolio",
  MOBILE_APP: "Mobile App",
  CONSULTING_SERVICE: "Consulting",
  E_COMMERCE: "E-Commerce",
  AGENCY: "Agency",
  FREELANCE: "Freelance",
  PRODUCT: "Product",
  COURSE: "Course",
  COMMUNITY: "Community",
  OTHER: "Other",
};

/** Returns moderation status display */
export const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FLAGGED: "Flagged",
};

/** Format a date relative to now (simple) */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
