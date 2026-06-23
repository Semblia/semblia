"use client";

/**
 * FormStylePanel — the form's appearance, rendered as a visual editor.
 *
 * Every choice is made by *looking*, never by reading a word in a dropdown:
 * layout cards, scheme cards, corner glyphs, density glyphs, mini buttons and
 * fields rendered in the live brand colour, background swatches, and real type
 * specimens. The hero preview shows the exact compiled result; these pickers
 * make the inputs feel like an editor, not a settings form.
 */

import * as React from "react";
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
import { Section, Field, OptionCardGroup } from "@/components/studio/controls";

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

/** Centers a glyph in an OptionCardGroup media area. */
function Glyph({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-full w-full items-center justify-center bg-muted/40 p-2.5",
        className,
      )}
    >
      {children}
    </span>
  );
}

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
    <div className="flex flex-col gap-7">
      {/* ── Layout ─────────────────────────────────────────────── */}
      <Section title="Layout" description="The overall shape of the page.">
        <OptionCardGroup<LayoutPreset>
          ariaLabel="Layout preset"
          columns={2}
          previewClassName="aspect-[16/10]"
          value={doc.layoutPreset}
          onChange={setLayout}
          options={[
            {
              value: "centeredCard",
              label: "Centered card",
              preview: layoutGlyph("centeredCard"),
            },
            {
              value: "fullPage",
              label: "Full page",
              preview: layoutGlyph("fullPage"),
            },
            {
              value: "splitHero",
              label: "Split hero",
              preview: layoutGlyph("splitHero"),
            },
            {
              value: "oneQuestion",
              label: "One question",
              preview: layoutGlyph("oneQuestion"),
            },
          ]}
        />
      </Section>

      {/* ── Brand ──────────────────────────────────────────────── */}
      <Section
        title="Brand color"
        description="Color drives the whole theme — we derive and AA-clamp the rest."
      >
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
                  "size-7 rounded-full border border-foreground/10 transition-transform duration-150 hover:scale-105 active:scale-95",
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

      {/* ── Scheme + Type ──────────────────────────────────────── */}
      <Section title="Scheme & type">
        <Field label="Color scheme">
          <OptionCardGroup<DisplayMode>
            ariaLabel="Color scheme"
            columns={3}
            previewClassName="aspect-[5/4]"
            value={doc.design.mode}
            onChange={(mode) => setDesign({ mode })}
            options={[
              { value: "light", label: "Light", preview: schemeGlyph("light") },
              { value: "dark", label: "Dark", preview: schemeGlyph("dark") },
              {
                value: "system",
                label: "Auto",
                preview: schemeGlyph("system"),
              },
            ]}
          />
        </Field>
        <Field label="Typography">
          <TypefacePicker
            value={doc.design.fontPairing}
            onChange={(fontPairing) => setDesign({ fontPairing })}
          />
        </Field>
      </Section>

      {/* ── Surface ────────────────────────────────────────────── */}
      <Section
        title="Surface"
        description="Fine-tune the feel of the form chrome."
      >
        <Field label="Corners">
          <OptionCardGroup<RadiusToken>
            ariaLabel="Corner radius"
            columns={3}
            previewClassName="aspect-[5/4]"
            value={doc.design.radius}
            onChange={(radius) => setDesign({ radius })}
            options={[
              { value: "sharp", label: "Sharp", preview: cornerGlyph(0) },
              { value: "soft", label: "Soft", preview: cornerGlyph(7) },
              { value: "rounded", label: "Rounded", preview: cornerGlyph(14) },
            ]}
          />
        </Field>
        <Field label="Density">
          <OptionCardGroup<DensityToken>
            ariaLabel="Density"
            columns={3}
            previewClassName="aspect-[5/4]"
            value={doc.design.density}
            onChange={(density) => setDesign({ density })}
            options={[
              {
                value: "compact",
                label: "Compact",
                preview: densityGlyph("compact"),
              },
              {
                value: "comfortable",
                label: "Comfort",
                preview: densityGlyph("comfortable"),
              },
              {
                value: "spacious",
                label: "Spacious",
                preview: densityGlyph("spacious"),
              },
            ]}
          />
        </Field>
        <Field label="Buttons">
          <OptionCardGroup<ButtonStyleToken>
            ariaLabel="Button style"
            columns={3}
            previewClassName="aspect-[5/4]"
            value={doc.design.buttonStyle}
            onChange={(buttonStyle) => setDesign({ buttonStyle })}
            options={[
              {
                value: "filled",
                label: "Filled",
                preview: buttonGlyph("filled", brand),
              },
              {
                value: "outline",
                label: "Outline",
                preview: buttonGlyph("outline", brand),
              },
              {
                value: "soft",
                label: "Soft",
                preview: buttonGlyph("soft", brand),
              },
            ]}
          />
        </Field>
        <Field label="Fields">
          <OptionCardGroup<FieldStyle>
            ariaLabel="Field style"
            columns={3}
            previewClassName="aspect-[5/4]"
            value={doc.design.fieldStyle}
            onChange={(fieldStyle) => setDesign({ fieldStyle })}
            options={[
              {
                value: "outlined",
                label: "Outlined",
                preview: fieldGlyph("outlined"),
              },
              {
                value: "filled",
                label: "Filled",
                preview: fieldGlyph("filled"),
              },
              {
                value: "underline",
                label: "Underline",
                preview: fieldGlyph("underline"),
              },
            ]}
          />
        </Field>
        <Field label="Background">
          <OptionCardGroup<BackgroundStyle>
            ariaLabel="Background style"
            columns={3}
            previewClassName="aspect-[5/4]"
            value={doc.design.backgroundStyle}
            onChange={(backgroundStyle) => setDesign({ backgroundStyle })}
            options={[
              {
                value: "plain",
                label: "Plain",
                preview: backgroundGlyph("plain", brand),
              },
              {
                value: "gradient",
                label: "Gradient",
                preview: backgroundGlyph("gradient", brand),
              },
              {
                value: "softPattern",
                label: "Pattern",
                preview: backgroundGlyph("softPattern", brand),
              },
            ]}
          />
        </Field>
      </Section>
    </div>
  );
}

