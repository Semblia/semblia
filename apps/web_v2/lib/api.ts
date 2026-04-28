/**
 * Simulated async API layer.
 * Mirrors the shape of real /v2/ responses — wiring is a straight swap.
 * All functions return Promises with artificial latency.
 */

import {
  MOCK_PROJECTS,
  MOCK_TESTIMONIALS,
  MOCK_WIDGETS,
  MOCK_API_KEYS,
  MOCK_API_KEY_EVENTS,
  MOCK_NOTIFICATIONS,
  MOCK_SUBSCRIPTION,
  MOCK_USER,
  getProjectBySlug,
  getTestimonialById,
  getApiKeyById,
  getApiKeyEvents,
  type MockProject,
  type MockTestimonial,
  type MockWidget,
  type MockApiKey,
  type MockApiKeyEvent,
  type MockNotification,
  type MockSubscription,
  type MockUser,
  type ModerationStatus,
  type TestimonialType,
  type ApiKeyType,
} from "./mock-data";

// ── Latency config ─────────────────────────────────────────────────────────────

const LATENCY = { min: 180, max: 440 };

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function simulateLatency() {
  const ms = LATENCY.min + Math.random() * (LATENCY.max - LATENCY.min);
  await sleep(ms);
}

// ── Paginated response type ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ── Testimonials filter ────────────────────────────────────────────────────────

export type TestimonialsFilter = {
  status?: ModerationStatus | "ALL";
  type?: TestimonialType | "ALL";
  search?: string;
  sort?: "newest" | "oldest" | "rating_desc" | "rating_asc";
  page?: number;
  pageSize?: number;
};

// ── Projects ───────────────────────────────────────────────────────────────────

export async function apiGetProjects(): Promise<MockProject[]> {
  await simulateLatency();
  return MOCK_PROJECTS;
}

export async function apiGetProject(slug: string): Promise<MockProject | null> {
  await simulateLatency();
  return getProjectBySlug(slug);
}

// ── Testimonials ───────────────────────────────────────────────────────────────

