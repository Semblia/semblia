"use client";

/**
 * Brand section — brand facts only (template system rebuild). One color and
 * an appearance choice; the template's recipe derives every dependent token
 * through the AA-clamped engine. The old appearance knobs (fonts, radius,
 * density, surfaces, intensity, presets) are template taste now and gone.
 */

import * as React from "react";
import { SunIcon, MoonStarsIcon, CircleHalfIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import type { WidgetTheme } from "@/lib/widgets/widget-types";
import {
  PanelSection,
  Field,
  Row,
  IconSegment,
} from "@/components/studio/controls";
import { FinishSection } from "@/components/studio/finish-section";

const QUICK_PALETTE = [
  "#0f172a",
  "#1d4ed8",
  "#0891b2",
  "#10b981",
  "#f59e0b",
  "#ea580c",
  "#f43f5e",
  "#7c3aed",
];

export function AppearanceSection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setBrandColor = useWidgetStudioStore((s) => s.setBrandColor);
  const setTheme = useWidgetStudioStore((s) => s.setTheme);
  const setTuning = useWidgetStudioStore((s) => s.setTuning);
  if (!draft) return null;

  const brand = draft.definition.brand;

  return (
    <>
      <PanelSection title="Brand">
        <Field label="Brand color">
          <div className="flex items-center gap-2">
            <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border">
              <span
                className="absolute inset-0"
                style={{ backgroundColor: brand.color }}
                aria-hidden
              />
              <input
                type="color"
                value={brand.color}
                onChange={(e) => setBrandColor(widgetId, e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Brand color"
              />
            </label>
            <Input
              value={brand.color}
              onChange={(e) => setBrandColor(widgetId, e.target.value)}
              className="h-7 font-mono text-[11px] uppercase"
              aria-label="Brand color hex"
            />
          </div>
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PALETTE.map((color) => {
            const selected = brand.color.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => setBrandColor(widgetId, color)}
                aria-pressed={selected}
                aria-label={`Set brand color to ${color}`}
                className={cn(
                  "size-6 rounded-full border border-foreground/10 transition-transform duration-150 hover:scale-105 active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                )}
                style={{
                  background: color,
                  outline: selected ? "2px solid var(--foreground)" : undefined,
                  outlineOffset: 2,
                }}
              />
            );
          })}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground/80">
          One color drives the whole widget — every dependent tone is derived
          and contrast-clamped by the template.
        </p>
      </PanelSection>

      <PanelSection title="Appearance">
        <Row label="Scheme">
          <IconSegment<WidgetTheme>
            ariaLabel="Color scheme"
            value={draft.theme}
            onChange={(theme) => setTheme(widgetId, theme)}
            options={[
              { value: "light", label: "Light", icon: SunIcon },
              { value: "dark", label: "Dark", icon: MoonStarsIcon },
              { value: "system", label: "Auto", icon: CircleHalfIcon },
            ]}
          />
        </Row>
      </PanelSection>

      <FinishSection
        value={draft.definition.tuning}
        onChange={(tuning) => setTuning(widgetId, tuning)}
      />
    </>
  );
}
