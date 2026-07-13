"use client";

/**
 * TemplatePanel + BrandPanel — the template system's owner surface.
 *
 * The owner picks a template (the big decision), answers its ≤3 art-directed
 * accent decisions, and supplies brand facts. There are no raw design knobs:
 * taste belongs to the template pack, brand color enters only through the
 * AA-clamped derivation engine.
 */

import * as React from "react";
import { SunIcon, MoonStarsIcon, CircleHalfIcon } from "@phosphor-icons/react";
import {
  FORM_TEMPLATES,
  normalizeAccents,
  resolveTemplateManifest,
  type FormDefinitionDoc,
  type FormTemplateManifest,
} from "@workspace/forms-core";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  PanelSection,
  Field,
  Row,
  IconSegment,
  Segmented,
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

// ── Template gallery ──────────────────────────────────────────────────────────

export function TemplatePanel({
  doc,
  onChange,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const manifest = resolveTemplateManifest(doc.templateId);
  const accents = normalizeAccents(manifest, doc.accents);

  const setTemplate = (templateId: string) =>
    // Content survives a template switch; accents reset to the new
    // template's defaults (they are template-scoped decisions).
    onChange({ ...doc, templateId, accents: {} });

  const setAccent = (key: string, value: string) =>
    onChange({ ...doc, accents: { ...accents, [key]: value } });

  return (
    <>
      <PanelSection title="Template">
        <div
          className="grid grid-cols-1 gap-2"
          role="radiogroup"
          aria-label="Template"
        >
          {FORM_TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              manifest={t}
              selected={t.id === manifest.id}
              onSelect={() => setTemplate(t.id)}
            />
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground/80">
          Each template is its own design — switching keeps your questions and
          words.
        </p>
      </PanelSection>

      {manifest.accents.length > 0 ? (
        <PanelSection title={`${manifest.name} decisions`}>
          {manifest.accents.map((spec) => (
            <Field key={spec.key} label={spec.label}>
              <Segmented<string>
                ariaLabel={spec.label}
                value={accents[spec.key] ?? spec.defaultValue}
                onChange={(v) => setAccent(spec.key, v)}
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

/** A template card: a hand-set miniature evoking the pack, not a knob preset. */
function TemplateCard({
  manifest,
  selected,
  onSelect,
}: {
  manifest: FormTemplateManifest;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
        selected
          ? "border-foreground/60 bg-muted/40"
          : "border-border/70 hover:border-foreground/30 hover:bg-muted/20",
      )}
    >
      <TemplateMiniature id={manifest.id} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-foreground">
          {manifest.name}
        </span>
        <span className="mt-0.5 block truncate text-[11px] leading-snug text-muted-foreground">
          {manifest.tagline}
        </span>
      </span>
    </button>
  );
}

/** Pure-CSS miniatures — each evokes its pack's world at a glance. */
function TemplateMiniature({ id }: { id: string }) {
  switch (id) {
    case "aperture":
      return (
        <span className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-950">
          <span
            className="absolute inset-x-0 top-0 h-6 bg-indigo-500/25 blur-md"
            aria-hidden
          />
          <span className="relative flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-red-500" />
            <span className="h-1 w-6 rounded-full bg-zinc-500" />
          </span>
          <span
            className="absolute inset-x-0 top-0 h-px bg-indigo-400/70"
            aria-hidden
          />
        </span>
      );
    case "ledger":
      return (
        <span className="flex h-12 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-amber-900/10 bg-amber-50">
          <span className="font-serif text-[10px] italic leading-none text-stone-700">
            Aa
          </span>
          <span className="h-px w-8 bg-stone-400" />
          <span className="h-px w-6 bg-stone-300" />
        </span>
      );
    case "parcel":
      return (
        <span className="flex h-12 w-16 shrink-0 flex-col overflow-hidden rounded-md border border-border bg-white dark:bg-zinc-100">
          <span className="h-4 w-full bg-gradient-to-r from-orange-300 to-rose-300" />
          <span className="flex flex-1 items-center justify-center gap-[2px] text-[8px] leading-none text-amber-500">
            ★★★★★
          </span>
        </span>
      );
    case "terminal":
      return (
        <span className="flex h-12 w-16 shrink-0 flex-col overflow-hidden rounded-md border border-border bg-background [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:8px_8px]">
          <span className="flex h-3.5 items-center gap-1 border-b border-border bg-muted/60 px-1.5">
            <span className="size-1 rounded-full bg-foreground/40" />
            <span className="font-mono text-[6px] leading-none text-muted-foreground">
              2/5
            </span>
          </span>
          <span className="m-auto flex gap-[2px]">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className="flex size-3 items-center justify-center rounded-[2px] border border-border bg-background font-mono text-[6px] leading-none text-muted-foreground"
              >
                {n}
              </span>
            ))}
          </span>
        </span>
      );
    case "meridian":
    default:
      return (
        <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-muted/70">
          <span className="flex h-8 w-10 flex-col justify-center gap-[3px] rounded-[4px] border border-border bg-background px-1.5 shadow-sm">
            <span className="h-[3px] w-2/3 rounded-full bg-foreground/60" />
            <span className="h-[2px] w-full rounded-full bg-foreground/20" />
            <span className="h-[3px] w-1/3 rounded-full bg-foreground/40" />
          </span>
        </span>
      );
  }
}

// ── Brand facts ───────────────────────────────────────────────────────────────

export function BrandPanel({
  doc,
  onChange,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const manifest = resolveTemplateManifest(doc.templateId);
  const setBrand = (patch: Partial<FormDefinitionDoc["brand"]>) =>
    onChange({ ...doc, brand: { ...doc.brand, ...patch } });
  const brand = doc.brand.color;
  const appearanceLocked = manifest.appearances.length === 1;

  return (
    <>
      <PanelSection title="Brand">
        <Field label="Business name" htmlFor="b-name">
          <Input
            id="b-name"
            value={doc.brand.name}
            onChange={(e) => setBrand({ name: e.target.value })}
            placeholder="Acme Inc."
          />
        </Field>
        <Field label="Brand color">
          <BrandColorControl
            value={brand}
            onChange={(color) => setBrand({ color })}
          />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PALETTE.map((color) => {
            const selected = brand.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => setBrand({ color })}
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
          One color drives the whole theme — every dependent tone is derived and
          contrast-clamped.
        </p>
      </PanelSection>

      <PanelSection title="Appearance">
        {appearanceLocked ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground/80">
            {manifest.name} is a {manifest.appearances[0]}-native design.
          </p>
        ) : (
          <Row label="Scheme">
            <IconSegment<FormDefinitionDoc["brand"]["appearance"]>
              ariaLabel="Color scheme"
              value={doc.brand.appearance}
              onChange={(appearance) => setBrand({ appearance })}
              options={[
                { value: "light", label: "Light", icon: SunIcon },
                { value: "dark", label: "Dark", icon: MoonStarsIcon },
                { value: "system", label: "Auto", icon: CircleHalfIcon },
              ]}
            />
          </Row>
        )}
      </PanelSection>
    </>
  );
}

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
