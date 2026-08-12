/**
 * Form-request ("request a testimonial") fetchers for `api`, split out
 * alongside `responses-api.ts` — outreach is its own surface, not a forms or
 * responses concern.
 */

import type {
  V2CreateFormRequestBody,
  V2FormRequestDTO,
} from "@workspace/types";
import { api, post } from "./semblia-api";

export type FetchFormRequestsParams = {
  formId?: string;
};

export function fetchFormRequests(
  token: string | null,
  slug: string,
  params?: FetchFormRequestsParams,
) {
  const q = params?.formId
    ? `?formId=${encodeURIComponent(params.formId)}`
    : "";
  return api<V2FormRequestDTO[]>(
    `/projects/${encodeURIComponent(slug)}/form-requests${q}`,
    token,
  );
}

export function createFormRequest(
  token: string | null,
  slug: string,
  body: V2CreateFormRequestBody,
) {
  return post<V2FormRequestDTO>(
    `/projects/${encodeURIComponent(slug)}/form-requests`,
    token,
    body,
  );
}
