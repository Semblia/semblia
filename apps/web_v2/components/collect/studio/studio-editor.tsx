"use client";

import * as React from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretDownIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  DEFAULT_PRESET_ID,
  LAYOUT_PRESETS,
  PRESETS,
  QUESTION_TYPES,
  contrastRatio,
  resolvePreset,
  resolveThemeSnapshot,
  type ColorOverrides,
  type FormDefinitionDoc,
  type FormQuestion,
  type LayoutPresetId,
  type PresetId,
  type QuestionType,
} from "@workspace/forms-core";
import type { V2MediaAssetDTO } from "@workspace/types";
import { PageTabs, type PageTabOption } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ColorPicker, isValidHexColor } from "@/components/ui/color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaUploader } from "@/components/media/media-uploader";
import { cn } from "@/lib/utils";
import type { StudioProject } from "./studio-client";

type Tab = "content" | "questions" | "layout" | "theme";

const TABS: PageTabOption<Tab>[] = [
  { id: "content", label: "Content" },
  { id: "questions", label: "Questions" },
  { id: "layout", label: "Layout" },
  { id: "theme", label: "Theme" },
];

// ── Small field primitives (match the settings surfaces) ─────────────────────

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

// ── Option sets for the theme knobs ──────────────────────────────────────────

const APPEARANCE = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match visitor (system)" },
] as const;
const RADIUS = [
  { value: "0", label: "None" },
  { value: "1", label: "Small" },
  { value: "2", label: "Medium" },
  { value: "3", label: "Large" },
  { value: "4", label: "Full" },
] as const;
const DENSITY = [
  { value: "compact", label: "Compact" },
  { value: "cozy", label: "Cozy" },
  { value: "spacious", label: "Spacious" },
] as const;
const TYPE_PAIRING = [
  { value: "inherit", label: "Inherit host page" },
  { value: "inter", label: "Inter" },
  { value: "geist", label: "Geist" },
  { value: "system", label: "System UI" },
  { value: "serif-editorial", label: "Serif editorial" },
] as const;
const SURFACE = [
  { value: "flat", label: "Flat" },
  { value: "bordered", label: "Bordered" },
  { value: "elevated", label: "Elevated" },
] as const;
const ACCENT = [
  { value: "subtle", label: "Subtle" },
  { value: "balanced", label: "Balanced" },
  { value: "bold", label: "Bold" },
] as const;
const NEUTRAL = [
  { value: "auto", label: "Auto (brand-tinted)" },
  { value: "pure", label: "Pure grey" },
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
] as const;
const BUTTON = [
  { value: "solid", label: "Solid" },
  { value: "soft", label: "Soft" },
  { value: "outline", label: "Outline" },
] as const;

const QUESTION_LABELS: Record<QuestionType, string> = {
  shorttext: "Short text",
  longtext: "Long text",
  email: "Email",
  stars: "Star rating",
  nps: "NPS (0–10)",
  emoji: "Emoji scale",
  radio: "Single choice",
  checkbox: "Multiple choice",
  dropdown: "Dropdown",
  file: "File upload",
};

const LAYOUT_META: Record<LayoutPresetId, { name: string; desc: string }> = {
  card: { name: "Card", desc: "Centered card. The dependable default." },
  inline: { name: "Inline", desc: "Chromeless, sits inside a page section." },
  split: { name: "Split", desc: "Brand panel beside the fields." },
  conversational: {
    name: "Conversational",
    desc: "One question at a time, guided.",
  },
};

const OPTION_KINDS: ReadonlySet<QuestionType> = new Set([
  "radio",
  "checkbox",
  "dropdown",
]);

function newQuestionId(existing: Set<string>): string {
  let id = "";
  do {
    id = `field_${Math.random().toString(36).slice(2, 8)}`;
  } while (existing.has(id));
  return id;
}

// ── Editor ───────────────────────────────────────────────────────────────────

