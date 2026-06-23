/**
 * Local display type for the widget preview renderers.
 *
 * The widgets/walls feature is a public *display* surface — it renders approved
 * feedback as social-proof cards. It keeps a flat display projection local to
 * web_v2 instead of coupling to the collection/response DTOs.
 *
 * Real approved + published `FormResponse`s are projected onto this type for the
 * studio preview via `response-to-testimonial`; `widget-fallback-testimonials`
 * tops up the preview when a project has too few real ones to read well.
 */

import type { V2MediaAssetDTO } from "@workspace/types";

/** Display-only feedback medium for widget cards. */
export type WidgetFeedbackType = "TEXT" | "VIDEO" | "AUDIO";

/** Display-only moderation badge state for widget cards. */
export type WidgetModerationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "FLAGGED";

export interface WidgetTestimonial {
  id: string;
  projectId: string;
  formId: string | null;
  authorName: string;
  authorEmail: string | null;
  authorRole: string | null;
  authorCompany: string | null;
  authorAvatar: V2MediaAssetDTO | null;
  content: string;
  type: WidgetFeedbackType;
  video: V2MediaAssetDTO | null;
  media: V2MediaAssetDTO | null;
  source: string | null;
  sourceUrl: string | null;
  isPublished: boolean;
  rating: number | null;
  isApproved: boolean;
  isOAuthVerified: boolean;
  oauthProvider: string | null;
  moderationStatus: WidgetModerationStatus;
  moderationScore: number | null;
  moderationFlags: string[] | null;
  autoPublished: boolean;
  createdAt: string;
  updatedAt: string;
  tags: { id: string; name: string }[];
}
