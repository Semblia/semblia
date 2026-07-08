"use client";

/**
 * Behavior section — how much the widget shows and how it moves. Rendered
 * under the Layout section because both answer "what shape does this take?".
 * The branding toggle lives in Design.
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
      <Section title="Amount & motion">
        <Field
          label="How many testimonials should this show?"
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
              label="Rotate automatically"
              description="The carousel advances on its own."
              checked={draft.behavior.autoRotate}
              onCheckedChange={(v) => setBehavior(widgetId, { autoRotate: v })}
            />

            {draft.behavior.autoRotate && (
              <Field
                label="Every"
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
      </Section>
    </section>
  );
}