export function StudioEditor({
  doc,
  onChange,
  project,
  slug,
  formId,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
  project: StudioProject;
  slug: string;
  formId: string;
}) {
  const [tab, setTab] = React.useState<Tab>("content");

  const setContent = (patch: Partial<FormDefinitionDoc["content"]>) =>
    onChange({ ...doc, content: { ...doc.content, ...patch } });
  const setSuccess = (
    patch: Partial<FormDefinitionDoc["content"]["success"]>,
  ) =>
    onChange({
      ...doc,
      content: {
        ...doc.content,
        success: { ...doc.content.success, ...patch },
      },
    });
  const setInputs = (patch: Partial<FormDefinitionDoc["theme"]["inputs"]>) =>
    onChange({
      ...doc,
      theme: { ...doc.theme, inputs: { ...doc.theme.inputs, ...patch } },
    });
  const setQuestions = (questions: FormQuestion[]) =>
    onChange({ ...doc, structure: { ...doc.structure, questions } });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border bg-background px-3">
        <PageTabs options={TABS} value={tab} onChange={setTab} />
      </div>
      <div className="flex-1 px-4 py-5 lg:min-h-0 lg:overflow-y-auto">
        {tab === "content" ? (
          <ContentPanel
            doc={doc}
            onChange={onChange}
            setContent={setContent}
            setSuccess={setSuccess}
            project={project}
            slug={slug}
            formId={formId}
          />
        ) : null}
        {tab === "questions" ? (
          <QuestionsPanel
            questions={doc.structure.questions}
            setQuestions={setQuestions}
          />
        ) : null}
        {tab === "layout" ? (
          <LayoutPanel doc={doc} onChange={onChange} />
        ) : null}
        {tab === "theme" ? (
          <ThemePanel doc={doc} setInputs={setInputs} onChange={onChange} />
        ) : null}
      </div>
    </div>
  );
}

// ── Panels ───────────────────────────────────────────────────────────────────

