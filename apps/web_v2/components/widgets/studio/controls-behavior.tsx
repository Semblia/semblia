"use client";

/**
 * Behavior section — auto-rotate, max items, branding. Layout-coupled, so it
 * lives under the Layout tab.
 */

import * as React from "react";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import {
  Field,
  Section,
  StudioNumberInput,
  SwitchRow,
} from "./studio-primitives";

export function BehaviorSection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setBehavior = useWidgetStudioStore((s) => s.setBehavior);

  if (!draft) return null;

  const supportsAutoRotate = draft.layout === "carousel";

  return (
    <section className="px-5 py-5">
      <Section title="Behavior">
        <Field
          label="Max items"
          trailing={
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {draft.behavior.maxItems}
            </span>
          }
        >
          <StudioNumberInput
            value={draft.behavior.maxItems}
            onChange={(v) => setBehavior(widgetId, { maxItems: v })}
            min={1}
            max={24}
            step={1}
          />
        </Field>

        {supportsAutoRotate && (
          <>
            <SwitchRow
              label="Auto-rotate"
              description="Carousel cycles automatically."
              checked={draft.behavior.autoRotate}
              onCheckedChange={(v) => setBehavior(widgetId, { autoRotate: v })}
            />

            {draft.behavior.autoRotate && (
              <Field
                label="Rotation interval"
                trailing={
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {(draft.behavior.rotateInterval / 1000).toFixed(1)}s
                  </span>
                }
              >
                <StudioNumberInput
                  value={draft.behavior.rotateInterval}
                  onChange={(v) => setBehavior(widgetId, { rotateInterval: v })}
                  min={1500}
                  max={10000}
                  step={500}
                  suffix="ms"
                />
              </Field>
            )}
          </>
        )}

        <SwitchRow
          label="Show Semblia footer"
          description="A subtle “Powered by Semblia” line."
          checked={draft.behavior.showBranding}
          onCheckedChange={(v) => setBehavior(widgetId, { showBranding: v })}
        />
      </Section>
    </section>
  );
}
