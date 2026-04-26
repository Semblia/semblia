"use client";

/**
 * Behavior section — auto-rotate, max items, branding.
 */

import * as React from "react";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import { Switch } from "@/components/ui/switch";
import {
  Row,
  SectionCollapsible,
  StudioNumberInput,
} from "./studio-primitives";

export function BehaviorSection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setBehavior = useWidgetStudioStore((s) => s.setBehavior);

  if (!draft) return null;

  const supportsAutoRotate = draft.layout === "carousel";

  return (
    <SectionCollapsible title="Behavior" defaultOpen={false}>
      <Row label="Max items" hint={`${draft.behavior.maxItems}`}>
        <StudioNumberInput
          value={draft.behavior.maxItems}
          onChange={(v) => setBehavior(widgetId, { maxItems: v })}
          min={1}
          max={24}
          step={1}
        />
      </Row>

      {supportsAutoRotate && (
        <>
          <div className="mb-3.5">
            <label className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[12.5px] font-semibold text-foreground">
                  Auto-rotate
                </div>
                <div className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">
                  Carousel cycles automatically.
                </div>
              </div>
              <Switch
                checked={draft.behavior.autoRotate}
                onCheckedChange={(v) =>
                  setBehavior(widgetId, { autoRotate: v })
                }
              />
            </label>
          </div>

          {draft.behavior.autoRotate && (
            <Row
              label="Rotation interval"
              hint={`${(draft.behavior.rotateInterval / 1000).toFixed(1)}s`}
            >
              <StudioNumberInput
                value={draft.behavior.rotateInterval}
                onChange={(v) => setBehavior(widgetId, { rotateInterval: v })}
                min={1500}
                max={10000}
                step={500}
                suffix="ms"
              />
            </Row>
          )}
        </>
      )}

      <div>
        <label className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[12.5px] font-semibold text-foreground">
              Show Tresta footer
            </div>
            <div className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">
              A subtle &ldquo;Powered by Tresta&rdquo; line.
            </div>
          </div>
          <Switch
            checked={draft.behavior.showBranding}
            onCheckedChange={(v) => setBehavior(widgetId, { showBranding: v })}
          />
        </label>
      </div>
    </SectionCollapsible>
  );
}
