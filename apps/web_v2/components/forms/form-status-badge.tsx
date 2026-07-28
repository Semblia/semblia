"use client";

/**
 * FormStatusBadge — the Live / Draft / Closed / Archived chip worn by the form
 * row and the form card.
 *
 * It used to carry its own `TONE_BADGE` colour map, which is how two badge
 * vocabularies end up side by side on one screen. The colours now come from the
 * shared `StatusBadge` tone scale, and this file's only remaining job is the
 * translation the shared registries can't do: a form's badge is a function of
 * *two* fields, not one — `PUBLISHED` only reads as "Live" while `open` is
 * true, and a published-but-closed form reads as "Closed".
 *
 * `components/shared/status-badge` has no `formStatusMeta` registry yet. When it
 * grows one that takes the status/open pair, this file deletes.
 */

import { StatusBadge, type StatusTone } from "@/components/shared";
import { formStatusMeta, type FormStatusTone } from "@/lib/forms/intents";
import type { V2FormStatus } from "@workspace/types";

/**
 * Exhaustive by type: adding a tone to `FormStatusTone` breaks the build here
 * rather than silently rendering an unstyled chip.
 *
 * "Closed" maps to `attention` rather than `neutral` on purpose — a closed form
 * still has a live link that now turns people away, which is worth noticing.
 * Draft is `neutral`: inert, and nothing is wrong with it.
 */
const TONE: Record<FormStatusTone, StatusTone> = {
  live: "positive",
  draft: "neutral",
  closed: "attention",
  archived: "muted",
};

export function FormStatusBadge({
  status,
  open,
  className,
}: {
  status: V2FormStatus;
  open: boolean;
  className?: string;
}) {
  const meta = formStatusMeta(status, open);
  return (
    <StatusBadge
      label={meta.label}
      tone={TONE[meta.tone]}
      className={className}
    />
  );
}