/* ── Brand color control ─────────────────────────────────────────────────────── */

function BrandColorControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border">
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
        className="h-9 font-mono text-xs uppercase"
        aria-label="Brand color hex"
      />
    </div>
  );
}

/* ── Glyphs ──────────────────────────────────────────────────────────────────── */

function layoutGlyph(preset: LayoutPreset): React.ReactNode {
  const bar = "rounded-sm bg-foreground/15";
  const accent = "rounded-sm bg-brand/60";
  const wrap =
    "flex h-full w-full items-center justify-center gap-1 bg-muted/40 p-2";
  switch (preset) {
    case "fullPage":
      return (
        <div className={cn(wrap, "flex-col")}>
          <div className={cn(bar, "h-1.5 w-2/3")} />
          <div className={cn(bar, "h-1 w-full")} />
          <div className={cn(accent, "h-1.5 w-1/3 self-start")} />
        </div>
      );
    case "splitHero":
      return (
        <div className={cn(wrap)}>
          <div className="h-full w-1/2 rounded-sm bg-brand/40" />
          <div className="flex h-full w-1/2 flex-col justify-center gap-1">
            <div className={cn(bar, "h-1 w-full")} />
            <div className={cn(accent, "h-1.5 w-1/2")} />
          </div>
        </div>
      );
    case "oneQuestion":
      return (
        <div className={cn(wrap, "flex-col justify-center")}>
          <div className={cn(bar, "h-1.5 w-3/4")} />
          <div className={cn(accent, "h-2 w-1/4")} />
        </div>
      );
    case "centeredCard":
    default:
      return (
        <div className={cn(wrap)}>
          <div className="flex h-full w-2/3 flex-col justify-center gap-1 rounded-md bg-background p-1.5 shadow-sm">
            <div className={cn(bar, "h-1 w-full")} />
            <div className={cn(accent, "h-1.5 w-1/2")} />
          </div>
        </div>
      );
  }
}

function schemeGlyph(mode: DisplayMode): React.ReactNode {
  if (mode === "system") {
    return (
      <Glyph>
        <span className="relative size-9 overflow-hidden rounded-md border border-foreground/15">
          <span className="absolute inset-0 bg-white" />
          <span
            className="absolute inset-0 bg-zinc-900"
            style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
          />
          <span className="absolute left-1.5 top-1.5 h-1 w-4 rounded-full bg-zinc-400" />
          <span className="absolute bottom-1.5 right-1.5 h-1 w-4 rounded-full bg-zinc-500" />
        </span>
      </Glyph>
    );
  }
  const dark = mode === "dark";
  return (
    <Glyph>
      <span
        className={cn(
          "flex size-9 flex-col justify-center gap-1 rounded-md border p-1.5",
          dark ? "border-white/15 bg-zinc-900" : "border-black/10 bg-white",
        )}
      >
        <span
          className={cn(
            "h-1 w-full rounded-full",
            dark ? "bg-white/30" : "bg-zinc-300",
          )}
        />
        <span
          className={cn(
            "h-1 w-2/3 rounded-full",
            dark ? "bg-white/50" : "bg-zinc-400",
          )}
        />
      </span>
    </Glyph>
  );
}

