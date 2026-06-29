/**
 * Typed API client for `api_v2`.
 *
 * - Handles Clerk bearer tokens.
 * - Unwraps the `{ success, data, meta }` response envelope.
 * - Parses typed errors from `AllExceptionsFilter`.
 * - All date fields arrive as ISO strings — no auto-parsing.
 */

import type {
  V2ApiEnvelope,
  V2ApiMeta,
  V2ErrorResponse,
  V2PaginatedResponse,
  V2ResponseDTO,
  V2OnboardingDataDTO,
  V2OnboardingStep,
  V2UserDTO,
  V2ProjectDTO,
  V2ProjectMemberDTO,
  V2ProjectMemberRole,
  V2ProjectMemberInviteDTO,
  V2ProjectOwnershipTransferDTO,
  V2InitiateProjectOwnershipTransferBody,
  V2PublicSurfaceHostDTO,
  V2PublicCreateUploadIntentBody,
  V2WidgetDTO,
  V2StudioDraftDTO,
  V2FormSummaryDTO,
  V2FormDTO,
  V2FormDraftDTO,
  V2FormVersionDTO,
  V2FormVersionSummaryDTO,
  V2FormIntent,
  V2ApiKeyDTO,
  V2ApiKeyType,
  V2CreatedApiKeyDTO,
  V2ApiKeyEventDTO,
  V2UpdateApiKeyBody,
  V2AgentAccessOverviewDTO,
  V2BillingProfileDTO,
  V2CurrentOrganizationDTO,
  V2InvoiceDTO,
  V2PaymentMethodDTO,
  V2SubscriptionCheckoutDTO,
  V2SubscriptionDTO,
  V2LastUsedProjectDTO,
  V2SetLastUsedProjectBody,
  V2UsageDTO,
  V2UserPlan,
  V2NotificationDTO,
  V2NotificationPreferencesDTO,
  V2NotificationType,
  V2AnalyticsDashboardDTO,
  V2AnalyticsEventAckDTO,
  V2PublicSurfaceFeature,
  V2PublicSurfaceResolutionDTO,
  V2ProjectActionAuditDTO,
  V2ActorType,
  V2OutboundWebhookEndpointDTO,
  V2CreatedOutboundWebhookEndpointDTO,
  V2OutboundWebhookDeliveryDTO,
  V2CreateOutboundWebhookEndpointBody,
  V2UpdateOutboundWebhookEndpointBody,
  V2OutboundWebhookEventType,
  V2DeliveryStatus,
  V2CreateCsvExportBody,
  V2ExportDeliveryDTO,
  V2IntegrationConnectionDTO,
  V2IntegrationProvider,
  V2IntegrationResourceListDTO,
  V2CreateIntegrationConnectionBody,
  V2UpdateIntegrationConnectionBody,
  V2CreateNativeIntegrationExportBody,
  V2ProjectVisibility,
  V2CreateUploadIntentBody,
  V2UploadIntentDTO,
  V2ConfirmUploadBody,
  V2MediaAssetDTO,
} from "@workspace/types";

// ── Config ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8100";

// ── Error ───────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: V2ErrorResponse | null,
  ) {
    super(body?.error?.message ?? `API error ${status}`);
    this.name = "ApiError";
  }

  /** Stable error code from the v2 envelope (e.g. "FORBIDDEN"), when present. */
  get code(): string | null {
    return this.body?.error?.code ?? null;
  }
}

// ── Core fetch ──────────────────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
}

