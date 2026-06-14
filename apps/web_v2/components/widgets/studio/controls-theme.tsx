"use client";

/**
 * Theme section — 3-state segmented control (Light / Dark / System).
 * Each option includes its icon. System previews dark mode every 5s in the
 * preview stage (handled by the preview component, not here).
 */

import * as React from "react";
import {
  Sun as SunIcon,
  MoonStars as MoonIcon,
  CircleHalf as SystemIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import type { WidgetTheme } from "@/lib/widgets/widget-types";
import { SectionCollapsible } from "./studio-primitives";

const OPTIONS: {
  value: WidgetTheme;
  label: string;
  Icon: typeof SunIcon;
}[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: SystemIcon },
];

export function ThemeSection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setTheme = useWidgetStudioStore((s) => s.setTheme);
  if (!draft) return null;

  return (
    <SectionCollapsible title="Theme">
      <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-0.5">
        {OPTIONS.map((o) => {
          const on = draft.theme === o.value;
          const Icon = o.Icon;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setTheme(widgetId, o.value)}
              aria-pressed={on}
              className={cn(
                "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-[11.5px] font-medium",
                "transition-[background,color,box-shadow] duration-150",
                on
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" weight="bold" aria-hidden />
              {o.label}
            </button>
          );
        })}
      </div>
      {draft.theme === "system" && (
        <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
          Matches the visitor&apos;s system preference. Preview alternates so
          you can see both modes.
        </p>
      )}
    </SectionCollapsible>
  );
}
