"use client";

/**
 * Visibility section — toggle which fields show on each testimonial card.
 */

import * as React from "react";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import { Switch } from "@/components/ui/switch";
import { SectionCollapsible } from "./studio-primitives";
import type { WidgetVisibility } from "@/lib/widgets/widget-types";

const FIELDS: { key: keyof WidgetVisibility; label: string; hint: string }[] = [
  { key: "showRating", label: "Star rating", hint: "★★★★★ on each card" },
  { key: "showAvatar", label: "Avatar", hint: "Author photo or initials" },
  { key: "showCompany", label: "Company", hint: "Below the author name" },
  { key: "showDate", label: "Date", hint: "When testimonial was created" },
  { key: "showSource", label: "Source", hint: "Where it came from" },
];

export function VisibilitySection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setVisibility = useWidgetStudioStore((s) => s.setVisibility);

  if (!draft) return null;

  return (
    <SectionCollapsible title="Card fields" defaultOpen={false}>
      <div className="space-y-3">
        {FIELDS.map((f) => (
          <label
            key={f.key}
            className="flex items-center justify-between gap-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-foreground">
                {f.label}
              </div>
              <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                {f.hint}
              </div>
            </div>
            <Switch
              checked={draft.visibility[f.key]}
              onCheckedChange={(v) => setVisibility(widgetId, { [f.key]: v })}
            />
          </label>
        ))}
      </div>
    </SectionCollapsible>
  );
}
