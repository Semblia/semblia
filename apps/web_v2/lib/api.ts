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
  MOCK_NOTIFICATIONS,
  MOCK_SUBSCRIPTION,
  MOCK_USER,
  getProjectBySlug,
  type MockProject,
  type MockTestimonial,
  type MockWidget,
  type MockApiKey,
  type MockNotification,
  type MockSubscription,
  type MockUser,
  type ModerationStatus,
  type TestimonialType,
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
  filter: TestimonialsFilter = {}
): Promise<PaginatedResponse<MockTestimonial>> {
  await simulateLatency();

  let testimonials = [...(MOCK_TESTIMONIALS[projectId] ?? [])];

  if (filter.status && filter.status !== "ALL") {
    testimonials = testimonials.filter(
      (t) => t.moderationStatus === filter.status
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
        t.authorCompany?.toLowerCase().includes(q)
    );
  }

  switch (filter.sort ?? "newest") {
    case "newest":
      testimonials.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    case "oldest":
      testimonials.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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
  _id: string
): Promise<{ success: boolean }> {
  await sleep(320);
  return { success: true };
}

export async function apiRejectTestimonial(
  _id: string
): Promise<{ success: boolean }> {
  await sleep(320);
  return { success: true };
}

export async function apiPublishTestimonial(
  _id: string,
  _published: boolean
): Promise<{ success: boolean }> {
  await sleep(280);
  return { success: true };
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