function cornerGlyph(px: number): React.ReactNode {
  return (
    <Glyph>
      <span
        aria-hidden
        className="size-7 border-[1.5px] border-foreground/50"
        style={{ borderRadius: px }}
      />
    </Glyph>
  );
}

function densityGlyph(token: DensityToken): React.ReactNode {
  const gap =
    token === "compact"
      ? "gap-1"
      : token === "comfortable"
        ? "gap-1.5"
        : "gap-2.5";
  return (
    <Glyph>
      <span className={cn("flex w-9 flex-col", gap)}>
        <span className="h-1 w-full rounded-full bg-foreground/25" />
        <span className="h-1 w-full rounded-full bg-foreground/25" />
        <span className="h-1 w-2/3 rounded-full bg-foreground/25" />
      </span>
    </Glyph>
  );
}

function buttonGlyph(token: ButtonStyleToken, brand: string): React.ReactNode {
  const base =
    "flex h-5 w-14 items-center justify-center rounded-md text-[8px] font-semibold";
  let style: React.CSSProperties = {};
  let cls = "";
  if (token === "filled") {
    style = { background: brand, color: "#fff" };
  } else if (token === "outline") {
    style = { border: `1.5px solid ${brand}`, color: brand };
  } else {
    style = {
      background: `color-mix(in oklch, ${brand} 16%, transparent)`,
      color: brand,
    };
    cls = "font-semibold";
  }
  return (
    <Glyph>
      <span className={cn(base, cls)} style={style}>
        Submit
      </span>
    </Glyph>
  );
}

function fieldGlyph(token: FieldStyle): React.ReactNode {
  let cls = "";
  if (token === "outlined")
    cls = "rounded-md border border-foreground/30 bg-transparent";
  else if (token === "filled")
    cls = "rounded-md border border-transparent bg-foreground/10";
  else
    cls = "rounded-none border-b-[1.5px] border-foreground/40 bg-transparent";
  return (
    <Glyph>
      <span className={cn("flex h-5 w-14 items-center px-1.5", cls)}>
        <span className="h-1 w-2/3 rounded-full bg-foreground/25" />
      </span>
    </Glyph>
  );
}

function backgroundGlyph(
  token: BackgroundStyle,
  brand: string,
): React.ReactNode {
  if (token === "gradient") {
    return (
      <Glyph className="p-0">
        <span
          className="size-full"
          style={{
            background: `linear-gradient(135deg, ${brand} 0%, color-mix(in oklch, ${brand} 25%, white) 100%)`,
          }}
        />
      </Glyph>
    );
  }
  if (token === "softPattern") {
    return (
      <Glyph className="p-0">
        <span
          className="size-full"
          style={{
            backgroundColor: "var(--muted)",
            backgroundImage: `radial-gradient(color-mix(in oklch, ${brand} 35%, transparent) 1px, transparent 1px)`,
            backgroundSize: "8px 8px",
          }}
        />
      </Glyph>
    );
  }
  return (
    <Glyph className="p-0">
      <span className="size-full bg-muted" />
    </Glyph>
  );
}

/* ── Typeface picker — real specimens ────────────────────────────────────────── */

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
      className="flex flex-col gap-1.5"
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
              "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-[border-color,box-shadow] duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
              active
                ? "border-brand ring-2 ring-brand/60"
                : "border-border hover:border-foreground/25",
            )}
          >
            <span
              className="text-[17px] leading-none text-foreground"
              style={{ fontFamily: SPECIMEN_FONT[font] }}
            >
              Ag
            </span>
            <span className="flex-1 truncate text-[12.5px] font-medium text-foreground">
              {FONT_LABEL[font]}
            </span>
            <span
              className="hidden text-[12px] text-muted-foreground sm:inline"
              style={{ fontFamily: SPECIMEN_FONT[font] }}
            >
              Share your experience
            </span>
          </button>
        );
      })}
    </div>
  );
}
