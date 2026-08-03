/**
 * Responses fetchers for `api_v2`, split out of `semblia-api.ts` (which is at
 * its size budget) and re-exported from there so import sites stay unchanged.
 */

import type { V2PaginatedResponse, V2ResponseDTO } from "@workspace/types";
import { api, patch, del } from "./semblia-api";

export type FetchResponsesParams = {
  reviewStatus?: string;
  publishStatus?: string;
  formId?: string;
  origin?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
};

/** Query keys in wire order; falsy values are omitted from the query string. */
const RESPONSES_QUERY_KEYS = [
  "reviewStatus",
  "publishStatus",
  "formId",
  "origin",
  "page",
  "pageSize",
  "search",
  "sort",
] as const;

function toResponsesQuery(params: FetchResponsesParams): string {
  const qs = new URLSearchParams();
  for (const key of RESPONSES_QUERY_KEYS) {
    const value = params[key];
    if (value) qs.set(key, String(value));
  }
  return qs.toString();
}

export function fetchResponses(
  token: string | null,
  slug: string,
  params?: FetchResponsesParams,
) {
  const q = toResponsesQuery(params ?? {});
  return api<V2PaginatedResponse<V2ResponseDTO>>(
    `/projects/${encodeURIComponent(slug)}/responses${q ? `?${q}` : ""}`,
    token,
  );
}

export function fetchResponse(
  token: string | null,
  slug: string,
  responseId: string,
) {
  return api<V2ResponseDTO>(
    `/projects/${encodeURIComponent(slug)}/responses/${encodeURIComponent(responseId)}`,
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
