"use client";

/**
 * Appearance section — the brand-theme inputs, rendered as visual pickers.
 *
 * Every choice is made by *looking*: themed preset cards, segmented mode, and
 * `OptionCardGroup`s whose previews are real `WidgetThemeSwatch` miniatures with
 * one knob changed. No text dropdowns — the studio shows the choice, it doesn't
 * name it. All previews derive from `resolveBrandTheme`, so they match what ships.
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
  Field,
  OptionCardGroup,
  Section,
  Segmented,
  StudioColorInput,
  SwitchRow,
  type OptionCard,
} from "./studio-primitives";
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

/** Build option cards whose preview is the live card with one knob overridden. */
function knobCards<K extends keyof ThemeInputs>(
  base: ThemeInputs,
  key: K,
  options: ReadonlyArray<{
    value: ThemeInputs[K];
    label: string;
    hint?: string;
  }>,
): OptionCard<string>[] {
  return options.map((o) => ({
    value: String(o.value),
    label: o.label,
    hint: o.hint,
    preview: (
      <WidgetThemeSwatch inputs={{ ...base, [key]: o.value }} scale={10} />
    ),
  }));
}

export function AppearanceSection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setThemeInput = useWidgetStudioStore((s) => s.setThemeInput);
  const applyStylePreset = useWidgetStudioStore((s) => s.applyStylePreset);
  const randomize = useWidgetStudioStore((s) => s.randomize);
  const setBehavior = useWidgetStudioStore((s) => s.setBehavior);

  if (!draft) return null;
  const theme = draft.definition.theme;
  const activePreset = draft.tokens.preset;

  const update = <K extends keyof ThemeInputs>(key: K, value: ThemeInputs[K]) =>
    setThemeInput(widgetId, key, value);

  return (
    <div className="flex flex-col gap-7 px-5 py-5">
      {/* ── Starting point ─────────────────────────────────────── */}
      <Section
        title="Preset"
        description="A coordinated starting point — tune any knob below."
        action={
          <button
            type="button"
            onClick={() => randomize(widgetId)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11.5px] font-medium text-muted-foreground transition-colors",
              "hover:border-foreground/30 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
            )}
          >
            <ShuffleIcon className="size-3.5" weight="bold" aria-hidden />
            Remix
          </button>
        }
      >
        <OptionCardGroup
          ariaLabel="Style preset"
          columns={2}
          value={activePreset}
          onChange={(id) => applyStylePreset(widgetId, id)}
          previewClassName="aspect-[16/11]"
          options={STYLE_PRESET_LIST.map((preset) => ({
            value: preset.id,
            label: preset.label,
            hint: preset.sub,
            preview: <WidgetThemeSwatch inputs={preset.theme} scale={12} />,
          }))}
        />
      </Section>

      {/* ── Brand color ────────────────────────────────────────── */}
      <Section
        title="Brand color"
        description="Accents, stars, and links derive from this — clamped to AA."
      >
        <StudioColorInput
          label="Hex"
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
                  "size-7 rounded-full border border-foreground/10 transition-[transform,box-shadow] duration-150 hover:scale-105 active:scale-95",
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
      </Section>

      {/* ── Surfaces & feel ────────────────────────────────────── */}
      <Section title="Surfaces">
        <Field label="Mode">
          <Segmented
            ariaLabel="Color mode"
            value={theme.appearance}
            onChange={(v) => update("appearance", v)}
            options={[
              { value: "light", label: "Light", icon: SunIcon },
              { value: "dark", label: "Dark", icon: MoonIcon },
              { value: "system", label: "System", icon: SystemIcon },
            ]}
          />
        </Field>

        <Field label="Card surface">
          <OptionCardGroup
            ariaLabel="Card surface"
            columns={3}
            previewClassName="aspect-[5/4]"
            value={theme.surfaceStyle}
            onChange={(v) =>
              update("surfaceStyle", v as ThemeInputs["surfaceStyle"])
            }
            options={knobCards(theme, "surfaceStyle", [
              { value: "flat", label: "Flat" },
              { value: "bordered", label: "Bordered" },
              { value: "elevated", label: "Elevated" },
            ])}
          />
        </Field>

        <Field
          label="Corner radius"
          trailing={
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {theme.radius}/4
            </span>
          }
        >
          <RadiusPicker
            value={theme.radius}
            onChange={(v) => update("radius", v)}
          />
        </Field>

        <Field label="Density">
          <Segmented
            ariaLabel="Density"
            value={theme.density}
            onChange={(v) => update("density", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "cozy", label: "Cozy" },
              { value: "spacious", label: "Spacious" },
            ]}
          />
        </Field>
      </Section>

      {/* ── Accent & buttons ───────────────────────────────────── */}
      <Section title="Accent">
        <Field label="Intensity">
          <Segmented
            ariaLabel="Accent intensity"
            value={theme.accentIntensity}
            onChange={(v) => update("accentIntensity", v)}
            options={[
              { value: "subtle", label: "Subtle" },
              { value: "balanced", label: "Balanced" },
              { value: "bold", label: "Bold" },
            ]}
          />
        </Field>

        <Field label="Button style" hint="The accent chip on each card.">
          <OptionCardGroup
            ariaLabel="Button style"
            columns={3}
            previewClassName="aspect-[5/4]"
            value={theme.buttonStyle}
            onChange={(v) =>
              update("buttonStyle", v as ThemeInputs["buttonStyle"])
            }
            options={knobCards(theme, "buttonStyle", [
              { value: "solid", label: "Solid" },
              { value: "soft", label: "Soft" },
              { value: "outline", label: "Outline" },
            ])}
          />
        </Field>

        <Field
          label="Neutral tone"
          hint="How surfaces lean — toward the brand, or warm/cool."
        >
          <OptionCardGroup
            ariaLabel="Neutral tone"
            columns={2}
            previewClassName="aspect-[16/9]"
            value={theme.neutralTone}
            onChange={(v) =>
              update("neutralTone", v as ThemeInputs["neutralTone"])
            }
            options={knobCards(theme, "neutralTone", [
              { value: "auto", label: "Auto" },
              { value: "pure", label: "Pure" },
              { value: "warm", label: "Warm" },
              { value: "cool", label: "Cool" },
            ])}
          />
        </Field>
      </Section>

      {/* ── Type ───────────────────────────────────────────────── */}
      <Section title="Type">
        <TypefacePicker
          value={theme.typePairing}
          onChange={(v) => update("typePairing", v)}
        />
      </Section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <Section title="Footer">
        <SwitchRow
          label="Show Semblia footer"
          description={"A subtle “Powered by Semblia” line. Removable on Pro."}
          checked={draft.behavior.showBranding}
          onCheckedChange={(v) => setBehavior(widgetId, { showBranding: v })}
        />
      </Section>
    </div>
  );
}

