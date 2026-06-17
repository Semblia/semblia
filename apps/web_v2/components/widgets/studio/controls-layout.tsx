"use client";

/**
 * Layout section — five visual layout cards. Selecting a layout swaps the
 * preview's renderer and (because it doesn't touch tokens) preserves all
 * design choices. Locked to "wall" when widget kind is "wall".
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { LAYOUT_GLYPHS, type WidgetLayout } from "@/lib/widgets/widget-types";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import { LayoutGlyph } from "../layout-glyph";
import { Section } from "./studio-primitives";

export function LayoutSection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setLayout = useWidgetStudioStore((s) => s.setLayout);
  if (!draft) return null;

  const isWall = draft.kind === "wall";

  return (
    <section className="px-5 py-5">
      <Section
        title="Layout"
        description="Pick a shape — your design choices carry across."
      >
        {isWall && (
          <div className="rounded-md border border-emerald-300/30 bg-emerald-50/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-300/15 dark:bg-emerald-950/30 dark:text-emerald-300">
            Walls always render as wall layout
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {LAYOUT_GLYPHS.map((g) => {
            const active = draft.layout === g.id;
            const disabled = isWall && g.id !== "wall";
            return (
              <button
                key={g.id}
                type="button"
                onClick={() =>
                  !disabled && setLayout(widgetId, g.id as WidgetLayout)
                }
                aria-pressed={active}
                disabled={disabled}
                title={g.description}
                className={cn(
                  "group flex flex-col items-stretch gap-1.5 rounded-lg border p-2 text-left",
                  "transition-[border-color,background,transform] duration-150 ease-out",
                  active
                    ? "border-foreground bg-card"
                    : disabled
                      ? "border-border bg-transparent opacity-40"
                      : "border-border bg-transparent hover:border-muted-foreground/40 hover:bg-card",
                  !disabled && "active:scale-[0.97]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  "disabled:cursor-not-allowed",
                )}
              >
                <div className="aspect-[5/3] overflow-hidden rounded bg-muted/40">
                  <LayoutGlyph layout={g.id} highlighted={active} />
                </div>
                <span className="text-center text-[11px] font-medium text-foreground">
                  {g.label}
                </span>
              </button>
            );
          })}
        </div>
      </Section>
    </section>
  );
}