async function apiRaw<T>(
  path: string,
  token: string | null,
  options: RequestOptions = {},
): Promise<{ data: T; meta: V2ApiMeta }> {
  const { params, ...fetchOpts } = options;

  let url = `${API_BASE}/v2${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const search = qs.toString();
    if (search) url += `?${search}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(url, { ...fetchOpts, headers });

  if (!res.ok) {
    let body: V2ErrorResponse | null = null;
    try {
      body = (await res.json()) as V2ErrorResponse;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, body);
  }

  // 204 No Content
  if (res.status === 204) {
    return {
      data: undefined as unknown as T,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  const envelope = (await res.json()) as V2ApiEnvelope<T>;
  return { data: envelope.data, meta: envelope.meta };
}

/** Unwrapped fetch — returns only `data`. */
async function api<T>(
  path: string,
  token: string | null,
  options: RequestOptions = {},
): Promise<T> {
  const { data } = await apiRaw<T>(path, token, options);
  return data;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function post<T>(
  path: string,
  token: string | null,
  body?: unknown,
): Promise<T> {
  return api<T>(path, token, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function patch<T>(
  path: string,
  token: string | null,
  body?: unknown,
): Promise<T> {
  return api<T>(path, token, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function put<T>(
  path: string,
  token: string | null,
  body?: unknown,
): Promise<T> {
  return api<T>(path, token, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function del<T = void>(path: string, token: string | null): Promise<T> {
  return api<T>(path, token, { method: "DELETE" });
}

// ── Current user ────────────────────────────────────────────────────────────

export function fetchCurrentUser(token: string | null) {
  return api<V2UserDTO>("/me", token);
}

export function updateCurrentUser(
  token: string | null,
  body: {
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  },
) {
  return patch<V2UserDTO>("/me", token, body);
}

export function completeOnboarding(token: string | null) {
  return post<V2UserDTO>("/me/onboarding/complete", token);
}

export function updateOnboardingProgress(
  token: string | null,
  body: {
    step: Exclude<V2OnboardingStep, "COMPLETED">;
    data?: V2OnboardingDataDTO;
  },
) {
  return patch<V2UserDTO>("/me/onboarding", token, body);
}

export function fetchLastUsedProject(token: string | null) {
  return api<V2LastUsedProjectDTO>("/me/last-used-project", token);
}

export function setLastUsedProject(
  token: string | null,
  body: V2SetLastUsedProjectBody,
) {
  return put<V2LastUsedProjectDTO>("/me/last-used-project", token, body);
}

// ── Organization ────────────────────────────────────────────────────────────

export function fetchCurrentOrganization(token: string | null) {
  return api<V2CurrentOrganizationDTO>("/organizations/current", token);
}

// ── Notifications ──────────────────────────────────────────────────────────

export type NotificationListParams = {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
  type?: V2NotificationType;
};

export function fetchNotifications(
  token: string | null,
  params?: NotificationListParams,
) {
  return api<V2PaginatedResponse<V2NotificationDTO>>("/notifications", token, {
    params: params as Record<string, string | number | boolean>,
  });
}

export function fetchUnreadNotificationCount(token: string | null) {
  return api<{ count: number }>("/notifications/unread-count", token);
}

export function markNotificationRead(
  token: string | null,
  notificationId: string,
) {
  return post<V2NotificationDTO>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    token,
  );
}

export function markAllNotificationsRead(token: string | null) {
  return post<{ updatedCount: number }>("/notifications/read-all", token);
}

export function fetchNotificationPreferences(token: string | null) {
  return api<V2NotificationPreferencesDTO>("/notifications/preferences", token);
}

export function updateNotificationPreferences(
  token: string | null,
  body: {
    emailEnabled?: boolean;
    typePreferences?: V2NotificationPreferencesDTO["typePreferences"];
  },
) {
  return put<V2NotificationPreferencesDTO>(
    "/notifications/preferences",
    token,
    body,
  );
}

// ── Media ──────────────────────────────────────────────────────────────────

export function createUploadIntent(
  token: string | null,
  body: V2CreateUploadIntentBody,
) {
  return post<V2UploadIntentDTO>("/media/upload-intents", token, body);
}

export function confirmUpload(
  token: string | null,
  assetId: string,
  body: V2ConfirmUploadBody,
) {
  return post<V2MediaAssetDTO>(
    `/media/${encodeURIComponent(assetId)}/confirm`,
    token,
    body,
  );
}

export function createPublicUploadIntent(
  slug: string,
  body: V2PublicCreateUploadIntentBody,
) {
  return post<V2UploadIntentDTO>(
    `/public-surfaces/${encodeURIComponent(slug)}/media/upload-intents`,
    null,
    body,
  );
}

export function deleteMediaAsset(token: string | null, assetId: string) {
  return del<V2MediaAssetDTO>(`/media/${encodeURIComponent(assetId)}`, token);
}

// ── Projects ────────────────────────────────────────────────────────────────

export function fetchProjects(
  token: string | null,
  params?: { page?: number; pageSize?: number },
) {
  return api<V2PaginatedResponse<V2ProjectDTO>>("/projects", token, {
    params: params as Record<string, string | number>,
  });
}

export function fetchProjectBySlug(token: string | null, slug: string) {
  return api<V2ProjectDTO>(`/projects/${encodeURIComponent(slug)}`, token);
}

export function createProject(
  token: string | null,
  body: {
    name: string;
    slug: string;
    projectType?: string;
    shortDescription?: string;
    websiteUrl?: string;
    logoAssetId?: string | null;
    brandColorPrimary?: string | null;
    brandColorSecondary?: string | null;
    visibility?: V2ProjectVisibility;
    isActive?: boolean;
    autoModeration?: boolean;
    autoApproveVerified?: boolean;
    profanityFilterLevel?: string | null;
  },
) {
  return post<V2ProjectDTO>("/projects", token, body);
}

export function updateProject(
  token: string | null,
  slug: string,
  body: Record<string, unknown>,
) {
  return patch<V2ProjectDTO>(
    `/projects/${encodeURIComponent(slug)}`,
    token,
    body,
  );
}

export function deleteProject(token: string | null, slug: string) {
  return del(`/projects/${encodeURIComponent(slug)}`, token);
}

// ── Project members ─────────────────────────────────────────────────────────

export function fetchProjectMembers(token: string | null, slug: string) {
  return api<V2ProjectMemberDTO[]>(
    `/projects/${encodeURIComponent(slug)}/members`,
    token,
  );
}

export function addProjectMember(
  token: string | null,
  slug: string,
  body: { userId: string; role?: V2ProjectMemberRole },
) {
  return post<V2ProjectMemberDTO>(
    `/projects/${encodeURIComponent(slug)}/members`,
    token,
    body,
  );
}

export function updateProjectMember(
  token: string | null,
  slug: string,
  userId: string,
  body: { role: V2ProjectMemberRole },
) {
  return patch<V2ProjectMemberDTO>(
    `/projects/${encodeURIComponent(slug)}/members/${encodeURIComponent(userId)}`,
    token,
    body,
  );
}

export function removeProjectMember(
  token: string | null,
  slug: string,
  userId: string,
) {
  return del(
    `/projects/${encodeURIComponent(slug)}/members/${encodeURIComponent(userId)}`,
    token,
  );
}

// ── Project member invites ──────────────────────────────────────────────────

export function fetchProjectMemberInvites(token: string | null, slug: string) {
  return api<V2ProjectMemberInviteDTO[]>(
    `/projects/${encodeURIComponent(slug)}/members/invites`,
    token,
  );
}

export function createProjectMemberInvite(
  token: string | null,
  slug: string,
  body: { email: string; role?: V2ProjectMemberRole },
) {
  return post<V2ProjectMemberInviteDTO>(
    `/projects/${encodeURIComponent(slug)}/members/invites`,
    token,
    body,
  );
}

export function revokeProjectMemberInvite(
  token: string | null,
  slug: string,
  inviteId: string,
) {
  return del(
    `/projects/${encodeURIComponent(slug)}/members/invites/${encodeURIComponent(inviteId)}`,
    token,
  );
}

export function acceptProjectMemberInvite(
  token: string | null,
  inviteId: string,
) {
  return post<{
    invite: V2ProjectMemberInviteDTO;
    member: V2ProjectMemberDTO;
  }>(`/me/project-invites/${encodeURIComponent(inviteId)}/accept`, token);
}

// ── Project ownership transfers ─────────────────────────────────────────────

export function fetchProjectOwnershipTransfer(
  token: string | null,
  slug: string,
) {
  return api<V2ProjectOwnershipTransferDTO | null>(
    `/projects/${encodeURIComponent(slug)}/ownership-transfer`,
    token,
  );
}

export function initiateProjectOwnershipTransfer(
  token: string | null,
  slug: string,
  body: V2InitiateProjectOwnershipTransferBody,
) {
  return post<V2ProjectOwnershipTransferDTO>(
    `/projects/${encodeURIComponent(slug)}/ownership-transfer`,
    token,
    body,
  );
}

export function cancelProjectOwnershipTransfer(
  token: string | null,
  slug: string,
) {
  return del<V2ProjectOwnershipTransferDTO | null>(
    `/projects/${encodeURIComponent(slug)}/ownership-transfer`,
    token,
  );
}

export function fetchMyProjectTransfers(token: string | null) {
  return api<V2ProjectOwnershipTransferDTO[]>("/me/project-transfers", token);
}

export function acceptProjectTransfer(
  token: string | null,
  transferId: string,
) {
  return post<V2ProjectOwnershipTransferDTO>(
    `/me/project-transfers/${encodeURIComponent(transferId)}/accept`,
    token,
  );
}

export function declineProjectTransfer(
  token: string | null,
  transferId: string,
) {
  return post<V2ProjectOwnershipTransferDTO>(
    `/me/project-transfers/${encodeURIComponent(transferId)}/decline`,
    token,
  );
}

// ── Project public-surface hosts ────────────────────────────────────────────

export function fetchPublicSurfaceHosts(token: string | null, slug: string) {
  return api<V2PublicSurfaceHostDTO[]>(
    `/projects/${encodeURIComponent(slug)}/public-surface-hosts`,
    token,
  );
}

// ── Project allowed origins ─────────────────────────────────────────────────

export function fetchAllowedOrigins(token: string | null, slug: string) {
  return api<{ origins: string[] }>(
    `/projects/${encodeURIComponent(slug)}/allowed-origins`,
    token,
  );
}

export function replaceAllowedOrigins(
  token: string | null,
  slug: string,
  origins: string[],
) {
  return put<{ origins: string[] }>(
    `/projects/${encodeURIComponent(slug)}/allowed-origins`,
    token,
    { origins },
  );
}

// ── Project signing secret ──────────────────────────────────────────────────

export function generateSigningSecret(token: string | null, slug: string) {
  return post<{ secret: string; createdAt: string }>(
    `/projects/${encodeURIComponent(slug)}/signing-secret`,
    token,
  );
}

export function clearSigningSecret(token: string | null, slug: string) {
  return del(`/projects/${encodeURIComponent(slug)}/signing-secret`, token);
}

// ── Project analytics and public analytics events ──────────────────────────

export type AnalyticsDashboardParams = {
  days?: number;
  compare?: "prev" | "none";
};

export function fetchAnalyticsDashboard(
  token: string | null,
  slug: string,
  params?: AnalyticsDashboardParams,
) {
  return api<V2AnalyticsDashboardDTO>(
    `/projects/${encodeURIComponent(slug)}/analytics/dashboard`,
    token,
    { params: params as Record<string, string | number> },
  );
}

export type FormViewEventBody = {
  projectSlug: string;
  formId?: string;
};

export type WidgetLoadEventBody = {
  widgetId: string;
  loadTimeMs?: number;
  browser?: string;
  device?: string;
  country?: string;
  errorCode?: string;
  version?: string;
};

export type SubmissionImpressionEventBody = {
  submissionId: string;
  widgetId: string;
  device?: string;
  country?: string;
};

export type HostedPageViewEventBody =
  | { hostname: string; projectSlug?: string }
  | { hostname?: string; projectSlug: string };

export function recordFormViewEvent(body: FormViewEventBody) {
  return post<V2AnalyticsEventAckDTO>(
    "/analytics/events/form-view",
    null,
    body,
  );
}

export function recordWidgetLoadEvent(body: WidgetLoadEventBody) {
  return post<V2AnalyticsEventAckDTO>(
    "/analytics/events/widget-load",
    null,
    body,
  );
}

export function recordSubmissionImpressionEvent(
  body: SubmissionImpressionEventBody,
) {
  return post<V2AnalyticsEventAckDTO>(
    "/analytics/events/submission-impression",
    null,
    body,
  );
}

export function recordHostedPageViewEvent(body: HostedPageViewEventBody) {
  return post<V2AnalyticsEventAckDTO>(
    "/analytics/events/hosted-page-view",
    null,
    body,
  );
}

// ── Public surface resolution ──────────────────────────────────────────────

export type PublicSurfaceResolutionParams = {
  hostname: string;
  feature?: V2PublicSurfaceFeature;
};

export function resolvePublicSurface(params: PublicSurfaceResolutionParams) {
  return api<V2PublicSurfaceResolutionDTO>("/public-surfaces/resolve", null, {
    params,
  });
}

// ── Project action audit ───────────────────────────────────────────────────

export type ProjectActionAuditParams = {
  page?: number;
  pageSize?: number;
  actorType?: V2ActorType;
  action?: string;
  targetType?: string;
};

export function fetchProjectActionAudit(
  token: string | null,
  slug: string,
  params?: ProjectActionAuditParams,
) {
  return api<V2PaginatedResponse<V2ProjectActionAuditDTO>>(
    `/projects/${encodeURIComponent(slug)}/action-audit`,
    token,
    { params: params as Record<string, string | number> },
  );
}

// ── Forms ─────────────────────────────────────────────────────────────────
//
// The collection surface (spec §"Form Studio"). `Form` is the editable draft
// source; publishing compiles an immutable `FormVersion` snapshot. Routes are
// project-scoped + capability-guarded (MANAGE_PUBLISH_SURFACES). Drafts use
// PATCH with optimistic `expectedVersion` (note: widgets use PUT — they differ).

export function fetchForms(token: string | null, slug: string) {
  return api<V2FormSummaryDTO[]>(
    `/projects/${encodeURIComponent(slug)}/forms`,
    token,
  );
}

export function fetchForm(token: string | null, slug: string, formId: string) {
  return api<V2FormDTO>(
    `/projects/${encodeURIComponent(slug)}/forms/${encodeURIComponent(formId)}`,
    token,
  );
}

export function createForm(
  token: string | null,
  slug: string,
  body: { intent: V2FormIntent; name?: string },
) {
  return post<V2FormDTO>(
    `/projects/${encodeURIComponent(slug)}/forms`,
    token,
    body,
  );
}

export function updateForm(
  token: string | null,
  slug: string,
  formId: string,
  body: { name?: string; slug?: string; open?: boolean },
) {
  return patch<V2FormDTO>(
    `/projects/${encodeURIComponent(slug)}/forms/${encodeURIComponent(formId)}`,
    token,
    body,
  );
}

export function deleteForm(token: string | null, slug: string, formId: string) {
  return del(
    `/projects/${encodeURIComponent(slug)}/forms/${encodeURIComponent(formId)}`,
    token,
  );
}

export function fetchFormDraft(
  token: string | null,
  slug: string,
  formId: string,
) {
  return api<V2FormDraftDTO>(
    `/projects/${encodeURIComponent(slug)}/forms/${encodeURIComponent(formId)}/draft`,
    token,
  );
}

export function saveFormDraft(
  token: string | null,
  slug: string,
  formId: string,
  body: { draft: Record<string, unknown>; expectedVersion: number },
) {
  return patch<V2FormDraftDTO>(
    `/projects/${encodeURIComponent(slug)}/forms/${encodeURIComponent(formId)}/draft`,
    token,
    body,
  );
}

export function publishForm(
  token: string | null,
  slug: string,
  formId: string,
) {
  return post<V2FormVersionDTO>(
    `/projects/${encodeURIComponent(slug)}/forms/${encodeURIComponent(formId)}/publish`,
    token,
  );
}

export function fetchFormVersions(
  token: string | null,
  slug: string,
  formId: string,
) {
  return api<V2FormVersionSummaryDTO[]>(
    `/projects/${encodeURIComponent(slug)}/forms/${encodeURIComponent(formId)}/versions`,
    token,
  );
}

export function fetchFormVersion(
  token: string | null,
  slug: string,
  formId: string,
  version: number,
) {
  return api<V2FormVersionDTO>(
    `/projects/${encodeURIComponent(slug)}/forms/${encodeURIComponent(formId)}/versions/${version}`,
    token,
  );
}

// ── Widgets ─────────────────────────────────────────────────────────────────

export function fetchWidgets(token: string | null, slug: string) {
  // The list endpoint returns full `V2WidgetDTO`s (id + projectId + entry + config),
  // not bare list entries. Consumers read `dto.entry` for the summary fields.
  return api<V2WidgetDTO[]>(
    `/projects/${encodeURIComponent(slug)}/widgets`,
    token,
  );
}

export function fetchWidget(
  token: string | null,
  slug: string,
  widgetId: string,
) {
  return api<V2WidgetDTO>(
    `/projects/${encodeURIComponent(slug)}/widgets/${encodeURIComponent(widgetId)}`,
    token,
  );
}

export function createWidget(
  token: string | null,
  slug: string,
  body: Record<string, unknown>,
) {
  return post<V2WidgetDTO>(
    `/projects/${encodeURIComponent(slug)}/widgets`,
    token,
    body,
  );
}

export function duplicateWidget(
  token: string | null,
  slug: string,
  widgetId: string,
): Promise<V2WidgetDTO> {
  return post<V2WidgetDTO>(
    `/projects/${encodeURIComponent(slug)}/widgets/${encodeURIComponent(widgetId)}/duplicate`,
    token,
  );
}

export function updateWidget(
  token: string | null,
  slug: string,
  widgetId: string,
  body: Record<string, unknown>,
) {
  return patch<V2WidgetDTO>(
    `/projects/${encodeURIComponent(slug)}/widgets/${encodeURIComponent(widgetId)}`,
    token,
    body,
  );
}

export function deleteWidget(
  token: string | null,
  slug: string,
  widgetId: string,
) {
  return del(
    `/projects/${encodeURIComponent(slug)}/widgets/${encodeURIComponent(widgetId)}`,
    token,
  );
}

export function fetchWidgetDraft(
  token: string | null,
  slug: string,
  widgetId: string,
) {
  return api<V2StudioDraftDTO>(
    `/projects/${encodeURIComponent(slug)}/widgets/${encodeURIComponent(widgetId)}/draft`,
    token,
  );
}

export function saveWidgetDraft(
  token: string | null,
  slug: string,
  widgetId: string,
  body: { draft: Record<string, unknown>; expectedVersion: number },
) {
  return put<V2StudioDraftDTO>(
    `/projects/${encodeURIComponent(slug)}/widgets/${encodeURIComponent(widgetId)}/draft`,
    token,
    body,
  );
}

export function publishWidgetDraft(
  token: string | null,
  slug: string,
  widgetId: string,
  body: { expectedVersion: number },
) {
  return put<V2WidgetDTO>(
    `/projects/${encodeURIComponent(slug)}/widgets/${encodeURIComponent(widgetId)}/draft/publish`,
    token,
    body,
  );
}

// ── Responses ───────────────────────────────────────────────────────────────

export function fetchResponses(
  token: string | null,
  slug: string,
  params?: {
    reviewStatus?: string;
    publishStatus?: string;
    page?: number;
    pageSize?: number;
    search?: string;
    sort?: string;
  },
) {
  const qs = new URLSearchParams();
  if (params?.reviewStatus) qs.set("reviewStatus", params.reviewStatus);
  if (params?.publishStatus) qs.set("publishStatus", params.publishStatus);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.search) qs.set("search", params.search);
  if (params?.sort) qs.set("sort", params.sort);
  const q = qs.toString();
  return api<V2PaginatedResponse<V2ResponseDTO>>(
    `/projects/${encodeURIComponent(slug)}/responses${q ? `?${q}` : ""}`,
    token,
  );
}

export function updateResponseStatus(
  token: string | null,
  slug: string,
  responseId: string,
  body: { status: string; reason?: string | null },
) {
  return patch<V2ResponseDTO>(
    `/projects/${encodeURIComponent(slug)}/responses/${encodeURIComponent(responseId)}/status`,
    token,
    body,
  );
}

export function updateResponsePublish(
  token: string | null,
  slug: string,
  responseId: string,
  body: { status: string },
) {
  return patch<V2ResponseDTO>(
    `/projects/${encodeURIComponent(slug)}/responses/${encodeURIComponent(responseId)}/publish`,
    token,
    body,
  );
}

export function deleteResponse(
  token: string | null,
  slug: string,
  responseId: string,
) {
  return del(
    `/projects/${encodeURIComponent(slug)}/responses/${encodeURIComponent(responseId)}`,
    token,
  );
}

// ── Outbound webhooks ───────────────────────────────────────────────────────

export type OutboundWebhookDeliveriesParams = {
  page?: number;
  pageSize?: number;
  endpointId?: string;
  status?: V2DeliveryStatus | "ALL";
  eventType?: V2OutboundWebhookEventType;
};

export function fetchOutboundWebhookEndpoints(
  token: string | null,
  slug: string,
) {
  return api<V2OutboundWebhookEndpointDTO[]>(
    `/projects/${encodeURIComponent(slug)}/outbound-webhooks`,
    token,
  );
}

export function fetchOutboundWebhookEndpoint(
  token: string | null,
  slug: string,
  endpointId: string,
) {
  return api<V2OutboundWebhookEndpointDTO>(
    `/projects/${encodeURIComponent(slug)}/outbound-webhooks/${encodeURIComponent(endpointId)}`,
    token,
  );
}

export function createOutboundWebhookEndpoint(
  token: string | null,
  slug: string,
  body: V2CreateOutboundWebhookEndpointBody,
) {
  return post<V2CreatedOutboundWebhookEndpointDTO>(
    `/projects/${encodeURIComponent(slug)}/outbound-webhooks`,
    token,
    body,
  );
}

export function updateOutboundWebhookEndpoint(
  token: string | null,
  slug: string,
  endpointId: string,
  body: V2UpdateOutboundWebhookEndpointBody,
) {
  return patch<V2OutboundWebhookEndpointDTO>(
    `/projects/${encodeURIComponent(slug)}/outbound-webhooks/${encodeURIComponent(endpointId)}`,
    token,
    body,
  );
}

export function disableOutboundWebhookEndpoint(
  token: string | null,
  slug: string,
  endpointId: string,
) {
  return post<V2OutboundWebhookEndpointDTO>(
    `/projects/${encodeURIComponent(slug)}/outbound-webhooks/${encodeURIComponent(endpointId)}/disable`,
    token,
  );
}

export function revokeOutboundWebhookEndpoint(
  token: string | null,
  slug: string,
  endpointId: string,
) {
  return post<V2OutboundWebhookEndpointDTO>(
    `/projects/${encodeURIComponent(slug)}/outbound-webhooks/${encodeURIComponent(endpointId)}/revoke`,
    token,
  );
}

export function rotateOutboundWebhookSecret(
  token: string | null,
  slug: string,
  endpointId: string,
) {
  return post<V2CreatedOutboundWebhookEndpointDTO>(
    `/projects/${encodeURIComponent(slug)}/outbound-webhooks/${encodeURIComponent(endpointId)}/rotate-secret`,
    token,
  );
}

export function fetchOutboundWebhookDeliveries(
  token: string | null,
  slug: string,
  params?: OutboundWebhookDeliveriesParams,
) {
  return api<V2PaginatedResponse<V2OutboundWebhookDeliveryDTO>>(
    `/projects/${encodeURIComponent(slug)}/outbound-webhooks/deliveries`,
    token,
    { params: params as Record<string, string | number> },
  );
}

export function fetchOutboundWebhookDelivery(
  token: string | null,
  slug: string,
  deliveryId: string,
) {
  return api<V2OutboundWebhookDeliveryDTO>(
    `/projects/${encodeURIComponent(slug)}/outbound-webhooks/deliveries/${encodeURIComponent(deliveryId)}`,
    token,
  );
}

export function retryOutboundWebhookDelivery(
  token: string | null,
  slug: string,
  deliveryId: string,
) {
  return post<V2OutboundWebhookDeliveryDTO>(
    `/projects/${encodeURIComponent(slug)}/outbound-webhooks/deliveries/${encodeURIComponent(deliveryId)}/retry`,
    token,
  );
}

// ── Exports ────────────────────────────────────────────────────────────────

export type ExportDeliveriesParams = {
  page?: number;
  pageSize?: number;
  status?: V2DeliveryStatus | "ALL";
};

export function createCsvExport(
  token: string | null,
  slug: string,
  body?: V2CreateCsvExportBody,
) {
  return post<V2ExportDeliveryDTO>(
    `/projects/${encodeURIComponent(slug)}/exports/csv`,
    token,
    body,
  );
}

export function fetchExportDeliveries(
  token: string | null,
  slug: string,
  params?: ExportDeliveriesParams,
) {
  return api<V2PaginatedResponse<V2ExportDeliveryDTO>>(
    `/projects/${encodeURIComponent(slug)}/exports/deliveries`,
    token,
    { params: params as Record<string, string | number> },
  );
}

export function fetchExportDelivery(
  token: string | null,
  slug: string,
  deliveryId: string,
) {
  return api<V2ExportDeliveryDTO>(
    `/projects/${encodeURIComponent(slug)}/exports/deliveries/${encodeURIComponent(deliveryId)}`,
    token,
  );
}

/**
 * Fetches a completed export's CSV artifact. The API responds with a 302 to a
 * signed storage URL; `fetch` follows it transparently (and strips the bearer
 * header on the cross-origin hop), so we read the artifact body straight off
 * the resolved response. Returns the blob plus a filename derived from
 * `Content-Disposition` when the storage layer provides one.
 */
export async function downloadExport(
  token: string | null,
  slug: string,
  deliveryId: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(
    `${API_BASE}/v2/projects/${encodeURIComponent(slug)}/exports/deliveries/${encodeURIComponent(deliveryId)}/download`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );

  if (!res.ok) {
    let body: V2ErrorResponse | null = null;
    try {
      body = (await res.json()) as V2ErrorResponse;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, body);
  }

  const disposition = res.headers.get("content-disposition");
  const filename =
    disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1] ??
    `export-${deliveryId.slice(0, 8)}.csv`;

  return { blob: await res.blob(), filename: decodeURIComponent(filename) };
}

// ── Native integrations ────────────────────────────────────────────────────

export function fetchIntegrationConnections(
  token: string | null,
  slug: string,
) {
  return api<V2IntegrationConnectionDTO[]>(
    `/projects/${encodeURIComponent(slug)}/integrations`,
    token,
  );
}

export function createIntegrationConnection(
  token: string | null,
  slug: string,
  body: V2CreateIntegrationConnectionBody,
) {
  return post<V2IntegrationConnectionDTO>(
    `/projects/${encodeURIComponent(slug)}/integrations/connections`,
    token,
    body,
  );
}

export function fetchIntegrationResources(
  token: string | null,
  slug: string,
  provider: V2IntegrationProvider,
  params?: { cursor?: string; query?: string },
) {
  return api<V2IntegrationResourceListDTO>(
    `/projects/${encodeURIComponent(slug)}/integrations/providers/${encodeURIComponent(provider)}/resources`,
    token,
    { params },
  );
}

export function updateIntegrationConnection(
  token: string | null,
  slug: string,
  connectionId: string,
  body: V2UpdateIntegrationConnectionBody,
) {
  return patch<V2IntegrationConnectionDTO>(
    `/projects/${encodeURIComponent(slug)}/integrations/connections/${encodeURIComponent(connectionId)}`,
    token,
    body,
  );
}

export function enableIntegrationConnection(
  token: string | null,
  slug: string,
  connectionId: string,
) {
  return post<V2IntegrationConnectionDTO>(
    `/projects/${encodeURIComponent(slug)}/integrations/connections/${encodeURIComponent(connectionId)}/enable`,
    token,
  );
}

export function disableIntegrationConnection(
  token: string | null,
  slug: string,
  connectionId: string,
) {
  return post<V2IntegrationConnectionDTO>(
    `/projects/${encodeURIComponent(slug)}/integrations/connections/${encodeURIComponent(connectionId)}/disable`,
    token,
  );
}

export function revokeIntegrationConnection(
  token: string | null,
  slug: string,
  connectionId: string,
) {
  return del<V2IntegrationConnectionDTO>(
    `/projects/${encodeURIComponent(slug)}/integrations/connections/${encodeURIComponent(connectionId)}`,
    token,
  );
}

export function createNativeIntegrationExport(
  token: string | null,
  slug: string,
  connectionId: string,
  body: V2CreateNativeIntegrationExportBody,
) {
  return post<V2ExportDeliveryDTO>(
    `/projects/${encodeURIComponent(slug)}/integrations/connections/${encodeURIComponent(connectionId)}/exports`,
    token,
    body,
  );
}

// ── API keys ────────────────────────────────────────────────────────────────

export function fetchApiKeys(token: string | null, slug: string) {
  return api<V2ApiKeyDTO[]>(
    `/projects/${encodeURIComponent(slug)}/api-keys`,
    token,
  );
}

export function createApiKey(
  token: string | null,
  slug: string,
  body: { name: string; scopes?: string[]; expiresAt?: string },
) {
  return post<V2CreatedApiKeyDTO>(
    `/projects/${encodeURIComponent(slug)}/api-keys`,
    token,
    body,
  );
}

export function rotateApiKey(
  token: string | null,
  slug: string,
  keyId: string,
) {
  return post<V2CreatedApiKeyDTO>(
    `/projects/${encodeURIComponent(slug)}/api-keys/${encodeURIComponent(keyId)}/rotate`,
    token,
  );
}

export function updateApiKey(
  token: string | null,
  slug: string,
  keyId: string,
  body: V2UpdateApiKeyBody,
  keyType?: Extract<V2ApiKeyType, "SECRET" | "AGENT">,
) {
  return api<V2ApiKeyDTO>(
    `/projects/${encodeURIComponent(slug)}/api-keys/${encodeURIComponent(keyId)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      params: keyType ? { keyType } : undefined,
    },
  );
}

export function revokeApiKey(
  token: string | null,
  slug: string,
  keyId: string,
) {
  return post<V2ApiKeyDTO>(
    `/projects/${encodeURIComponent(slug)}/api-keys/${encodeURIComponent(keyId)}/revoke`,
    token,
  );
}

export function fetchApiKeyEvents(
  token: string | null,
  slug: string,
  keyId: string,
) {
  return api<V2ApiKeyEventDTO[]>(
    `/projects/${encodeURIComponent(slug)}/api-keys/${encodeURIComponent(keyId)}/events`,
    token,
  );
}

// ── Agent access ────────────────────────────────────────────────────────────

export function fetchAgentAccessOverview(token: string | null, slug: string) {
  return api<V2AgentAccessOverviewDTO>(
    `/projects/${encodeURIComponent(slug)}/agent-access`,
    token,
  );
}

export function createAgentKey(
  token: string | null,
  slug: string,
  body: { name: string; preset: string },
) {
  return post<V2CreatedApiKeyDTO>(
    `/projects/${encodeURIComponent(slug)}/agent-access/keys`,
    token,
    body,
  );
}

export function revokeAgentKey(
  token: string | null,
  slug: string,
  keyId: string,
) {
  return post<V2ApiKeyDTO>(
    `/projects/${encodeURIComponent(slug)}/agent-access/keys/${encodeURIComponent(keyId)}/revoke`,
    token,
  );
}

export function fetchAgentActions(token: string | null, slug: string) {
  return api<V2ApiKeyEventDTO[]>(
    `/projects/${encodeURIComponent(slug)}/agent-access/actions`,
    token,
  );
}

// ── Account billing ─────────────────────────────────────────────────────────

export function fetchSubscription(token: string | null) {
  return api<V2SubscriptionDTO>("/account/subscription", token);
}

export function cancelSubscription(token: string | null) {
  return post<V2SubscriptionDTO>("/account/subscription/cancel", token);
}

export function switchSubscriptionPlan(
  token: string | null,
  planId: V2UserPlan,
) {
  return post<V2SubscriptionDTO>("/account/subscription/switch", token, {
    planId,
  });
}

export function createSubscriptionCheckout(
  token: string | null,
  planId: V2UserPlan,
) {
  return post<V2SubscriptionCheckoutDTO>(
    "/account/subscription/checkout",
    token,
    {
      planId,
    },
  );
}

export function fetchPaymentMethods(token: string | null) {
  return api<V2PaymentMethodDTO[]>("/account/payment-methods", token);
}

export function fetchInvoicesApi(token: string | null) {
  return api<V2InvoiceDTO[]>("/account/invoices", token);
}

export function fetchBillingProfile(token: string | null) {
  return api<V2BillingProfileDTO>("/account/billing-profile", token);
}

export function updateBillingProfile(
  token: string | null,
  body: Partial<V2BillingProfileDTO>,
) {
  return patch<V2BillingProfileDTO>("/account/billing-profile", token, body);
}

export function fetchBillingUsage(token: string | null) {
  return api<V2UsageDTO>("/account/usage", token);
}

// ── Re-exports for convenience ──────────────────────────────────────────────

export { ApiError as SembliaApiError };
export type { V2ApiMeta, V2ApiEnvelope, V2ErrorResponse };