export async function apiGetTestimonials(
  projectId: string,
  filter: TestimonialsFilter = {},
): Promise<PaginatedResponse<MockTestimonial>> {
  await simulateLatency();

  let testimonials = [...(MOCK_TESTIMONIALS[projectId] ?? [])];

  if (filter.status && filter.status !== "ALL") {
    testimonials = testimonials.filter(
      (t) => t.moderationStatus === filter.status,
    );
  }

  if (filter.type && filter.type !== "ALL") {
    testimonials = testimonials.filter((t) => t.type === filter.type);
  }

  if (filter.search?.trim()) {
    const q = filter.search.trim().toLowerCase();
    testimonials = testimonials.filter(
      (t) =>
        t.authorName.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.authorRole?.toLowerCase().includes(q) ||
        t.authorCompany?.toLowerCase().includes(q),
    );
  }

  switch (filter.sort ?? "newest") {
    case "newest":
      testimonials.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      break;
    case "oldest":
      testimonials.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      break;
    case "rating_desc":
      testimonials.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case "rating_asc":
      testimonials.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
      break;
  }

  const total = testimonials.length;
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = filter.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = testimonials.slice((page - 1) * pageSize, page * pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export async function apiApproveTestimonial(
  id: string,
): Promise<{ success: boolean }> {
  void id;
  await sleep(320);
  return { success: true };
}

export async function apiRejectTestimonial(
  id: string,
): Promise<{ success: boolean }> {
  void id;
  await sleep(320);
  return { success: true };
}

export async function apiPublishTestimonial(
  id: string,
  published: boolean,
): Promise<{ success: boolean }> {
  void id;
  void published;
  await sleep(280);
  return { success: true };
}

export async function apiGetTestimonial(
  projectId: string,
  testimonialId: string,
): Promise<MockTestimonial | null> {
  await simulateLatency();
  return getTestimonialById(projectId, testimonialId);
}

// ── Widgets ────────────────────────────────────────────────────────────────────

export async function apiGetWidgets(projectId: string): Promise<MockWidget[]> {
  await simulateLatency();
  return MOCK_WIDGETS[projectId] ?? [];
}

// ── API Keys ───────────────────────────────────────────────────────────────────

export async function apiGetApiKeys(projectId: string): Promise<MockApiKey[]> {
  await simulateLatency();
  return MOCK_API_KEYS[projectId] ?? [];
}

export async function apiGetApiKeyById(
  keyId: string,
): Promise<MockApiKey | null> {
  await simulateLatency();
  return getApiKeyById(keyId) ?? null;
}

export async function apiGetApiKeyEvents(
  keyId: string,
): Promise<MockApiKeyEvent[]> {
  await simulateLatency();
  return getApiKeyEvents(keyId);
}

export type CreateApiKeyDraft = {
  name: string;
  type: ApiKeyType;
  allowedOrigins?: string[];
  allowedIps?: string[] | null;
  expiresAt?: Date | null;
  rateLimit?: number;
  usageLimit?: number | null;
};

export async function apiCreateApiKey(
  projectId: string,
  draft: CreateApiKeyDraft,
): Promise<{ key: MockApiKey; plaintext: string }> {
  await simulateLatency();
  const prefix = draft.type === "publishable" ? "pk" : "sk";
  const rand = Math.random().toString(36).slice(2, 10);
  const plaintext = `${prefix}_live_${rand}${Math.random().toString(36).slice(2, 10)}`;
  const lastFour = plaintext.slice(-4);
  const now = new Date();
  const key: MockApiKey = {
    id: `key_${rand}`,
    name: draft.name,
    type: draft.type,
    keyPrefix: `${prefix}_live_${rand.slice(0, 4)}`,
    lastFourPlaintext: lastFour,
    userId: MOCK_USER.id,
    projectId,
    allowedOrigins:
      draft.type === "publishable" ? (draft.allowedOrigins ?? []) : [],
    allowedIps: draft.type === "secret" ? (draft.allowedIps ?? null) : null,
    usageCount: 0,
    usageLimit: draft.usageLimit ?? null,
    rateLimit: draft.rateLimit ?? 60,
    isActive: true,
    lastUsedAt: null,
    expiresAt: draft.expiresAt ?? null,
    createdAt: now,
    updatedAt: now,
    dailyUsage: [],
  };
  if (!MOCK_API_KEYS[projectId]) MOCK_API_KEYS[projectId] = [];
  MOCK_API_KEYS[projectId].push(key);
  MOCK_API_KEY_EVENTS[key.id] = [
    { id: `ev_${rand}_c`, keyId: key.id, type: "created", at: now },
  ];
  return { key, plaintext };
}

export async function apiRevokeApiKey(
  keyId: string,
): Promise<{ success: boolean }> {
  await sleep(320);
  const key = getApiKeyById(keyId);
  if (key) {
    key.isActive = false;
    key.updatedAt = new Date();
    const events = MOCK_API_KEY_EVENTS[keyId] ?? [];
    events.unshift({
      id: `ev_${Math.random().toString(36).slice(2, 8)}`,
      keyId,
      type: "revoked",
      at: new Date(),
    });
    MOCK_API_KEY_EVENTS[keyId] = events;
  }
  return { success: true };
}

export async function apiRotateApiKey(
  keyId: string,
): Promise<{ plaintext: string }> {
  await simulateLatency();
  const key = getApiKeyById(keyId);
  if (!key) throw new Error("Key not found");
  const prefix = key.type === "publishable" ? "pk" : "sk";
  const rand = Math.random().toString(36).slice(2, 10);
  const plaintext = `${prefix}_live_${rand}${Math.random().toString(36).slice(2, 10)}`;
  key.keyPrefix = `${prefix}_live_${rand.slice(0, 4)}`;
  key.lastFourPlaintext = plaintext.slice(-4);
  key.isActive = true;
  key.updatedAt = new Date();
  const events = MOCK_API_KEY_EVENTS[keyId] ?? [];
  events.unshift({ id: `ev_${rand}`, keyId, type: "rotated", at: new Date() });
  MOCK_API_KEY_EVENTS[keyId] = events;
  return { plaintext };
}

export type ApiKeyPatch = Partial<
  Pick<
    MockApiKey,
    | "name"
    | "allowedOrigins"
    | "allowedIps"
    | "rateLimit"
    | "usageLimit"
    | "expiresAt"
  >
>;

export async function apiUpdateApiKey(
  keyId: string,
  patch: ApiKeyPatch,
): Promise<MockApiKey> {
  await simulateLatency();
  const key = getApiKeyById(keyId);
  if (!key) throw new Error("Key not found");
  Object.assign(key, patch, { updatedAt: new Date() });
  return key;
}

// ── Projects (mutations) ───────────────────────────────────────────────────────

export type ProjectPatch = Partial<
  Pick<
    MockProject,
    | "name"
    | "slug"
    | "shortDescription"
    | "description"
    | "visibility"
    | "autoModeration"
    | "autoApproveVerified"
    | "profanityFilterLevel"
    | "websiteUrl"
    | "socialLinks"
    | "tags"
  >
>;

export async function apiUpdateProject(
  slug: string,
  patch: ProjectPatch,
): Promise<MockProject> {
  await simulateLatency();
  const project = MOCK_PROJECTS.find((p) => p.slug === slug);
  if (!project) throw new Error("Project not found");
  Object.assign(project, patch, { updatedAt: new Date() });
  return project;
}

// ── Notifications ──────────────────────────────────────────────────────────────

export async function apiGetNotifications(): Promise<MockNotification[]> {
  await simulateLatency();
  return MOCK_NOTIFICATIONS;
}

// ── Billing ────────────────────────────────────────────────────────────────────

export async function apiGetSubscription(): Promise<MockSubscription> {
  await simulateLatency();
  return MOCK_SUBSCRIPTION;
}

export async function apiCancelSubscription(): Promise<MockSubscription> {
  await simulateLatency();
  MOCK_SUBSCRIPTION.cancelAtPeriodEnd = !MOCK_SUBSCRIPTION.cancelAtPeriodEnd;
  return { ...MOCK_SUBSCRIPTION };
}

export async function apiSwitchPlan(planId: string): Promise<MockSubscription> {
  await simulateLatency();
  MOCK_SUBSCRIPTION.userPlan = planId as MockSubscription["userPlan"];
  return { ...MOCK_SUBSCRIPTION };
}

// ── Invoice ────────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  number: string;
  date: Date;
  amount: number; // paise
  currency: string;
  status: "paid" | "open" | "void";
  planName: string;
  downloadUrl: string | null;
}

const MOCK_INVOICES: Invoice[] = [
  {
    id: "in_001",
    number: "INV-2025-008",
    date: new Date("2025-08-01"),
    amount: 79900,
    currency: "INR",
    status: "paid",
    planName: "Pro Monthly",
    downloadUrl: null,
  },
  {
    id: "in_002",
    number: "INV-2025-007",
    date: new Date("2025-07-01"),
    amount: 79900,
    currency: "INR",
    status: "paid",
    planName: "Pro Monthly",
    downloadUrl: null,
  },
  {
    id: "in_003",
    number: "INV-2025-006",
    date: new Date("2025-06-01"),
    amount: 79900,
    currency: "INR",
    status: "paid",
    planName: "Pro Monthly",
    downloadUrl: null,
  },
  {
    id: "in_004",
    number: "INV-2025-005",
    date: new Date("2025-05-01"),
    amount: 79900,
    currency: "INR",
    status: "paid",
    planName: "Pro Monthly",
    downloadUrl: null,
  },
  {
    id: "in_005",
    number: "INV-2025-004",
    date: new Date("2025-04-01"),
    amount: 79900,
    currency: "INR",
    status: "paid",
    planName: "Pro Monthly",
    downloadUrl: null,
  },
  {
    id: "in_006",
    number: "INV-2025-003",
    date: new Date("2025-03-01"),
    amount: 79900,
    currency: "INR",
    status: "paid",
    planName: "Pro Monthly",
    downloadUrl: null,
  },
  {
    id: "in_007",
    number: "INV-2025-002",
    date: new Date("2025-02-01"),
    amount: 79900,
    currency: "INR",
    status: "void",
    planName: "Pro Monthly",
    downloadUrl: null,
  },
  {
    id: "in_008",
    number: "INV-2025-001",
    date: new Date("2025-01-01"),
    amount: 49900,
    currency: "INR",
    status: "paid",
    planName: "Starter Monthly",
    downloadUrl: null,
  },
];

export async function apiGetInvoices(): Promise<Invoice[]> {
  await simulateLatency();
  return [...MOCK_INVOICES];
}

// ── Payment methods ────────────────────────────────────────────────────────────

export interface PaymentMethod {
  id: string;
  brand: "visa" | "mastercard" | "rupay" | "amex";
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

let MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "pm_001",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2027,
    isDefault: true,
  },
  {
    id: "pm_002",
    brand: "mastercard",
    last4: "5454",
    expMonth: 8,
    expYear: 2026,
    isDefault: false,
  },
];

