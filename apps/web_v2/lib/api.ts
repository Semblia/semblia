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
  type SocialLinks,
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

// ── User ───────────────────────────────────────────────────────────────────────

export async function apiGetUser(): Promise<MockUser> {
  await simulateLatency();
  return MOCK_USER;
}