/* ── Radius picker — corner glyphs at the real scale ─────────────────────────── */

const RADIUS_PX: Record<WidgetBrandThemeInputs["radius"], number> = {
  0: 0,
  1: 5,
  2: 9,
  3: 13,
  4: 17,
};

function RadiusPicker({
  value,
  onChange,
}: {
  value: WidgetBrandThemeInputs["radius"];
  onChange: (v: WidgetBrandThemeInputs["radius"]) => void;
}) {
  const scales: WidgetBrandThemeInputs["radius"][] = [0, 1, 2, 3, 4];
  return (
    <div
      role="radiogroup"
      aria-label="Corner radius"
      className="grid grid-cols-5 gap-1.5"
    >
      {scales.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Radius ${s}`}
            onClick={() => onChange(s)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg border transition-[border-color,box-shadow] duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
              active
                ? "border-brand ring-2 ring-brand/60"
                : "border-border hover:border-foreground/25",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-5 border-[1.5px] border-b-0 border-r-0",
                active ? "border-foreground" : "border-muted-foreground",
              )}
              style={{ borderTopLeftRadius: RADIUS_PX[s] }}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ── Typeface picker — real specimens ────────────────────────────────────────── */

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
      className="flex flex-col gap-1.5"
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
              "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-[border-color,box-shadow] duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
              active
                ? "border-brand ring-2 ring-brand/60"
                : "border-border hover:border-foreground/25",
            )}
          >
            <span
              className="text-[17px] leading-none text-foreground"
              style={{ fontFamily: SPECIMEN_FONT[font.value] }}
            >
              Ag
            </span>
            <span className="flex-1 truncate text-[12.5px] font-medium text-foreground">
              {font.label}
            </span>
            <span
              className="hidden text-[12px] text-muted-foreground sm:inline"
              style={{ fontFamily: SPECIMEN_FONT[font.value] }}
            >
              Real proof, real people
            </span>
          </button>
        );
      })}
    </div>
  );
}
