"use client";

import * as React from "react";
import {
  CircleHalf as SystemIcon,
  MoonStars as MoonIcon,
  Sun as SunIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  FONT_CHOICES,
  RADIUS_OPTIONS,
  STYLE_PRESET_LIST,
} from "@/lib/widgets/widget-presets";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import type { WidgetBrandThemeInputs } from "@workspace/widgets-core/schema";
import {
  Pills,
  Row,
  SectionCollapsible,
  StudioColorInput,
  StudioSelect,
  SwatchButton,
} from "./studio-primitives";

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

const APPEARANCE_OPTIONS: Array<{
  value: WidgetBrandThemeInputs["appearance"];
  label: string;
  Icon: typeof SunIcon;
}> = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: SystemIcon },
];

export function AppearanceSection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setThemeInput = useWidgetStudioStore((s) => s.setThemeInput);
  const applyStylePreset = useWidgetStudioStore((s) => s.applyStylePreset);
  const randomize = useWidgetStudioStore((s) => s.randomize);

  if (!draft) return null;
  const theme = draft.definition.theme;

  const update = <K extends keyof WidgetBrandThemeInputs>(
    key: K,
    value: WidgetBrandThemeInputs[K],
  ) => setThemeInput(widgetId, key, value);

  return (
    <SectionCollapsible title="Appearance">
      <div className="grid grid-cols-2 gap-1.5">
        {STYLE_PRESET_LIST.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyStylePreset(widgetId, preset.id)}
            aria-pressed={draft.tokens.preset === preset.id}
            className={cn(
              "rounded-lg border p-2.5 text-left transition-[border-color,background,transform] duration-150",
              draft.tokens.preset === preset.id
                ? "border-foreground bg-card"
                : "border-border bg-transparent hover:border-muted-foreground/40 hover:bg-card",
              "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            )}
          >
            <div className="mb-2 flex gap-1">
              <span
                className="size-4 rounded-sm border border-foreground/8"
                style={{ background: preset.tokens.bg }}
              />
              <span
                className="size-4 rounded-sm border border-foreground/8"
                style={{ background: preset.tokens.surface }}
              />
              <span
                className="size-4 rounded-sm"
                style={{ background: preset.tokens.text }}
              />
              <span
                className="size-4 rounded-sm"
                style={{ background: preset.tokens.accent }}
              />
            </div>
            <div className="text-[12px] font-semibold tracking-tight text-foreground">
              {preset.label}
            </div>
            <div className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">
              {preset.sub}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => randomize(widgetId)}
        className="mt-2 inline-flex h-7 w-full items-center justify-center rounded-md border border-border bg-background text-[11.5px] font-semibold text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        Remix
      </button>

      <div className="mt-4">
        <StudioColorInput
          label="Brand color"
          value={theme.brandColor}
          onChange={(value) => update("brandColor", value)}
        />
        <div className="mb-3.5 flex flex-wrap gap-1.5">
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
                className="size-7 rounded-full border border-foreground/10 transition-[transform,box-shadow] duration-150 hover:scale-105 active:scale-95"
                style={{
                  background: color,
                  outline: selected ? "2px solid var(--foreground)" : undefined,
                  outlineOffset: 2,
                }}
              />
            );
          })}
        </div>
      </div>

      <Row label="Mode">
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-0.5">
          {APPEARANCE_OPTIONS.map((option) => {
            const Icon = option.Icon;
            const active = theme.appearance === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => update("appearance", option.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-[11.5px] font-medium",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" weight="bold" aria-hidden />
                {option.label}
              </button>
            );
          })}
        </div>
      </Row>

      <Row label="Surface">
        <div className="grid grid-cols-3 gap-1.5">
          {(["flat", "bordered", "elevated"] as const).map((surface) => (
            <SwatchButton
              key={surface}
              selected={theme.surfaceStyle === surface}
              onClick={() => update("surfaceStyle", surface)}
              label={surface[0].toUpperCase() + surface.slice(1)}
              preview={<SurfacePreview surface={surface} />}
            />
          ))}
        </div>
      </Row>

      <Row label="Radius" hint={`${theme.radius}/4`}>
        <Pills
          value={String(theme.radius)}
          onChange={(value) =>
            update("radius", Number(value) as WidgetBrandThemeInputs["radius"])
          }
          options={RADIUS_OPTIONS.map((value) => ({
            value: String(value),
            label: String(value),
          }))}
        />
      </Row>

      <Row label="Density">
        <Pills
          value={theme.density}
          onChange={(value) => update("density", value)}
          options={[
            { value: "compact", label: "Compact" },
            { value: "cozy", label: "Cozy" },
            { value: "spacious", label: "Spacious" },
          ]}
        />
      </Row>

      <Row label="Type">
        <StudioSelect
          value={theme.typePairing}
          onChange={(value) => update("typePairing", value)}
          options={FONT_CHOICES}
        />
      </Row>

      <Row label="Accent">
        <Pills
          value={theme.accentIntensity}
          onChange={(value) => update("accentIntensity", value)}
          options={[
            { value: "subtle", label: "Subtle" },
            { value: "balanced", label: "Balanced" },
            { value: "bold", label: "Bold" },
          ]}
        />
      </Row>

      <div className="grid grid-cols-2 gap-2">
        <Row label="Neutral">
          <StudioSelect
            value={theme.neutralTone}
            onChange={(value) => update("neutralTone", value)}
            options={[
              { value: "auto", label: "Auto" },
              { value: "pure", label: "Pure" },
              { value: "warm", label: "Warm" },
              { value: "cool", label: "Cool" },
            ]}
          />
        </Row>
        <Row label="Buttons">
          <StudioSelect
            value={theme.buttonStyle}
            onChange={(value) => update("buttonStyle", value)}
            options={[
              { value: "solid", label: "Solid" },
              { value: "soft", label: "Soft" },
              { value: "outline", label: "Outline" },
            ]}
          />
        </Row>
      </div>
    </SectionCollapsible>
  );
}

function SurfacePreview({
  surface,
}: {
  surface: WidgetBrandThemeInputs["surfaceStyle"];
}) {
  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <div
        className="aspect-[5/3] w-full rounded-md bg-card"
        style={{
          border:
            surface === "flat"
              ? "1px solid transparent"
              : "1px solid currentColor",
          boxShadow:
            surface === "elevated"
              ? "0 8px 18px color-mix(in srgb, currentColor 16%, transparent)"
              : "none",
          opacity: surface === "flat" ? 0.72 : 1,
        }}
      />
    </div>
  );
}