export async function apiGetPaymentMethods(): Promise<PaymentMethod[]> {
  await simulateLatency();
  return [...MOCK_PAYMENT_METHODS];
}

export async function apiDeletePaymentMethod(id: string): Promise<void> {
  await simulateLatency();
  MOCK_PAYMENT_METHODS = MOCK_PAYMENT_METHODS.filter((m) => m.id !== id);
}

export async function apiSetDefaultPaymentMethod(
  id: string,
): Promise<PaymentMethod[]> {
  await simulateLatency();
  MOCK_PAYMENT_METHODS = MOCK_PAYMENT_METHODS.map((m) => ({
    ...m,
    isDefault: m.id === id,
  }));
  return [...MOCK_PAYMENT_METHODS];
}

// ── Billing profile ────────────────────────────────────────────────────────────

export interface BillingProfile {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  gstin?: string;
}

let MOCK_BILLING_PROFILE: BillingProfile = {
  name: "",
  line1: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
};

export async function apiGetBillingProfile(): Promise<BillingProfile> {
  await simulateLatency();
  return { ...MOCK_BILLING_PROFILE };
}

export async function apiUpdateBillingProfile(
  input: Partial<BillingProfile>,
): Promise<BillingProfile> {
  await simulateLatency();
  MOCK_BILLING_PROFILE = { ...MOCK_BILLING_PROFILE, ...input };
  return { ...MOCK_BILLING_PROFILE };
}

// ── User ───────────────────────────────────────────────────────────────────────

export async function apiGetUser(): Promise<MockUser> {
  await simulateLatency();
  return MOCK_USER;
}
