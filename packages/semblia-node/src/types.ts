/**
 * Public types of the Semblia SDK. These are a curated, deliberately stable
 * subset of the API's wire DTOs — every field here exists on the server DTO
 * with a compatible type, enforced at compile time by `type-parity.spec.ts`
 * against `@workspace/types`. Fields the API adds are not a breaking change;
 * fields listed here cannot silently drift.
 */

export interface SembliaEnvelope<T> {
  success: boolean;
  data: T;
  meta: { timestamp: string; [key: string]: unknown };
}

export interface SembliaPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SembliaErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface SembliaProject {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  websiteUrl: string | null;
  tags: string[];
  visibility: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SembliaFormSummary {
  id: string;
  projectId: string;
  intent: string;
  name: string;
  slug: string | null;
  status: string;
  open: boolean;
  /** Delivery mode of the published version — `null` while unpublished. */
  publishedDelivery: string | null;
  metrics: {
    views: number;
    submissions: number;
    responseRate: number | null;
    lastSubmissionAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SembliaResponse {
  id: string;
  projectId: string;
  origin: string;
  formId: string | null;
  answers: unknown[];
  ratingValue: number | null;
  ratingScale: number | null;
  authorName: string | null;
  authorRole: string | null;
  authorCompany: string | null;
  /** Whether consent permits public display; publishing is refused otherwise. */
  publishable: boolean;
  publishBlockedReason: string | null;
  reviewStatus: string;
  publishStatus: string;
  moderationReason: string | null;
  createdAt: string;
}

export interface SembliaFormRequestRecipient {
  id: string;
  email: string;
  submittedAt: string | null;
}

export interface SembliaFormRequest {
  id: string;
  projectId: string;
  formId: string;
  formName: string;
  formSlug: string | null;
  note: string | null;
  recipients: SembliaFormRequestRecipient[];
  createdAt: string;
}

export interface SembliaCreateFormRequestBody {
  formId: string;
  /** Deduplicated server-side; invalid addresses are a 400, not a silent skip. */
  emails: string[];
  note?: string | null;
}

export interface SembliaAnnotateResponseBody {
  note?: string | null;
  labels?: string[];
  sentiment?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SembliaModerateResponseBody {
  status: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}
