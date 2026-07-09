"use client";

/**
 * Layout section — the shape of the widget. Selecting a layout swaps the
 * preview's renderer and (because it doesn't touch tokens) preserves all
 * design choices. Locked to "wall" when widget kind is "wall".
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  LAYOUT_GLYPHS,
  LAYOUT_VARIANT_META,
  type WidgetLayout,
} from "@/lib/widgets/widget-types";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import { LayoutGlyph } from "../layout-glyph";
import { PanelSection, Row, Segmented } from "@/components/studio/controls";

export function LayoutSection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setLayout = useWidgetStudioStore((s) => s.setLayout);
  const setLayoutVariant = useWidgetStudioStore((s) => s.setLayoutVariant);
  if (!draft) return null;

  const isWall = draft.kind === "wall";
  const variants = LAYOUT_VARIANT_META[draft.layout] ?? [];
  const activeVariant = draft.definition.layout.variant ?? "classic";

  return (
    <PanelSection title="Layout">
      {isWall && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Walls keep the wall layout — pick its variation below.
        </p>
      )}
      <div
        role="radiogroup"
        aria-label="Layout"
        className="grid grid-cols-3 gap-1.5"
      >
        {LAYOUT_GLYPHS.map((g) => {
          const active = draft.layout === g.id;
          const disabled = isWall && g.id !== "wall";
          return (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() =>
                !disabled && setLayout(widgetId, g.id as WidgetLayout)
              }
              disabled={disabled}
              title={g.description}
              className={cn(
                "group flex flex-col items-stretch gap-1 rounded-lg border px-1 pb-1.5 pt-1 text-left",
                "transition-[border-color,background-color] duration-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                active
                  ? "border-brand/70 bg-brand/[0.04] ring-1 ring-brand/70"
                  : disabled
                    ? "border-border/60 opacity-40"
                    : "border-border/70 hover:border-foreground/25",
                "disabled:cursor-not-allowed",
              )}
            >
              <span className="aspect-[5/3] overflow-hidden rounded bg-muted/40">
                <LayoutGlyph layout={g.id} highlighted={active} />
              </span>
              <span
                className={cn(
                  "text-center text-[10.5px] leading-none",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {g.label}
              </span>
            </button>
          );
        })}
      </div>

      {variants.length > 1 && (
        <Row label="Variation">
          <Segmented
            ariaLabel="Layout variation"
            value={activeVariant}
            onChange={(v) => setLayoutVariant(widgetId, v)}
            options={variants.map((v) => ({ value: v.id, label: v.label }))}
          />
        </Row>
      )}
    </PanelSection>
  );
}
