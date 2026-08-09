"use client";

/**
 * Template section — the widget's design, chosen from the roster. Each card
 * is a live WidgetThemeSwatch rendered through that template's real theme
 * recipe with the widget's own brand color, so the picker can never drift
 * from what embeds. A template's finite accent decisions render beneath it.
 * There are no layout/variant/knob controls (template system rebuild).
 */

import * as React from "react";
import {
  normalizeWidgetAccents,
  resolveWidgetTemplateManifest,
  WIDGET_TEMPLATES,
} from "@workspace/widgets-core/schema";
import { cn } from "@/lib/utils";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import { PanelSection, Field, Segmented } from "@/components/studio/controls";
import { WidgetThemeSwatch } from "./widget-theme-swatch";

export function TemplateSection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setTemplate = useWidgetStudioStore((s) => s.setTemplate);
  const setAccent = useWidgetStudioStore((s) => s.setAccent);
  if (!draft) return null;

  const { definition } = draft;
  const manifest = resolveWidgetTemplateManifest(definition.templateId);
  const accents = normalizeWidgetAccents(manifest, definition.accents);
  const isWall = draft.kind === "wall";

  return (
    <>
      <PanelSection title="Template">
        <div
          role="radiogroup"
          aria-label="Template"
          className="grid grid-cols-2 gap-1.5"
        >
          {WIDGET_TEMPLATES.map((t) => {
            const active = manifest.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTemplate(widgetId, t.id)}
                title={t.tagline}
                className={cn(
                  "group flex flex-col items-stretch gap-1 rounded-lg border px-1 pb-1.5 pt-1 text-left",
                  "transition-[border-color,background-color] duration-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                  active
                    ? "border-brand/70 bg-brand/[0.04] ring-1 ring-brand/70"
                    : "border-border/70 hover:border-foreground/25",
                )}
              >
                <span className="aspect-[5/3] overflow-hidden rounded bg-muted/40">
                  <WidgetThemeSwatch
                    inputs={t.themeInputs(
                      definition.brand.color,
                      definition.brand.appearance,
                      normalizeWidgetAccents(t, definition.accents),
                    )}
                    scale={7}
                  />
                </span>
                <span
                  className={cn(
                    "text-center text-[10.5px] leading-none",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {t.name}
                </span>
              </button>
            );
          })}
        </div>
        {isWall ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Any template can present your wall — Editorial is designed for it.
          </p>
        ) : null}
      </PanelSection>

      {manifest.accents.length > 0 ? (
        <PanelSection title={`${manifest.name} decisions`}>
          {manifest.accents.map((spec) => (
            <Field key={spec.key} label={spec.label}>
              <Segmented
                ariaLabel={spec.label}
                value={accents[spec.key] ?? spec.defaultValue}
                onChange={(v) => setAccent(widgetId, spec.key, v)}
                options={spec.options.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            </Field>
          ))}
        </PanelSection>
      ) : null}
    </>
  );
}
