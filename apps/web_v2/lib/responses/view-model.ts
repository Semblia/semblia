/**
 * Inbox view-model for a collected response.
 *
 * `V2ResponseDTO` is answers-map shaped; the inbox cards/rows want a flat,
 * presentation-ready record. `toResponseVM` derives that once at the data
 * boundary (list/detail hooks) so the row, detail, and overview components can
 * stay simple and field-name-stable instead of each reaching into `answers`.
 */

import type { V2ResponseDTO, V2ModerationStatus } from "@workspace/types";
import { deriveResponseDisplay } from "./display";

export interface ResponseVM {
  id: string;
  authorName: string;
  authorRole: string | null;
  authorCompany: string | null;
  authorEmail: string | null;
  /** Primary free-text line; empty string when the form collected none. */
  content: string;
  rating: number | null;
  moderationStatus: V2ModerationStatus;
  moderationReason: string | null;
  /** Auto-moderation flags surfaced for reviewer triage, when present. */
  moderationFlags: string[];
  /** True when the submission arrived over a server-signed (HMAC) channel. */
  isVerified: boolean;
  formId: string | null;
  formName: string | null;
  createdAt: string;
}

function readFlags(metadata: Record<string, unknown> | null): string[] {
  if (!metadata) return [];
  const raw = metadata.moderationFlags ?? metadata.flags;
  if (Array.isArray(raw)) {
    return raw.filter((f): f is string => typeof f === "string");
  }
  return [];
}

export function toResponseVM(r: V2ResponseDTO): ResponseVM {
  const display = deriveResponseDisplay(r);
  return {
    id: r.id,
    authorName: display.authorName,
    authorRole: display.authorRole,
    authorCompany: display.authorCompany,
    authorEmail: display.email,
    content: display.primaryText ?? "",
    rating: display.rating,
    moderationStatus: r.moderationStatus,
    moderationReason: r.moderationReason,
    moderationFlags: readFlags(r.metadata),
    isVerified: r.trustMode === "HMAC",
    formId: r.formId,
    formName: r.collectionForm?.name ?? display.formName,
    createdAt: r.createdAt,
  };
}
