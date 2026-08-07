/**
 * Responses fetchers for `api_v2`, split out of `semblia-api.ts` (which is at
 * its size budget) and re-exported from there so import sites stay unchanged.
 */

import type {
  V2PaginatedResponse,
  V2ResponseDTO,
  V2ResponseDetailDTO,
  V2SendResponseThankYouBody,
} from "@workspace/types";
import { api, patch, post, del } from "./semblia-api";

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

/**
 * The single record, which carries strictly more than a list row: the author's
 * contact address, the answers marked private, and signed URLs for whatever
 * they recorded. The API gates all of that on `REVIEW_RESPONSES`, so a viewer
 * gets the same shape with `contact.canContact === false` and an empty `media`
 * — never a missing field the client has to guess about.
 */
export function fetchResponse(
  token: string | null,
  slug: string,
  responseId: string,
) {
  return api<V2ResponseDetailDTO>(
    `/projects/${encodeURIComponent(slug)}/responses/${encodeURIComponent(responseId)}`,
    token,
  );
}

export function sendResponseThankYou(
  token: string | null,
  slug: string,
  responseId: string,
  body: V2SendResponseThankYouBody,
) {
  return post<{ sentTo: string; kind: string }>(
    `/projects/${encodeURIComponent(slug)}/responses/${encodeURIComponent(responseId)}/thanks`,
    token,
    body,
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
