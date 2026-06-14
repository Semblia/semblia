"use client";

/**
 * Shape section — legacy corner radius + surface style swatches.
 */

import * as React from "react";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import { CARD_STYLES } from "@/lib/widgets/widget-presets";
import {
  CARD_STYLE_LABELS,
  type WidgetCardStyle,
} from "@/lib/widgets/widget-types";
import {
  Row,
  SectionCollapsible,
  StudioNumberInput,
  SwatchButton,
} from "./studio-primitives";

function CardStyleSwatch({ style }: { style: WidgetCardStyle }) {
  const styles: React.CSSProperties = {
    background: "var(--card)",
    border:
      style === "bordered"
        ? "1.5px solid var(--foreground)"
        : style === "flat"
          ? "1px solid transparent"
          : "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
    borderRadius: 6,
    boxShadow:
      style === "elevated"
        ? "0 6px 16px color-mix(in srgb, var(--foreground) 22%, transparent), 0 1px 2px color-mix(in srgb, var(--foreground) 8%, transparent)"
        : "none",
    width: "100%",
    height: "100%",
  };
  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <div style={styles} className="aspect-[5/3] w-full" />
    </div>
  );
}

export function ShapeSection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setToken = useWidgetStudioStore((s) => s.setToken);
  const setCardStyle = useWidgetStudioStore((s) => s.setCardStyle);
  if (!draft) return null;

  return (
    <SectionCollapsible title="Shape" defaultOpen={false}>
      <Row label="Corner radius" hint={`${draft.tokens.radius}px`}>
        <StudioNumberInput
          value={draft.tokens.radius}
          onChange={(v) => setToken(widgetId, "radius", v)}
          min={0}
          max={28}
          step={1}
          suffix="px"
        />
      </Row>

      <div className="mb-3.5">
        <div className="label-quiet mb-2 flex justify-between">
          <span>Card style</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {CARD_STYLES.map((s) => (
            <SwatchButton
              key={s}
              selected={draft.tokens.cardStyle === s}
              onClick={() => setCardStyle(widgetId, s)}
              label={CARD_STYLE_LABELS[s]}
              preview={<CardStyleSwatch style={s} />}
            />
          ))}
        </div>
      </div>
    </SectionCollapsible>
  );
}
