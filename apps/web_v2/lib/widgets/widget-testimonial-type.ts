/**
 * Local display type for the widget preview renderers.
 *
 * The widgets/walls feature is a public *display* surface — it renders approved
 * feedback as social-proof cards. It used to borrow the inbox's `V2TestimonialDTO`,
 * but that DTO was retired when the collection pipeline moved to the generic
 * `V2ResponseDTO` (answers-map shaped). The card renderers only ever needed a
 * flat display projection, so we keep that shape local to web_v2 instead of
 * coupling the display layer to the collection DTO.
 *
 * Live preview data is mapped into this shape from `V2ResponseDTO` via
 * `deriveResponseDisplay` in `@/lib/responses/display`; the studio fallback
 * sample set builds it directly.
 */

import type {
  V2FeedbackType,
  V2ModerationStatus,
  V2MediaAssetDTO,
  V2ResponseDTO,
} from "@workspace/types";
import { deriveResponseDisplay } from "@/lib/responses/display";

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
  type: V2FeedbackType;
  video: V2MediaAssetDTO | null;
  media: V2MediaAssetDTO | null;
  source: string | null;
  sourceUrl: string | null;
  isPublished: boolean;
  rating: number | null;
  isApproved: boolean;
  isOAuthVerified: boolean;
  oauthProvider: string | null;
  moderationStatus: V2ModerationStatus;
  moderationScore: number | null;
  moderationFlags: string[] | null;
  autoPublished: boolean;
  createdAt: string;
  updatedAt: string;
  tags: { id: string; name: string }[];
}

/**
 * Project a canonical `V2ResponseDTO` onto the flat widget display shape.
 *
 * The widget previews only consume a card projection (name, text, rating,
 * verification badge). Fields with no answers-map equivalent (avatar/video/
 * media assets, OAuth provider, moderation score) default to null/false — the
 * preview never relied on them for the live "approved feedback" path.
 */
export function toWidgetTestimonial(
  response: V2ResponseDTO,
): WidgetTestimonial {
  const display = deriveResponseDisplay(response);
  const metadata: Record<string, unknown> = response.metadata ?? {};
  const flags = metadata.moderationFlags ?? metadata.flags;

  return {
    id: response.id,
    projectId: response.projectId,
    formId: response.formId,
    authorName: display.authorName,
    authorEmail: display.email,
    authorRole: display.authorRole,
    authorCompany: display.authorCompany,
    authorAvatar: null,
    content: display.primaryText ?? "",
    type: "TEXT",
    video: null,
    media: null,
    source: typeof metadata.source === "string" ? metadata.source : null,
    sourceUrl:
      typeof metadata.sourceUrl === "string" ? metadata.sourceUrl : null,
    isPublished: response.moderationStatus === "APPROVED",
    rating: display.rating,
    isApproved: response.moderationStatus === "APPROVED",
    isOAuthVerified: response.trustMode === "HMAC",
    oauthProvider: null,
    moderationStatus: response.moderationStatus,
    moderationScore: null,
    moderationFlags: Array.isArray(flags) ? (flags as string[]) : null,
    autoPublished: false,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
    tags: [],
  };
}
