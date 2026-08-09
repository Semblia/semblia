"use client";

/**
 * Visibility section — toggle which fields show on each testimonial card.
 */

import * as React from "react";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import { PanelSection, SwitchRow } from "@/components/studio/controls";
import type { WidgetVisibility } from "@/lib/widgets/widget-types";

const FIELDS: { key: keyof WidgetVisibility; label: string; hint: string }[] = [
  { key: "showRating", label: "Star rating", hint: "★★★★★ on each card" },
  { key: "showAvatar", label: "Avatar", hint: "Author photo or initials" },
  { key: "showCompany", label: "Company", hint: "Below the author name" },
  { key: "showDate", label: "Date", hint: "When the testimonial was created" },
  { key: "showSource", label: "Source", hint: "Where it came from" },
];

export function VisibilitySection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setVisibility = useWidgetStudioStore((s) => s.setVisibility);

  if (!draft) return null;

  return (
    <PanelSection title="Card fields">
      {FIELDS.map((f) => (
        <SwitchRow
          key={f.key}
          label={f.label}
          description={f.hint}
          checked={draft.visibility[f.key]}
          onCheckedChange={(v) => setVisibility(widgetId, { [f.key]: v })}
        />
      ))}
    </PanelSection>
  );
}