function ContentPanel({
  doc,
  onChange,
  setContent,
  setSuccess,
  project,
  slug,
  formId,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
  setContent: (patch: Partial<FormDefinitionDoc["content"]>) => void;
  setSuccess: (patch: Partial<FormDefinitionDoc["content"]["success"]>) => void;
  project: StudioProject;
  slug: string;
  formId: string;
}) {
  const { content } = doc;
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <BrandingSection
        doc={doc}
        onChange={onChange}
        project={project}
        slug={slug}
        formId={formId}
      />
      <Field label="Brand name" htmlFor="sf-brand">
        <Input
          id="sf-brand"
          value={content.brandName}
          onChange={(e) => setContent({ brandName: e.target.value })}
          placeholder="Acme"
        />
      </Field>
      <Field label="Headline" htmlFor="sf-headline">
        <Input
          id="sf-headline"
          value={content.headline}
          onChange={(e) => setContent({ headline: e.target.value })}
          placeholder="Share your experience"
        />
      </Field>
      <Field label="Subheadline" htmlFor="sf-subhead">
        <Textarea
          id="sf-subhead"
          rows={2}
          value={content.subhead}
          onChange={(e) => setContent({ subhead: e.target.value })}
          placeholder="It takes less than two minutes."
        />
      </Field>
      <Field label="Submit button label" htmlFor="sf-submit">
        <Input
          id="sf-submit"
          value={content.submitLabel}
          onChange={(e) => setContent({ submitLabel: e.target.value })}
          placeholder="Send feedback"
        />
      </Field>

      <div className="mt-1 border-t border-border pt-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          After submit
        </p>
        <div className="flex flex-col gap-5">
          <Field label="Thank-you title" htmlFor="sf-success-title">
            <Input
              id="sf-success-title"
              value={content.success.title}
              onChange={(e) => setSuccess({ title: e.target.value })}
            />
          </Field>
          <Field label="Thank-you message" htmlFor="sf-success-msg">
            <Textarea
              id="sf-success-msg"
              rows={2}
              value={content.success.message}
              onChange={(e) => setSuccess({ message: e.target.value })}
            />
          </Field>
          <SelectField
            label="On completion"
            value={content.success.action}
            onChange={(action) => setSuccess({ action })}
            options={[
              { value: "message", label: "Show the thank-you message" },
              { value: "redirect", label: "Redirect to a URL" },
              { value: "cta", label: "Show a call-to-action button" },
            ]}
          />
          {content.success.action === "redirect" ? (
            <Field
              label="Redirect URL"
              htmlFor="sf-redirect"
              hint="Must be https and on the same host as the form."
            >
              <Input
                id="sf-redirect"
                value={content.success.redirectUrl}
                onChange={(e) => setSuccess({ redirectUrl: e.target.value })}
                placeholder="https://…/thanks"
              />
            </Field>
          ) : null}
          {content.success.action === "cta" ? (
            <div className="flex flex-col gap-5 sm:flex-row">
              <Field label="Button label" htmlFor="sf-cta-label">
                <Input
                  id="sf-cta-label"
                  value={content.success.ctaLabel}
                  onChange={(e) => setSuccess({ ctaLabel: e.target.value })}
                  placeholder="Visit our site"
                />
              </Field>
              <Field label="Button URL" htmlFor="sf-cta-url">
                <Input
                  id="sf-cta-url"
                  value={content.success.ctaUrl}
                  onChange={(e) => setSuccess({ ctaUrl: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BrandingSection({
  doc,
  onChange,
  project,
  slug,
  formId,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
  project: StudioProject;
  slug: string;
  formId: string;
}) {
  const { content } = doc;
  const synced = content.brandingSync;
  const brandColor = doc.theme.inputs.brandColor;
  const projectBrand =
    project.brandColor && isValidHexColor(project.brandColor)
      ? project.brandColor
      : brandColor;

  // A form-owned uploaded logo round-trips through the uploader; a synced
  // (project) logo or empty state shows no uploader value.
  const logoAsset: V2MediaAssetDTO | null =
    !synced && content.logoAssetId && content.logoUrl
      ? {
          id: content.logoAssetId,
          url: content.logoUrl,
          contentType: "image/*",
          byteSize: null,
          purpose: "FORM_BRANDING_LOGO",
          visibility: "PUBLIC",
          status: "ACTIVE",
          createdAt: "",
        }
      : null;

  function applyProjectBranding() {
    onChange({
      ...doc,
      content: {
        ...doc.content,
        brandingSync: true,
        logoUrl: project.logoUrl,
        logoAssetId: null,
      },
    });
  }

  function customize() {
    onChange({
      ...doc,
      content: {
        ...doc.content,
        brandingSync: false,
        logoUrl: null,
        logoAssetId: null,
      },
      theme: {
        ...doc.theme,
        inputs: { ...doc.theme.inputs, brandColor: projectBrand },
      },
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">Branding</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Logo and brand color
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-foreground">
          <Switch
            checked={synced}
            onCheckedChange={(on) =>
              on ? applyProjectBranding() : customize()
            }
          />
          Use project branding
        </label>
      </div>

      {synced ? (
        <div className="flex items-center gap-3 rounded-md bg-muted/40 p-2.5">
          {project.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.logoUrl}
              alt=""
              className="size-10 rounded-md bg-background object-contain p-1"
            />
          ) : (
            <span
              className="flex size-10 items-center justify-center rounded-md text-xs font-semibold text-white"
              style={{ backgroundColor: projectBrand }}
              aria-hidden
            >
              {(project.name.trim()[0] ?? "S").toUpperCase()}
            </span>
          )}
          <span
            className="size-6 shrink-0 rounded-md border border-border"
            style={{ backgroundColor: projectBrand }}
            aria-hidden
          />
          <div className="min-w-0 text-[11px] leading-tight">
            <p className="font-medium text-foreground">
              Synced with project branding
            </p>
            <p className="text-muted-foreground">
              {project.logoUrl
                ? "Edit in Settings → Branding"
                : "No project logo — add one in Settings → Branding"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Logo" hint="Shown contained, never cropped.">
            <MediaUploader
              purpose="FORM_BRANDING_LOGO"
              projectSlug={slug}
              formId={formId}
              value={logoAsset}
              onChange={(asset) =>
                onChange({
                  ...doc,
                  content: {
                    ...doc.content,
                    logoUrl: asset?.url ?? null,
                    logoAssetId: asset?.id ?? null,
                  },
                })
              }
              size="sm"
              fit="contain"
            />
          </Field>
          <Field label="Brand color" htmlFor="sf-brand-color">
            <ColorPicker
              id="sf-brand-color"
              label="Brand"
              clearable={false}
              value={brandColor}
              onChange={(v) =>
                onChange({
                  ...doc,
                  theme: {
                    ...doc.theme,
                    inputs: {
                      ...doc.theme.inputs,
                      brandColor: v || "#4f46e5",
                    },
                  },
                })
              }
            />
          </Field>
          <button
            type="button"
            onClick={applyProjectBranding}
            className="self-start text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Reset to project branding
          </button>
        </div>
      )}
    </div>
  );
}

const ALIGN_OPTS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
] as const;
const WIDTH_OPTS = [
  { value: "cozy", label: "Cozy" },
  { value: "regular", label: "Regular" },
  { value: "wide", label: "Wide" },
] as const;
const SIDE_OPTS = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] as const;
const PANEL_FILL_OPTS = [
  { value: "soft", label: "Brand soft" },
  { value: "solid", label: "Solid brand" },
  { value: "neutral", label: "Neutral" },
] as const;
const PANEL_CONTENT_OPTS = [
  { value: "header", label: "Header" },
  { value: "quote", label: "Testimonial quote" },
  { value: "blurb", label: "Custom blurb" },
] as const;
const PANEL_RATIO_OPTS = [
  { value: "balanced", label: "Balanced" },
  { value: "narrow", label: "Narrow panel" },
] as const;
const PROGRESS_OPTS = [
  { value: "both", label: "Bar + count" },
  { value: "bar", label: "Bar only" },
  { value: "count", label: "Count only" },
  { value: "none", label: "None" },
] as const;

type LayoutOptions = FormDefinitionDoc["layout"]["options"];

function LayoutPanel({
  doc,
  onChange,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const { layout } = doc;

  const setPreset = (preset: LayoutPresetId) =>
    onChange({ ...doc, layout: { ...layout, preset } });
  const setOptions = (patch: Partial<LayoutOptions>) =>
    onChange({
      ...doc,
      layout: { ...layout, options: { ...layout.options, ...patch } },
    });

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {LAYOUT_PRESETS.map((preset) => {
          const meta = LAYOUT_META[preset];
          const active = layout.preset === preset;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={active}
              onClick={() => setPreset(preset)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors",
                active
                  ? "border-brand bg-brand/5 ring-1 ring-brand"
                  : "border-border hover:border-foreground/30",
              )}
            >
              <span className="text-sm font-semibold text-foreground">
                {meta.name}
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {meta.desc}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-border pt-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {LAYOUT_META[layout.preset].name} options
        </p>
        <LayoutKnobs
          preset={layout.preset}
          options={layout.options}
          setOptions={setOptions}
        />
      </div>
    </div>
  );
}

function LayoutKnobs({
  preset,
  options,
  setOptions,
}: {
  preset: LayoutPresetId;
  options: LayoutOptions;
  setOptions: (patch: Partial<LayoutOptions>) => void;
}) {
  if (preset === "card") {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Alignment"
          value={options.align}
          onChange={(align) => setOptions({ align })}
          options={ALIGN_OPTS}
        />
        <SelectField
          label="Width"
          value={options.width}
          onChange={(width) => setOptions({ width })}
          options={WIDTH_OPTS}
        />
      </div>
    );
  }

  if (preset === "inline") {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Alignment"
            value={options.align}
            onChange={(align) => setOptions({ align })}
            options={ALIGN_OPTS}
          />
          <SelectField
            label="Width"
            value={options.width}
            onChange={(width) => setOptions({ width })}
            options={WIDTH_OPTS}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Switch
            checked={options.showHeader}
            onCheckedChange={(showHeader) => setOptions({ showHeader })}
          />
          Show header (logo &amp; headline)
        </label>
      </div>
    );
  }

  if (preset === "split") {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Panel side"
            value={options.side}
            onChange={(side) => setOptions({ side })}
            options={SIDE_OPTS}
          />
          <SelectField
            label="Panel fill"
            value={options.panelFill}
            onChange={(panelFill) => setOptions({ panelFill })}
            options={PANEL_FILL_OPTS}
          />
          <SelectField
            label="Panel shows"
            value={options.panelContent}
            onChange={(panelContent) => setOptions({ panelContent })}
            options={PANEL_CONTENT_OPTS}
          />
          <SelectField
            label="Proportions"
            value={options.panelRatio}
            onChange={(panelRatio) => setOptions({ panelRatio })}
            options={PANEL_RATIO_OPTS}
          />
        </div>
        {options.panelContent === "quote" ? (
          <>
            <Field label="Quote">
              <Textarea
                rows={2}
                value={options.quoteText}
                onChange={(e) => setOptions({ quoteText: e.target.value })}
                placeholder="This saved our team hours every week."
              />
            </Field>
            <Field label="Attribution">
              <Input
                value={options.quoteAuthor}
                onChange={(e) => setOptions({ quoteAuthor: e.target.value })}
                placeholder="Jane Doe, Head of Product"
              />
            </Field>
          </>
        ) : null}
        {options.panelContent === "blurb" ? (
          <Field label="Blurb">
            <Textarea
              rows={3}
              value={options.blurb}
              onChange={(e) => setOptions({ blurb: e.target.value })}
              placeholder="A short message to display beside your form."
            />
          </Field>
        ) : null}
      </div>
    );
  }

  // conversational
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <SelectField
        label="Progress indicator"
        value={options.progress}
        onChange={(progress) => setOptions({ progress })}
        options={PROGRESS_OPTS}
      />
    </div>
  );
}

function ThemePanel({
  doc,
  setInputs,
  onChange,
}: {
  doc: FormDefinitionDoc;
  setInputs: (patch: Partial<FormDefinitionDoc["theme"]["inputs"]>) => void;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const { inputs } = doc.theme;
  const presetIds = Object.keys(PRESETS) as PresetId[];

  function applyPreset(id: PresetId) {
    onChange({
      ...doc,
      theme: {
        preset: id,
        inputs: resolvePreset(id, inputs.brandColor),
        // A preset is a clean slate — drop any manual color overrides.
        colorOverrides: EMPTY_OVERRIDES,
      },
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <Field
        label="Start from a preset"
        hint="A starting point — every knob below stays editable, and the result is always AA-contrast safe."
      >
        <div className="flex flex-wrap gap-2">
          {presetIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => applyPreset(id)}
              aria-pressed={doc.theme.preset === id}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                doc.theme.preset === id
                  ? "border-brand bg-brand/5 text-foreground ring-1 ring-brand"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {PRESETS[id]?.name ?? id}
              {id === DEFAULT_PRESET_ID ? " · default" : ""}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Appearance"
          value={inputs.appearance}
          onChange={(appearance) => setInputs({ appearance })}
          options={APPEARANCE}
        />
        <SelectField
          label="Corner radius"
          value={String(inputs.radius) as "0" | "1" | "2" | "3" | "4"}
          onChange={(v) =>
            setInputs({
              radius: Number(
                v,
              ) as FormDefinitionDoc["theme"]["inputs"]["radius"],
            })
          }
          options={RADIUS}
        />
        <SelectField
          label="Density"
          value={inputs.density}
          onChange={(density) => setInputs({ density })}
          options={DENSITY}
        />
        <SelectField
          label="Typeface"
          value={inputs.typePairing}
          onChange={(typePairing) => setInputs({ typePairing })}
          options={TYPE_PAIRING}
        />
        <SelectField
          label="Surface style"
          value={inputs.surfaceStyle}
          onChange={(surfaceStyle) => setInputs({ surfaceStyle })}
          options={SURFACE}
        />
        <SelectField
          label="Accent intensity"
          value={inputs.accentIntensity}
          onChange={(accentIntensity) => setInputs({ accentIntensity })}
          options={ACCENT}
        />
        <SelectField
          label="Neutral tone"
          value={inputs.neutralTone}
          onChange={(neutralTone) => setInputs({ neutralTone })}
          options={NEUTRAL}
        />
        <SelectField
          label="Button style"
          value={inputs.buttonStyle}
          onChange={(buttonStyle) => setInputs({ buttonStyle })}
          options={BUTTON}
        />
      </div>

      <ColorOverridesField doc={doc} onChange={onChange} />
    </div>
  );
}

const EMPTY_OVERRIDES: ColorOverrides = {
  accent: null,
  background: null,
  surface: null,
  text: null,
};

const OVERRIDE_TOKENS = [
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
] as const;

function ColorOverridesField({
  doc,
  onChange,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const { inputs, colorOverrides } = doc.theme;

  const base = React.useMemo(() => {
    const snap = resolveThemeSnapshot(inputs);
    return inputs.appearance === "dark"
      ? snap.schemes.dark
      : (snap.schemes.light ?? snap.schemes.dark);
  }, [inputs]);

  if (!base) return null;

  function setOverride(key: keyof ColorOverrides, value: string | null) {
    onChange({
      ...doc,
      theme: {
        ...doc.theme,
        colorOverrides: { ...colorOverrides, [key]: value },
      },
    });
  }

  const effective: Record<keyof ColorOverrides, string> = {
    accent: colorOverrides.accent ?? base.accent,
    background: colorOverrides.background ?? base.background,
    surface: colorOverrides.surface ?? base.surface,
    text: colorOverrides.text ?? base.text,
  };
  // Mid-typing an override leaves a partial hex; only score complete pairs.
  const scorable =
    isValidHexColor(effective.text) &&
    effective.text !== "" &&
    isValidHexColor(effective.surface) &&
    effective.surface !== "";
  const ratio = scorable
    ? contrastRatio(effective.text, effective.surface)
    : null;
  const aa = ratio !== null && ratio >= 4.5;

  return (
    <Field
      label="Colors"
      hint="Override any base color — everything else re-derives and stays AA-contrast safe."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {OVERRIDE_TOKENS.map(({ key, label }) => {
          const overridden = colorOverrides[key] !== null;
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  {label}
                </span>
                {overridden ? (
                  <button
                    type="button"
                    onClick={() => setOverride(key, null)}
                    className="text-[11px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                  >
                    Auto
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground/70">
                    Auto
                  </span>
                )}
              </div>
              <ColorPicker
                id={`sf-color-${key}`}
                label={label}
                clearable={false}
                value={effective[key]}
                onChange={(v) => setOverride(key, v.trim() === "" ? null : v)}
              />
            </div>
          );
        })}
      </div>
      {ratio !== null ? (
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium tabular-nums",
              aa ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
            )}
          >
            {aa ? "AA" : "Low"} · {ratio.toFixed(1)}:1
          </span>
          <span className="text-muted-foreground">text on surface</span>
        </div>
      ) : null}
    </Field>
  );
}

// ── Questions ─────────────────────────────────────────────────────────────────

function QuestionsPanel({
  questions,
  setQuestions,
}: {
  questions: FormQuestion[];
  setQuestions: (questions: FormQuestion[]) => void;
}) {
  const ids = new Set(questions.map((q) => q.id));

  function update(index: number, patch: Partial<FormQuestion>) {
    setQuestions(
      questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }
  function move(index: number, delta: number) {
    const next = [...questions];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setQuestions(next);
  }
  function remove(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }
  function add() {
    if (questions.length >= 30) return;
    setQuestions([
      ...questions,
      {
        id: newQuestionId(ids),
        type: "shorttext",
        label: "New question",
        placeholder: "",
        description: "",
        required: false,
        options: [],
        showIf: null,
      },
    ]);
  }
  function changeType(index: number, type: QuestionType) {
    const q = questions[index]!;
    const needsOptions = OPTION_KINDS.has(type);
    const options =
      needsOptions && q.options.length < 2
        ? ["Option 1", "Option 2"]
        : q.options;
    update(index, { type, options });
  }

  return (
    <div className="flex max-w-xl flex-col gap-3">
      {questions.map((q, i) => (
        <QuestionRow
          key={q.id}
          question={q}
          index={i}
          total={questions.length}
          others={questions.filter((x) => x.id !== q.id)}
          onUpdate={(patch) => update(i, patch)}
          onChangeType={(type) => changeType(i, type)}
          onMove={(delta) => move(i, delta)}
          onRemove={() => remove(i)}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={add}
        disabled={questions.length >= 30}
        className="mt-1 self-start"
      >
        <PlusIcon className="size-4" aria-hidden /> Add question
      </Button>
    </div>
  );
}

function QuestionRow({
  question,
  index,
  total,
  others,
  onUpdate,
  onChangeType,
  onMove,
  onRemove,
}: {
  question: FormQuestion;
  index: number;
  total: number;
  others: FormQuestion[];
  onUpdate: (patch: Partial<FormQuestion>) => void;
  onChangeType: (type: QuestionType) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const isOptionKind = OPTION_KINDS.has(question.type);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 p-3">
        <div className="flex flex-col">
          <button
            type="button"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ArrowUpIcon className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ArrowDownIcon className="size-3.5" aria-hidden />
          </button>
        </div>
        <Input
          value={question.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Question label"
          className="flex-1"
          aria-label={`Question ${index + 1} label`}
        />
        <button
          type="button"
          aria-label="Edit question details"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <CaretDownIcon
            className={cn("size-4 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
        <button
          type="button"
          aria-label="Remove question"
          onClick={onRemove}
          className="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
        >
          <TrashIcon className="size-4" aria-hidden />
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-4 border-t border-border p-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Type"
              value={question.type}
              onChange={onChangeType}
              options={QUESTION_TYPES.map((t) => ({
                value: t,
                label: QUESTION_LABELS[t],
              }))}
            />
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Switch
                  checked={question.required}
                  onCheckedChange={(required) => onUpdate({ required })}
                />
                Required
              </label>
            </div>
          </div>

          {question.type === "shorttext" ||
          question.type === "longtext" ||
          question.type === "email" ||
          question.type === "dropdown" ? (
            <Field label="Placeholder">
              <Input
                value={question.placeholder}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Optional hint text"
              />
            </Field>
          ) : null}

          <Field label="Helper text" hint="Shown under the question label.">
            <Input
              value={question.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Optional"
            />
          </Field>

          {isOptionKind ? (
            <OptionsEditor
              options={question.options}
              onChange={(options) => onUpdate({ options })}
            />
          ) : null}

          {question.type === "file" ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              Visitors can attach an image, audio, or video file (up to
              100&nbsp;MB). Uploads run on the hosted form and full page;
              embedded forms point visitors to the hosted form instead.
            </p>
          ) : null}

          <ConditionEditor
            question={question}
            others={others}
            onChange={(showIf) => onUpdate({ showIf })}
          />
        </div>
      ) : null}
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  return (
    <Field
      label="Options"
      hint={options.length < 2 ? "Add at least two options." : undefined}
    >
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={opt}
              onChange={(e) =>
                onChange(options.map((o, j) => (j === i ? e.target.value : o)))
              }
              placeholder={`Option ${i + 1}`}
              aria-label={`Option ${i + 1}`}
            />
            <button
              type="button"
              aria-label="Remove option"
              disabled={options.length <= 1}
              onClick={() => onChange(options.filter((_, j) => j !== i))}
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-destructive disabled:opacity-30"
            >
              <TrashIcon className="size-4" aria-hidden />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...options, `Option ${options.length + 1}`])}
          disabled={options.length >= 20}
          className="self-start"
        >
          <PlusIcon className="size-3.5" aria-hidden /> Add option
        </Button>
      </div>
    </Field>
  );
}

type ShowIfRule = NonNullable<FormQuestion["showIf"]>;
type ShowIfOp = ShowIfRule["op"];

const OP_LABELS: Record<ShowIfOp, string> = {
  eq: "equals",
  neq: "does not equal",
  gt: "greater than",
  lt: "less than",
  gte: "at least",
  lte: "at most",
  includes: "includes",
};

/** The discrete answer values a controlling question can take, or null for free text. */
function controllerChoices(q: FormQuestion): string[] | null {
  if (OPTION_KINDS.has(q.type)) return q.options;
  if (q.type === "stars") return ["1", "2", "3", "4", "5"];
  if (q.type === "nps") return Array.from({ length: 11 }, (_, i) => String(i));
  return null;
}

/** The comparison operators that make sense for a controlling question's type. */
function controllerOps(q: FormQuestion): ShowIfOp[] {
  if (q.type === "checkbox") return ["includes", "eq", "neq"];
  if (OPTION_KINDS.has(q.type)) return ["eq", "neq"];
  if (q.type === "stars" || q.type === "nps")
    return ["eq", "neq", "gte", "lte", "gt", "lt"];
  return ["includes", "eq", "neq"];
}

/**
 * A valid, satisfiable default rule — never the empty-value foot-gun that the
 * runtime treats as "never show". Option kinds default to the first option;
 * scales to their top value; free-text to "includes" (shows once answered).
 */
function defaultRuleFor(q: FormQuestion): ShowIfRule {
  const choices = controllerChoices(q);
  const op = controllerOps(q)[0]!;
  const numeric = q.type === "stars" || q.type === "nps";
  const value =
    choices && choices.length
      ? numeric
        ? choices[choices.length - 1]!
        : choices[0]!
      : "";
  return { questionId: q.id, op, value };
}

function ConditionEditor({
  question,
  others,
  onChange,
}: {
  question: FormQuestion;
  others: FormQuestion[];
  onChange: (showIf: FormQuestion["showIf"]) => void;
}) {
  const rule = question.showIf;
  const enabled = rule !== null;

  if (others.length === 0) {
    return null;
  }

  function enable(on: boolean) {
    onChange(on ? defaultRuleFor(others[0]!) : null);
  }

  const controller =
    (rule && others.find((o) => o.id === rule.questionId)) || others[0]!;
  const choices = controllerChoices(controller);
  const ops = controllerOps(controller);

  return (
    <div className="rounded-md border border-dashed border-border p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
        <Switch checked={enabled} onCheckedChange={enable} />
        Only show this question conditionally
      </label>
      {enabled && rule ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SelectField
            label="When question"
            value={rule.questionId}
            onChange={(questionId) => {
              // Re-seed op + value for the new controller so the rule stays valid.
              const next = others.find((o) => o.id === questionId);
              onChange(next ? defaultRuleFor(next) : { ...rule, questionId });
            }}
            options={others.map((o) => ({ value: o.id, label: o.label }))}
          />
          <SelectField
            label="Condition"
            value={rule.op}
            onChange={(op) => onChange({ ...rule, op })}
            options={ops.map((op) => ({ value: op, label: OP_LABELS[op] }))}
          />
          {choices ? (
            <SelectField
              label="Value"
              value={String(rule.value)}
              onChange={(value) => onChange({ ...rule, value })}
              options={choices.map((c) => ({ value: c, label: c }))}
            />
          ) : (
            <Field label="Value">
              <Input
                value={String(rule.value)}
                onChange={(e) => onChange({ ...rule, value: e.target.value })}
                placeholder="Answer contains…"
              />
            </Field>
          )}
        </div>
      ) : null}
    </div>
  );
}
