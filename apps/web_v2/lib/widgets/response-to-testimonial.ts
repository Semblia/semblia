/**
 * Projects an authenticated `V2ResponseDTO` onto the widget studio's local
 * `WidgetTestimonial` display type, so the studio preview can show a project's
 * *real* approved testimonials instead of demo content.
 *
 * Defensive by design: a response with no usable text body is skipped (returns
 * null) rather than rendering an empty card. The body is taken from the answer
 * the server flagged for widget display (`usedInWidget`), falling back to the
 * longest publishable text answer.
 */

import type { V2ResponseDTO, V2SafeResponseAnswerDTO } from "@workspace/types";
import type { WidgetTestimonial } from "./widget-testimonial-type";

function answerText(a: V2SafeResponseAnswerDTO): string | null {
  return typeof a.value === "string" && a.value.trim() ? a.value.trim() : null;
}

function extractBody(answers: V2SafeResponseAnswerDTO[]): string | null {
  const flagged = answers.find((a) => a.usedInWidget && answerText(a));
  if (flagged) return answerText(flagged);

  const publishable = answers
    .filter((a) => a.publishable)
    .map(answerText)
    .filter((v): v is string => v !== null)
    .sort((x, y) => y.length - x.length);
  return publishable[0] ?? null;
}

export function responseToTestimonial(
  dto: V2ResponseDTO,
): WidgetTestimonial | null {
  const content = extractBody(dto.answers);
  if (!content) return null;

  return {
    id: dto.id,
    projectId: dto.projectId,
    formId: dto.formId,
    authorName: dto.authorName?.trim() || "Anonymous",
    authorEmail: null,
    authorRole: dto.authorRole,
    authorCompany: dto.authorCompany,
    authorAvatar: null,
    content,
    type: "TEXT",
    video: null,
    media: null,
    source: null,
    sourceUrl: null,
    isPublished: dto.publishStatus === "PUBLISHED",
    rating: dto.ratingValue,
    isApproved: dto.reviewStatus === "APPROVED",
    isOAuthVerified: false,
    oauthProvider: null,
    moderationStatus: "APPROVED",
    moderationScore: null,
    moderationFlags: null,
    autoPublished: false,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    tags: [],
  };
}
