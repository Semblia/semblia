"use client";

/**
 * Typography section — font family + heading font.
 */

import * as React from "react";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import { FONT_CHOICES } from "@/lib/widgets/widget-presets";
import { Row, SectionCollapsible, StudioSelect } from "./studio-primitives";

export function TypographySection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setToken = useWidgetStudioStore((s) => s.setToken);
  if (!draft) return null;

  return (
    <SectionCollapsible title="Typography" defaultOpen={false}>
      <Row label="Body font">
        <StudioSelect
          value={draft.tokens.fontFamily}
          onChange={(v) => setToken(widgetId, "fontFamily", v)}
          options={FONT_CHOICES.map((f) => ({
            value: f.value,
            label: f.label,
          }))}
        />
      </Row>
      <Row label="Heading font">
        <StudioSelect
          value={draft.tokens.fontHead}
          onChange={(v) => setToken(widgetId, "fontHead", v)}
          options={FONT_CHOICES.map((f) => ({
            value: f.value,
            label: f.label,
          }))}
        />
      </Row>
    </SectionCollapsible>
  );
}
