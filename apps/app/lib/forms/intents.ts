/**
 * Form intent + status presentation metadata.
 *
 * The intent is chosen once at creation and seeds the whole form (fields, copy,
 * layout, flow, consent) via forms-core `createFormTemplate`. These descriptors
 * drive the create picker and the list row — label, one-line blurb, icon, and a
 * tonal accent so each intent reads at a glance.
 */

import {
  QuotesIcon,
  StarIcon,
  ChatCircleDotsIcon,
  BookOpenIcon,
  NotePencilIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { V2FormIntent, V2FormStatus } from "@workspace/types";

export interface IntentMeta {
  intent: V2FormIntent;
  label: string;
  blurb: string;
  icon: Icon;
  /** Tailwind classes for the icon tile (bg + fg), light/dark aware. */
  accent: string;
}

export const INTENT_META: Record<V2FormIntent, IntentMeta> = {
  TESTIMONIAL: {
    intent: "TESTIMONIAL",
    label: "Testimonial",
    blurb: "Collect glowing quotes with rating, name, role, and photo.",
    icon: QuotesIcon,
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  REVIEW: {
    intent: "REVIEW",
    label: "Review",
    blurb: "A short star rating plus a public review of the experience.",
    icon: StarIcon,
    accent: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  },
  PRODUCT_FEEDBACK: {
    intent: "PRODUCT_FEEDBACK",
    label: "Product feedback",
    blurb: "Categorized feedback, satisfaction, and an optional screenshot.",
    icon: ChatCircleDotsIcon,
    accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  CUSTOMER_STORY: {
    intent: "CUSTOMER_STORY",
    label: "Customer story",
    blurb: "A guided before / after / result narrative for case studies.",
    icon: BookOpenIcon,
    accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  CUSTOM: {
    intent: "CUSTOM",
    label: "Custom",
    blurb: "Start lean with a name and a message — build it your way.",
    icon: NotePencilIcon,
    accent: "bg-foreground/10 text-foreground",
  },
};

/** Display order for pickers — the most common collection intents first. */
export const INTENT_ORDER: readonly V2FormIntent[] = [
  "TESTIMONIAL",
  "REVIEW",
  "PRODUCT_FEEDBACK",
  "CUSTOMER_STORY",
  "CUSTOM",
];

export function intentMeta(intent: V2FormIntent): IntentMeta {
  return INTENT_META[intent] ?? INTENT_META.CUSTOM;
}

// ── Status presentation ─────────────────────────────────────────────────────

export type FormStatusTone = "live" | "draft" | "closed" | "archived";

export interface StatusMeta {
  label: string;
  tone: FormStatusTone;
}

/**
 * Resolve the badge a form should wear. A PUBLISHED form is only "Live" while
 * `open` is true; a published-but-closed form reads as "Closed". Keyed
 * defensively so an unexpected status value degrades to a neutral draft chip
 * rather than throwing.
 */
export function formStatusMeta(
  status: V2FormStatus,
  open: boolean,
): StatusMeta {
  switch (status) {
    case "PUBLISHED":
      return open
        ? { label: "Live", tone: "live" }
        : { label: "Closed", tone: "closed" };
    case "CLOSED":
      return { label: "Closed", tone: "closed" };
    case "ARCHIVED":
      return { label: "Archived", tone: "archived" };
    case "DRAFT":
    default:
      return { label: "Draft", tone: "draft" };
  }
}
