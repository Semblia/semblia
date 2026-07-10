"use client";

/**
 * Appearance (Style tab) — the brand-theme inputs as compact rows.
 *
 * Presets keep a real engine-derived miniature (they ARE color choices);
 * every other knob is a quiet monochrome segment or value row. The live
 * canvas is the preview — the panel never repaints itself per option.
 */

import * as React from "react";
import {
  CircleHalf as SystemIcon,
  MoonStars as MoonIcon,
  Shuffle as ShuffleIcon,
  Sun as SunIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { FONT_CHOICES, STYLE_PRESET_LIST } from "@/lib/widgets/widget-presets";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import type { WidgetBrandThemeInputs } from "@workspace/widgets-core/schema";
import {
  PanelSection,
  Row,
  IconSegment,
  Segmented,
} from "@/components/studio/controls";
import { StudioColorInput } from "./studio-input-primitives";
import { WidgetThemeSwatch } from "./widget-theme-swatch";

const QUICK_PALETTE = [
  "#0f172a",
  "#1d4ed8",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
];

type ThemeInputs = WidgetBrandThemeInputs;

export function AppearanceSection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setThemeInput = useWidgetStudioStore((s) => s.setThemeInput);
  const applyStylePreset = useWidgetStudioStore((s) => s.applyStylePreset);
  const randomize = useWidgetStudioStore((s) => s.randomize);

  if (!draft) return null;
  const theme = draft.definition.theme;
  const activePreset = draft.tokens.preset;

  const update = <K extends keyof ThemeInputs>(key: K, value: ThemeInputs[K]) =>
    setThemeInput(widgetId, key, value);

  return (
    <>
      <PanelSection
        title="Preset"
        action={
          <button
            type="button"
            onClick={() => randomize(widgetId)}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
            )}
          >
            <ShuffleIcon className="size-3" weight="bold" aria-hidden />
            Remix
          </button>
        }
      >
        <div
          role="radiogroup"
          aria-label="Style preset"
          className="grid grid-cols-2 gap-1.5"
        >
          {STYLE_PRESET_LIST.map((preset) => {
            const active = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={active}
                title={preset.sub}
                onClick={() => applyStylePreset(widgetId, preset.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-1 pr-2 text-left transition-colors duration-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                  active
                    ? "border-brand/70 ring-1 ring-brand/70"
                    : "border-border/70 hover:border-foreground/25",
                )}
              >
                <span className="h-9 w-12 shrink-0 overflow-hidden rounded-md">
                  <WidgetThemeSwatch inputs={preset.theme} scale={5.5} />
                </span>
                <span
                  className={cn(
                    "min-w-0 truncate text-[11px]",
                    active
                      ? "font-medium text-foreground"
                      : "text-foreground/90",
                  )}
                >
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection title="Brand">
        <StudioColorInput
          label="Brand color"
          value={theme.brandColor}
          onChange={(value) => update("brandColor", value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PALETTE.map((color) => {
            const selected =
              theme.brandColor.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => update("brandColor", color)}
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
          Accents, stars, and links derive from this — clamped to AA.
        </p>
      </PanelSection>

      <PanelSection title="Surfaces">
        <Row label="Mode">
          <IconSegment
            ariaLabel="Color mode"
            value={theme.appearance}
            onChange={(v) => update("appearance", v)}
            options={[
              { value: "light", label: "Light", icon: SunIcon },
              { value: "dark", label: "Dark", icon: MoonIcon },
              { value: "system", label: "System", icon: SystemIcon },
            ]}
          />
        </Row>
        <Row label="Card surface">
          <IconSegment<ThemeInputs["surfaceStyle"]>
            ariaLabel="Card surface"
            value={theme.surfaceStyle}
            onChange={(v) => update("surfaceStyle", v)}
            options={[
              { value: "flat", label: "Flat", icon: SurfaceFlatGlyph },
              {
                value: "bordered",
                label: "Bordered",
                icon: SurfaceBorderedGlyph,
              },
              {
                value: "elevated",
                label: "Elevated",
                icon: SurfaceElevatedGlyph,
              },
            ]}
          />
        </Row>
        <Row label="Corners">
          <IconSegment<`${ThemeInputs["radius"]}`>
            ariaLabel="Corner radius"
            value={`${theme.radius}`}
            onChange={(v) =>
              update("radius", Number(v) as ThemeInputs["radius"])
            }
            options={([0, 1, 2, 3, 4] as const).map((s) => ({
              value: `${s}` as const,
              label: `Radius ${s}`,
              icon: cornerIcon(s * 1.5),
            }))}
          />
        </Row>
        <Row label="Density">
          <IconSegment<ThemeInputs["density"]>
            ariaLabel="Density"
            value={theme.density}
            onChange={(v) => update("density", v)}
            options={[
              { value: "compact", label: "Compact", icon: densityIcon(1) },
              { value: "cozy", label: "Cozy", icon: densityIcon(2) },
              { value: "spacious", label: "Spacious", icon: densityIcon(3.5) },
            ]}
          />
        </Row>
      </PanelSection>

      <PanelSection title="Accent">
        <Row label="Intensity">
          <Segmented<ThemeInputs["accentIntensity"]>
            ariaLabel="Accent intensity"
            value={theme.accentIntensity}
            onChange={(v) => update("accentIntensity", v)}
            options={[
              { value: "subtle", label: "Subtle" },
              { value: "balanced", label: "Balanced" },
              { value: "bold", label: "Bold" },
            ]}
          />
        </Row>
        <Row label="Buttons">
          <IconSegment<ThemeInputs["buttonStyle"]>
            ariaLabel="Button style"
            value={theme.buttonStyle}
            onChange={(v) => update("buttonStyle", v)}
            options={[
              { value: "solid", label: "Solid", icon: ButtonSolidGlyph },
              { value: "soft", label: "Soft", icon: ButtonSoftGlyph },
              { value: "outline", label: "Outline", icon: ButtonOutlineGlyph },
            ]}
          />
        </Row>
        <Row label="Neutral tone">
          <Segmented<ThemeInputs["neutralTone"]>
            ariaLabel="Neutral tone"
            value={theme.neutralTone}
            onChange={(v) => update("neutralTone", v)}
            options={[
              { value: "auto", label: "Auto" },
              { value: "pure", label: "Pure" },
              { value: "warm", label: "Warm" },
              { value: "cool", label: "Cool" },
            ]}
          />
        </Row>
      </PanelSection>

      <PanelSection title="Type">
        <TypefacePicker
          value={theme.typePairing}
          onChange={(v) => update("typePairing", v)}
        />
      </PanelSection>
    </>
  );
}

/* ── Monochrome glyphs ────────────────────────────────────────────────────── */

function SurfaceFlatGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span className="size-3 rounded-[2px] bg-current opacity-30" />
    </span>
  );
}

function SurfaceBorderedGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span className="size-3 rounded-[2px] border border-current" />
    </span>
  );
}

function SurfaceElevatedGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span
        className="size-3 rounded-[2px] border border-current/60"
        style={{ boxShadow: "0 2px 3px -1px currentColor" }}
      />
    </span>
  );
}

function cornerIcon(radius: number) {
  return function CornerGlyph({ className }: { className?: string }) {
    return (
      <span className={cn("flex items-center justify-center", className)}>
        <span
          aria-hidden
          className="block size-3 border-l-[1.5px] border-t-[1.5px] border-current"
          style={{ borderTopLeftRadius: radius }}
        />
      </span>
    );
  };
}

function densityIcon(gapPx: number) {
  return function DensityGlyph({ className }: { className?: string }) {
    return (
      <span
        className={cn("flex flex-col items-center justify-center", className)}
        style={{ gap: gapPx }}
      >
        <span className="h-[2px] w-3 rounded-full bg-current" />
        <span className="h-[2px] w-3 rounded-full bg-current" />
        <span className="h-[2px] w-3 rounded-full bg-current" />
      </span>
    );
  };
}

function ButtonSolidGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span className="h-2 w-3.5 rounded-[3px] bg-current" />
    </span>
  );
}

function ButtonSoftGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span className="h-2 w-3.5 rounded-[3px] bg-current opacity-35" />
    </span>
  );
}

function ButtonOutlineGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span className="h-2 w-3.5 rounded-[3px] border border-current" />
    </span>
  );
}

/* ── Typeface picker — real specimens, slim rows ─────────────────────────── */

const SPECIMEN_FONT: Record<WidgetBrandThemeInputs["typePairing"], string> = {
  inherit: "var(--font-sans, ui-sans-serif), system-ui, sans-serif",
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  geist: '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  "serif-editorial": '"Fraunces", Georgia, "Times New Roman", serif',
};

function TypefacePicker({
  value,
  onChange,
}: {
  value: WidgetBrandThemeInputs["typePairing"];
  onChange: (v: WidgetBrandThemeInputs["typePairing"]) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Typeface"
      className="flex flex-col gap-1"
    >
      {FONT_CHOICES.map((font) => {
        const active = value === font.value;
        return (
          <button
            key={font.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(font.value)}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-md border px-2.5 text-left transition-colors duration-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
              active
                ? "border-brand/70 ring-1 ring-brand/70"
                : "border-border/70 hover:border-foreground/25",
            )}
          >
            <span
              className="w-5 text-center text-[15px] leading-none text-foreground"
              style={{ fontFamily: SPECIMEN_FONT[font.value] }}
              aria-hidden
            >
              Ag
            </span>
            <span
              className={cn(
                "flex-1 truncate text-xs",
                active ? "font-medium text-foreground" : "text-foreground/90",
              )}
            >
              {font.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
