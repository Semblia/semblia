"use client";

/**
 * FormStylePanel — the form's appearance (the Design tab).
 *
 * Compact rows over card walls: layout is the one genuinely visual choice
 * (small line-art tiles); everything else is a quiet glyph segment or value
 * row. The live canvas is the preview — the controls never compete with it.
 */

import * as React from "react";
import { SunIcon, MoonStarsIcon, CircleHalfIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type {
  FormDefinitionDoc,
  LayoutPreset,
  DisplayMode,
  RadiusToken,
  DensityToken,
  ButtonStyleToken,
  FieldStyle,
  BackgroundStyle,
  FontPairing,
} from "@workspace/forms-core";
import {
  PanelSection,
  Row,
  IconSegment,
  GlyphTileGroup,
} from "@/components/studio/controls";

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

export function FormStylePanel({
  doc,
  onChange,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const brand = doc.design.brandColor;
  const setDesign = (patch: Partial<FormDefinitionDoc["design"]>) =>
    onChange({ ...doc, design: { ...doc.design, ...patch } });
  const setLayout = (layoutPreset: LayoutPreset) =>
    onChange({ ...doc, layoutPreset });

  return (
    <>
      <PanelSection title="Layout">
        <GlyphTileGroup<LayoutPreset>
          ariaLabel="Layout preset"
          columns={2}
          value={doc.layoutPreset}
          onChange={setLayout}
          options={[
            {
              value: "centeredCard",
              label: "Card",
              glyph: <LayoutGlyph preset="centeredCard" />,
            },
            {
              value: "fullPage",
              label: "Full page",
              glyph: <LayoutGlyph preset="fullPage" />,
            },
            {
              value: "splitHero",
              label: "Split",
              glyph: <LayoutGlyph preset="splitHero" />,
            },
            {
              value: "oneQuestion",
              label: "One question",
              glyph: <LayoutGlyph preset="oneQuestion" />,
            },
          ]}
        />
      </PanelSection>

      <PanelSection title="Brand">
        <BrandColorControl
          value={brand}
          onChange={(c) => setDesign({ brandColor: c })}
        />
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PALETTE.map((color) => {
            const selected = brand.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => setDesign({ brandColor: color })}
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
          One color drives the theme — the rest is derived and AA-clamped.
        </p>
      </PanelSection>

      <PanelSection title="Theme">
        <Row label="Scheme">
          <IconSegment<DisplayMode>
            ariaLabel="Color scheme"
            value={doc.design.mode}
            onChange={(mode) => setDesign({ mode })}
            options={[
              { value: "light", label: "Light", icon: SunIcon },
              { value: "dark", label: "Dark", icon: MoonStarsIcon },
              { value: "system", label: "Auto", icon: CircleHalfIcon },
            ]}
          />
        </Row>
        <TypefacePicker
          value={doc.design.fontPairing}
          onChange={(fontPairing) => setDesign({ fontPairing })}
        />
      </PanelSection>

      <PanelSection title="Surface">
        <Row label="Corners">
          <IconSegment<RadiusToken>
            ariaLabel="Corner radius"
            value={doc.design.radius}
            onChange={(radius) => setDesign({ radius })}
            options={[
              { value: "sharp", label: "Sharp", icon: cornerIcon(0) },
              { value: "soft", label: "Soft", icon: cornerIcon(3) },
              { value: "rounded", label: "Rounded", icon: cornerIcon(6) },
            ]}
          />
        </Row>
        <Row label="Density">
          <IconSegment<DensityToken>
            ariaLabel="Density"
            value={doc.design.density}
            onChange={(density) => setDesign({ density })}
            options={[
              { value: "compact", label: "Compact", icon: densityIcon(1) },
              {
                value: "comfortable",
                label: "Comfortable",
                icon: densityIcon(2),
              },
              { value: "spacious", label: "Spacious", icon: densityIcon(3.5) },
            ]}
          />
        </Row>
        <Row label="Buttons">
          <IconSegment<ButtonStyleToken>
            ariaLabel="Button style"
            value={doc.design.buttonStyle}
            onChange={(buttonStyle) => setDesign({ buttonStyle })}
            options={[
              { value: "filled", label: "Filled", icon: ButtonFilledGlyph },
              { value: "outline", label: "Outline", icon: ButtonOutlineGlyph },
              { value: "soft", label: "Soft", icon: ButtonSoftGlyph },
            ]}
          />
        </Row>
        <Row label="Fields">
          <IconSegment<FieldStyle>
            ariaLabel="Field style"
            value={doc.design.fieldStyle}
            onChange={(fieldStyle) => setDesign({ fieldStyle })}
            options={[
              {
                value: "outlined",
                label: "Outlined",
                icon: FieldOutlinedGlyph,
              },
              { value: "filled", label: "Filled", icon: FieldFilledGlyph },
              {
                value: "underline",
                label: "Underline",
                icon: FieldUnderlineGlyph,
              },
            ]}
          />
        </Row>
        <Row label="Background">
          <IconSegment<BackgroundStyle>
            ariaLabel="Background style"
            value={doc.design.backgroundStyle}
            onChange={(backgroundStyle) => setDesign({ backgroundStyle })}
            options={[
              { value: "plain", label: "Plain", icon: BgPlainGlyph },
              { value: "gradient", label: "Gradient", icon: BgGradientGlyph },
              { value: "softPattern", label: "Pattern", icon: BgPatternGlyph },
            ]}
          />
        </Row>
      </PanelSection>
    </>
  );
}

/* ── Brand color control ─────────────────────────────────────────────────── */

function BrandColorControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border">
        <span
          className="absolute inset-0"
          style={{ backgroundColor: value }}
          aria-hidden
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Brand color"
        />
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 font-mono text-[11px] uppercase"
        aria-label="Brand color hex"
      />
    </div>
  );
}

/* ── Monochrome glyphs (currentColor only — the canvas shows the truth) ──── */

function LayoutGlyph({ preset }: { preset: LayoutPreset }) {
  const line = "rounded-[1px] bg-current opacity-60";
  const box = "rounded-[2px] border border-current opacity-80";
  switch (preset) {
    case "fullPage":
      return (
        <span className="flex h-7 w-10 flex-col justify-center gap-[3px] px-1">
          <span className={cn(line, "h-[3px] w-2/3")} />
          <span className={cn(line, "h-[2px] w-full opacity-35")} />
          <span className={cn(line, "h-[2px] w-full opacity-35")} />
          <span className={cn(line, "h-[3px] w-1/3")} />
        </span>
      );
    case "splitHero":
      return (
        <span className={cn(box, "flex h-7 w-10 overflow-hidden")}>
          <span className="h-full w-1/2 bg-current opacity-30" />
          <span className="flex h-full w-1/2 flex-col justify-center gap-[3px] px-[3px]">
            <span className={cn(line, "h-[2px] w-full")} />
            <span className={cn(line, "h-[2px] w-2/3")} />
          </span>
        </span>
      );
    case "oneQuestion":
      return (
        <span
          className={cn(
            box,
            "flex h-7 w-10 flex-col items-center justify-center gap-[3px]",
          )}
        >
          <span className={cn(line, "h-[3px] w-2/3")} />
          <span className={cn(line, "h-[4px] w-1/4")} />
        </span>
      );
    case "centeredCard":
    default:
      return (
        <span className="flex h-7 w-10 items-center justify-center rounded-[2px] bg-current/15">
          <span
            className={cn(
              box,
              "flex h-5 w-6 flex-col justify-center gap-[2px] px-[3px]",
            )}
          >
            <span className={cn(line, "h-[2px] w-full")} />
            <span className={cn(line, "h-[2px] w-2/3")} />
          </span>
        </span>
      );
  }
}

function cornerIcon(radius: number) {
  return function CornerGlyph({ className }: { className?: string }) {
    return (
      <span className={cn("flex items-center justify-center", className)}>
        <span
          aria-hidden
          className="block size-3 border-[1.5px] border-current"
          style={{ borderRadius: radius }}
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

function ButtonFilledGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span className="h-2 w-3.5 rounded-[3px] bg-current" />
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

function ButtonSoftGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span className="h-2 w-3.5 rounded-[3px] bg-current opacity-35" />
    </span>
  );
}

function FieldOutlinedGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span className="flex h-2 w-3.5 items-center rounded-[2px] border border-current px-[2px]">
        <span className="h-[1.5px] w-2/3 rounded-full bg-current opacity-60" />
      </span>
    </span>
  );
}

function FieldFilledGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span className="flex h-2 w-3.5 items-center rounded-[2px] bg-current/25 px-[2px]">
        <span className="h-[1.5px] w-2/3 rounded-full bg-current opacity-70" />
      </span>
    </span>
  );
}

function FieldUnderlineGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span className="flex h-2 w-3.5 items-end border-b border-current pb-[1px]">
        <span className="h-[1.5px] w-2/3 rounded-full bg-current opacity-60" />
      </span>
    </span>
  );
}

function BgPlainGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span className="size-3 rounded-[2px] border border-current opacity-70" />
    </span>
  );
}

function BgGradientGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span
        className="size-3 rounded-[2px]"
        style={{
          background:
            "linear-gradient(135deg, currentColor 0%, transparent 90%)",
        }}
      />
    </span>
  );
}

function BgPatternGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <span
        className="size-3 rounded-[2px]"
        style={{
          backgroundImage:
            "radial-gradient(currentColor 0.75px, transparent 0.75px)",
          backgroundSize: "3.5px 3.5px",
        }}
      />
    </span>
  );
}

/* ── Typeface picker — real specimens, slim rows ─────────────────────────── */

const SPECIMEN_FONT: Record<FontPairing, string> = {
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  geist: '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  serifEditorial: '"Fraunces", Georgia, "Times New Roman", serif',
};

const FONT_LABEL: Record<FontPairing, string> = {
  inter: "Inter",
  geist: "Geist",
  system: "System",
  serifEditorial: "Serif editorial",
};

function TypefacePicker({
  value,
  onChange,
}: {
  value: FontPairing;
  onChange: (v: FontPairing) => void;
}) {
  const fonts: FontPairing[] = ["inter", "geist", "system", "serifEditorial"];
  return (
    <div
      role="radiogroup"
      aria-label="Typeface"
      className="flex flex-col gap-1"
    >
      {fonts.map((font) => {
        const active = value === font;
        return (
          <button
            key={font}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(font)}
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
              style={{ fontFamily: SPECIMEN_FONT[font] }}
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
              {FONT_LABEL[font]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
