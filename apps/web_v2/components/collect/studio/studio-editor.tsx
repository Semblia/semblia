"use client";

/**
 * StudioEditor — the visual inspector for a forms-v4 document.
 *
 * A section rail (Compose / Questions / Layout / Style) beside a focused panel.
 * Every appearance decision is made by *looking*: themed preset cards and
 * surface/accent/button tiles are rendered from the real derivation engine
 * (`ThemeSwatch`), layouts from the production-grade `FormCardPreview`. No
 * dropdowns for visual choices. The doc contract, engine, and AA-clamped
 * derivation are unchanged — this expands affordance, not capability.
 */

import * as React from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  AtIcon,
  CaretCircleDownIcon,
  CaretDownIcon,
  CheckSquareIcon,
  CircleHalfIcon,
  GaugeIcon,
  ListChecksIcon,
  MoonIcon,
  PaintBrushBroadIcon,
  PaperclipIcon,
  ParagraphIcon,
  PlusIcon,
  RadioButtonIcon,
  SlidersIcon,
  SmileyIcon,
  SquaresFourIcon,
  StarIcon,
  SunIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAaIcon,
  TextTIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  DEFAULT_PRESET_ID,
  LAYOUT_PRESETS,
  PRESETS,
  contrastRatio,
  resolvePreset,
  resolveThemeSnapshot,
  type ColorOverrides,
  type FormDefinitionDoc,
  type FormQuestion,
  type FormThemeInputs,
  type LayoutPresetId,
  type PresetId,
  type QuestionType,
  type TypePairingId,
} from "@workspace/forms-core";
import type { V2MediaAssetDTO } from "@workspace/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ColorPicker, isValidHexColor } from "@/components/ui/color-picker";
import { MediaUploader } from "@/components/media/media-uploader";
import { cn } from "@/lib/utils";
import { FormCardPreview } from "../form-card-preview";
import type { FormLayoutPreset } from "@/lib/collect/forms-list";
import type { StudioProject } from "./studio-client";
import { ThemeSwatch } from "./theme-swatch";
import {
  AaBadge,
  Field,
  OptionCardGroup,
  Section,
  Segmented,
  SwitchRow,
  type OptionCard,
} from "./studio-controls";

type IconType = React.ComponentType<{ className?: string }>;
type SectionId = "compose" | "questions" | "layout" | "style";

const SECTIONS: ReadonlyArray<{
  id: SectionId;
  label: string;
  icon: IconType;
}> = [
  { id: "compose", label: "Compose", icon: TextAaIcon },
  { id: "questions", label: "Questions", icon: ListChecksIcon },
  { id: "layout", label: "Layout", icon: SquaresFourIcon },
  { id: "style", label: "Style", icon: PaintBrushBroadIcon },
];

// ── Question type metadata ────────────────────────────────────────────────────

const QUESTION_TYPE_META: Record<
  QuestionType,
  {
    label: string;
    icon: IconType;
    group: "text" | "rating" | "choice" | "media";
  }
> = {
  shorttext: { label: "Short text", icon: TextTIcon, group: "text" },
  longtext: { label: "Long text", icon: ParagraphIcon, group: "text" },
  email: { label: "Email", icon: AtIcon, group: "text" },
  stars: { label: "Star rating", icon: StarIcon, group: "rating" },
  nps: { label: "NPS (0–10)", icon: GaugeIcon, group: "rating" },
  emoji: { label: "Emoji scale", icon: SmileyIcon, group: "rating" },
  radio: { label: "Single choice", icon: RadioButtonIcon, group: "choice" },
  checkbox: {
    label: "Multiple choice",
    icon: CheckSquareIcon,
    group: "choice",
  },
  dropdown: { label: "Dropdown", icon: CaretCircleDownIcon, group: "choice" },
  file: { label: "File upload", icon: PaperclipIcon, group: "media" },
};

const TYPE_GROUPS: ReadonlyArray<{
  id: "text" | "rating" | "choice" | "media";
  label: string;
}> = [
  { id: "text", label: "Text" },
  { id: "rating", label: "Rating" },
  { id: "choice", label: "Choice" },
  { id: "media", label: "Media" },
];

const OPTION_KINDS: ReadonlySet<QuestionType> = new Set([
  "radio",
  "checkbox",
  "dropdown",
]);

const LAYOUT_META: Record<LayoutPresetId, { name: string; desc: string }> = {
  card: { name: "Card", desc: "Centered card — the dependable default." },
  inline: { name: "Inline", desc: "Chromeless, sits inside a page section." },
  split: { name: "Split", desc: "Brand panel beside the fields." },
  conversational: { name: "Guided", desc: "One question at a time." },
};

const TYPE_SPECIMEN: Record<
  TypePairingId,
  { label: string; family: string; note: string }
> = {
  inherit: {
    label: "Match host",
    family: "inherit",
    note: "Use the page's font",
  },
  inter: {
    label: "Inter",
    family: '"Inter", system-ui, sans-serif',
    note: "Clean & neutral",
  },
  geist: {
    label: "Geist",
    family: '"Geist", "Inter", sans-serif',
    note: "Modern, on-brand",
  },
  system: {
    label: "System",
    family: "system-ui, sans-serif",
    note: "Native to each OS",
  },
  "serif-editorial": {
    label: "Editorial",
    family: '"Fraunces", "Georgia", serif',
    note: "Warm, expressive serif",
  },
};

// Display-only corner radii (px) for the radius glyph — proportional to the
// engine's 0/8/14/20/28 scale on a small tile.
const RADIUS_DISPLAY = [0, 5, 8, 11, 14] as const;
const RADIUS_LABELS = ["None", "S", "M", "L", "Full"] as const;

function newQuestionId(existing: Set<string>): string {
  let id = "";
  do {
    id = `field_${Math.random().toString(36).slice(2, 8)}`;
  } while (existing.has(id));
  return id;
}

// ── Section rail ───────────────────────────────────────────────────────────────

function SectionRail({
  value,
  onChange,
}: {
  value: SectionId;
  onChange: (value: SectionId) => void;
}) {
  return (
    <nav
      aria-label="Editor sections"
      className={cn(
        "flex shrink-0 gap-1 border-border bg-background",
        // mobile: horizontal scroller; lg: a slim vertical rail
        "overflow-x-auto border-b p-1.5",
        "lg:w-[76px] lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:p-2",
      )}
    >
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              "lg:flex-col lg:gap-1 lg:px-1 lg:py-2.5 lg:text-[10.5px]",
              active
                ? "bg-brand/10 text-brand"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-[18px]" />
            {label}
          </button>
        );
      })}
    </nav>
  );
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
  const [section, setSection] = React.useState<SectionId>("compose");

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
  const setQuestions = (questions: FormQuestion[]) =>
    onChange({ ...doc, structure: { ...doc.structure, questions } });

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <SectionRail value={section} onChange={setSection} />
      <div className="min-h-0 flex-1 px-4 py-5 lg:overflow-y-auto lg:px-5">
        {section === "compose" ? (
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
        {section === "questions" ? (
          <QuestionsPanel
            questions={doc.structure.questions}
            setQuestions={setQuestions}
          />
        ) : null}
        {section === "layout" ? (
          <LayoutPanel doc={doc} onChange={onChange} />
        ) : null}
        {section === "style" ? (
          <StylePanel doc={doc} onChange={onChange} />
        ) : null}
      </div>
    </div>
  );
}

// ── Compose panel ──────────────────────────────────────────────────────────────

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
    <div className="flex max-w-xl flex-col gap-7">
      <BrandingSection
        doc={doc}
        onChange={onChange}
        project={project}
        slug={slug}
        formId={formId}
      />

      <Section
        title="Header"
        description="The brand, headline and prompt people see first."
        className="border-t border-border pt-6"
      >
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
      </Section>

      <Section
        title="After submit"
        description="What people see once they've sent their feedback."
        className="border-t border-border pt-6"
      >
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
        <Field label="On completion">
          <Segmented
            ariaLabel="On completion"
            value={content.success.action}
            onChange={(action) => setSuccess({ action })}
            options={[
              { value: "message", label: "Message" },
              { value: "redirect", label: "Redirect" },
              { value: "cta", label: "Button" },
            ]}
          />
        </Field>
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
          <div className="grid gap-4 sm:grid-cols-2">
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
      </Section>
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
    <Section
      title="Branding"
      description="Logo and brand color for this form."
      action={
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <Switch
            checked={synced}
            onCheckedChange={(on) =>
              on ? applyProjectBranding() : customize()
            }
          />
          Use project
        </label>
      }
    >
      {synced ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
          {project.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.logoUrl}
              alt=""
              className="size-10 rounded-md bg-background object-contain p-1"
            />
          ) : (
            <span
              className="flex size-10 items-center justify-center rounded-md text-sm font-semibold text-white"
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
    </Section>
  );
}

// ── Questions panel ─────────────────────────────────────────────────────────────

function QuestionsPanel({
  questions,
  setQuestions,
}: {
  questions: FormQuestion[];
  setQuestions: (questions: FormQuestion[]) => void;
}) {
  const ids = new Set(questions.map((q) => q.id));
  const atMax = questions.length >= 30;

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
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  }
  function addOfType(type: QuestionType) {
    if (atMax) return;
    const needsOptions = OPTION_KINDS.has(type);
    setQuestions([
      ...questions,
      {
        id: newQuestionId(ids),
        type,
        label: QUESTION_TYPE_META[type].label,
        placeholder: "",
        description: "",
        required: false,
        options: needsOptions ? ["Option 1", "Option 2"] : [],
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
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] text-muted-foreground">
          {questions.length} {questions.length === 1 ? "question" : "questions"}
          {atMax ? " · max reached" : ""}
        </p>
        <TypePicker
          disabled={atMax}
          onPick={addOfType}
          trigger={
            <Button type="button" variant="outline" size="sm" disabled={atMax}>
              <PlusIcon className="size-4" aria-hidden /> Add question
            </Button>
          }
        />
      </div>

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

      <TypePicker
        disabled={atMax}
        onPick={addOfType}
        trigger={
          <button
            type="button"
            disabled={atMax}
            className={cn(
              "mt-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs font-medium text-muted-foreground transition-colors",
              "hover:border-foreground/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <PlusIcon className="size-4" aria-hidden /> Add a question
          </button>
        }
      />
    </div>
  );
}

function TypePicker({
  onPick,
  trigger,
  disabled,
}: {
  onPick: (type: QuestionType) => void;
  trigger: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-3">
        {TYPE_GROUPS.map((group) => {
          const types = (
            Object.keys(QUESTION_TYPE_META) as QuestionType[]
          ).filter((t) => QUESTION_TYPE_META[t].group === group.id);
          return (
            <div key={group.id}>
              <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {types.map((t) => {
                  const Icon = QUESTION_TYPE_META[t].icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        onPick(t);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="truncate">
                        {QUESTION_TYPE_META[t].label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
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
  const meta = QUESTION_TYPE_META[question.type];
  const TypeIcon = meta.icon;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 p-2.5">
        <div className="flex flex-col text-muted-foreground">
          <button
            type="button"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="transition-colors hover:text-foreground disabled:opacity-25"
          >
            <ArrowUpIcon className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="transition-colors hover:text-foreground disabled:opacity-25"
          >
            <ArrowDownIcon className="size-3.5" aria-hidden />
          </button>
        </div>
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
          title={meta.label}
          aria-hidden
        >
          <TypeIcon className="size-4" />
        </span>
        <Input
          value={question.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Question label"
          className="h-8 flex-1 border-transparent bg-transparent px-1.5 shadow-none focus-visible:border-input focus-visible:bg-background"
          aria-label={`Question ${index + 1} label`}
        />
        {question.required ? (
          <span
            className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-brand"
            title="Required"
          >
            Req
          </span>
        ) : null}
        <button
          type="button"
          aria-label="Edit question details"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <CaretDownIcon
            className={cn("size-4 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-4 border-t border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <TypePicker
                onPick={onChangeType}
                trigger={
                  <button
                    type="button"
                    className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm text-foreground transition-colors hover:bg-muted/50"
                  >
                    <TypeIcon className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-left">
                      {meta.label}
                    </span>
                    <CaretDownIcon
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                  </button>
                }
              />
            </Field>
            <div className="flex items-end">
              <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-foreground">
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

          <button
            type="button"
            onClick={onRemove}
            disabled={total <= 1}
            className="flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
          >
            <TrashIcon className="size-3.5" aria-hidden /> Remove question
          </button>
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

function controllerChoices(q: FormQuestion): string[] | null {
  if (OPTION_KINDS.has(q.type)) return q.options;
  if (q.type === "stars") return ["1", "2", "3", "4", "5"];
  if (q.type === "nps") return Array.from({ length: 11 }, (_, i) => String(i));
  return null;
}

function controllerOps(q: FormQuestion): ShowIfOp[] {
  if (q.type === "checkbox") return ["includes", "eq", "neq"];
  if (OPTION_KINDS.has(q.type)) return ["eq", "neq"];
  if (q.type === "stars" || q.type === "nps")
    return ["eq", "neq", "gte", "lte", "gt", "lt"];
  return ["includes", "eq", "neq"];
}

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

/** A native-styled small select used only inside the condition editor. */
function MiniSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 w-full appearance-none rounded-md border border-input bg-background px-2.5 pr-7 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <CaretDownIcon
        className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
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

  if (others.length === 0) return null;

  function enable(on: boolean) {
    onChange(on ? defaultRuleFor(others[0]!) : null);
  }

  const controller =
    (rule && others.find((o) => o.id === rule.questionId)) || others[0]!;
  const choices = controllerChoices(controller);
  const ops = controllerOps(controller);

  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
        <Switch checked={enabled} onCheckedChange={enable} />
        Only show this question conditionally
      </label>
      {enabled && rule ? (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          <MiniSelect
            ariaLabel="When question"
            value={rule.questionId}
            onChange={(questionId) => {
              const next = others.find((o) => o.id === questionId);
              onChange(next ? defaultRuleFor(next) : { ...rule, questionId });
            }}
            options={others.map((o) => ({ value: o.id, label: o.label }))}
          />
          <MiniSelect
            ariaLabel="Condition"
            value={rule.op}
            onChange={(op) => onChange({ ...rule, op })}
            options={ops.map((op) => ({ value: op, label: OP_LABELS[op] }))}
          />
          {choices ? (
            <MiniSelect
              ariaLabel="Value"
              value={String(rule.value)}
              onChange={(value) => onChange({ ...rule, value })}
              options={choices.map((c) => ({ value: c, label: c }))}
            />
          ) : (
            <Input
              aria-label="Value"
              value={String(rule.value)}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              placeholder="Answer contains…"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Layout panel ─────────────────────────────────────────────────────────────

type LayoutOptions = FormDefinitionDoc["layout"]["options"];

function LayoutPanel({
  doc,
  onChange,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const { layout } = doc;
  const brandColor = doc.theme.inputs.brandColor;
  const appearance = doc.theme.inputs.appearance === "dark" ? "dark" : "light";

  const setPreset = (preset: LayoutPresetId) =>
    onChange({ ...doc, layout: { ...layout, preset } });
  const setOptions = (patch: Partial<LayoutOptions>) =>
    onChange({
      ...doc,
      layout: { ...layout, options: { ...layout.options, ...patch } },
    });

  const layoutCards: OptionCard<LayoutPresetId>[] = LAYOUT_PRESETS.map((p) => ({
    value: p,
    label: LAYOUT_META[p].name,
    hint: LAYOUT_META[p].desc,
    preview: (
      <FormCardPreview
        preset={p as FormLayoutPreset}
        brandColor={brandColor}
        appearance={appearance}
        brandName={doc.content.brandName || project_safe_name(doc)}
      />
    ),
  }));

  return (
    <div className="flex max-w-xl flex-col gap-7">
      <Section
        title="Layout"
        description="A hand-designed arrangement — pick the shape, then tune it."
      >
        <OptionCardGroup
          ariaLabel="Layout preset"
          value={layout.preset}
          onChange={setPreset}
          options={layoutCards}
          columns={2}
        />
      </Section>

      <Section
        title={`${LAYOUT_META[layout.preset].name} options`}
        className="border-t border-border pt-6"
      >
        <LayoutKnobs
          preset={layout.preset}
          options={layout.options}
          setOptions={setOptions}
        />
      </Section>
    </div>
  );
}

function project_safe_name(doc: FormDefinitionDoc): string {
  return doc.content.brandName?.trim() || "Your brand";
}

const ALIGN_OPTS = [
  { value: "left" as const, label: "Left", icon: TextAlignLeftIcon },
  { value: "center" as const, label: "Center", icon: TextAlignCenterIcon },
];
const WIDTH_OPTS = [
  { value: "cozy" as const, label: "Cozy" },
  { value: "regular" as const, label: "Regular" },
  { value: "wide" as const, label: "Wide" },
];
const SIDE_OPTS = [
  { value: "left" as const, label: "Left" },
  { value: "right" as const, label: "Right" },
];
const PANEL_FILL_OPTS = [
  { value: "soft" as const, label: "Brand soft" },
  { value: "solid" as const, label: "Solid" },
  { value: "neutral" as const, label: "Neutral" },
];
const PANEL_CONTENT_OPTS = [
  { value: "header" as const, label: "Header" },
  { value: "quote" as const, label: "Quote" },
  { value: "blurb" as const, label: "Blurb" },
];
const PANEL_RATIO_OPTS = [
  { value: "balanced" as const, label: "Balanced" },
  { value: "narrow" as const, label: "Narrow" },
];
const PROGRESS_OPTS = [
  { value: "both" as const, label: "Bar + count" },
  { value: "bar" as const, label: "Bar" },
  { value: "count" as const, label: "Count" },
  { value: "none" as const, label: "None" },
];

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
        <Field label="Alignment">
          <Segmented
            ariaLabel="Alignment"
            value={options.align}
            onChange={(align) => setOptions({ align })}
            options={ALIGN_OPTS}
          />
        </Field>
        <Field label="Width">
          <Segmented
            ariaLabel="Width"
            value={options.width}
            onChange={(width) => setOptions({ width })}
            options={WIDTH_OPTS}
          />
        </Field>
      </div>
    );
  }

  if (preset === "inline") {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Alignment">
            <Segmented
              ariaLabel="Alignment"
              value={options.align}
              onChange={(align) => setOptions({ align })}
              options={ALIGN_OPTS}
            />
          </Field>
          <Field label="Width">
            <Segmented
              ariaLabel="Width"
              value={options.width}
              onChange={(width) => setOptions({ width })}
              options={WIDTH_OPTS}
            />
          </Field>
        </div>
        <SwitchRow
          label="Show header"
          description="Display the logo and headline above the fields."
          checked={options.showHeader}
          onCheckedChange={(showHeader) => setOptions({ showHeader })}
        />
      </div>
    );
  }

  if (preset === "split") {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Panel side">
            <Segmented
              ariaLabel="Panel side"
              value={options.side}
              onChange={(side) => setOptions({ side })}
              options={SIDE_OPTS}
            />
          </Field>
          <Field label="Proportions">
            <Segmented
              ariaLabel="Proportions"
              value={options.panelRatio}
              onChange={(panelRatio) => setOptions({ panelRatio })}
              options={PANEL_RATIO_OPTS}
            />
          </Field>
        </div>
        <Field label="Panel fill">
          <Segmented
            ariaLabel="Panel fill"
            value={options.panelFill}
            onChange={(panelFill) => setOptions({ panelFill })}
            options={PANEL_FILL_OPTS}
          />
        </Field>
        <Field label="Panel shows">
          <Segmented
            ariaLabel="Panel shows"
            value={options.panelContent}
            onChange={(panelContent) => setOptions({ panelContent })}
            options={PANEL_CONTENT_OPTS}
          />
        </Field>
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
    <Field label="Progress indicator">
      <Segmented
        ariaLabel="Progress indicator"
        value={options.progress}
        onChange={(progress) => setOptions({ progress })}
        options={PROGRESS_OPTS}
      />
    </Field>
  );
}

// ── Style panel ──────────────────────────────────────────────────────────────

const APPEARANCE_OPTS = [
  { value: "light" as const, label: "Light", icon: SunIcon },
  { value: "dark" as const, label: "Dark", icon: MoonIcon },
  { value: "system" as const, label: "Auto", icon: CircleHalfIcon },
];
const DENSITY_OPTS = [
  { value: "compact" as const, label: "Compact" },
  { value: "cozy" as const, label: "Cozy" },
  { value: "spacious" as const, label: "Spacious" },
];
const NEUTRAL_OPTS = [
  { value: "auto" as const, label: "Auto" },
  { value: "pure" as const, label: "Pure" },
  { value: "warm" as const, label: "Warm" },
  { value: "cool" as const, label: "Cool" },
];

function StylePanel({
  doc,
  onChange,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const { inputs } = doc.theme;

  const setInputs = (patch: Partial<FormThemeInputs>) =>
    onChange({
      ...doc,
      theme: { ...doc.theme, inputs: { ...inputs, ...patch } },
    });

  function applyPreset(id: PresetId) {
    onChange({
      ...doc,
      theme: {
        preset: id,
        inputs: resolvePreset(id, inputs.brandColor),
        colorOverrides: EMPTY_OVERRIDES,
      },
    });
  }

  const presetIds = Object.keys(PRESETS) as PresetId[];
  const presetCards: OptionCard<PresetId>[] = presetIds.map((id) => ({
    value: id,
    label: PRESETS[id]?.name ?? id,
    badge: id === DEFAULT_PRESET_ID ? "Default" : undefined,
    preview: (
      <ThemeSwatch inputs={resolvePreset(id, inputs.brandColor)} scale={11} />
    ),
  }));

  const surfaceCards: OptionCard<FormThemeInputs["surfaceStyle"]>[] = (
    ["flat", "bordered", "elevated"] as const
  ).map((v) => ({
    value: v,
    label: v[0]!.toUpperCase() + v.slice(1),
    preview: <ThemeSwatch inputs={{ ...inputs, surfaceStyle: v }} scale={8} />,
  }));

  const accentCards: OptionCard<FormThemeInputs["accentIntensity"]>[] = (
    ["subtle", "balanced", "bold"] as const
  ).map((v) => ({
    value: v,
    label: v[0]!.toUpperCase() + v.slice(1),
    preview: (
      <ThemeSwatch inputs={{ ...inputs, accentIntensity: v }} scale={8} />
    ),
  }));

  const buttonCards: OptionCard<FormThemeInputs["buttonStyle"]>[] = (
    ["solid", "soft", "outline"] as const
  ).map((v) => ({
    value: v,
    label: v[0]!.toUpperCase() + v.slice(1),
    preview: <ThemeSwatch inputs={{ ...inputs, buttonStyle: v }} scale={8} />,
  }));

  const typeOrder: TypePairingId[] = [
    "geist",
    "inter",
    "serif-editorial",
    "system",
    "inherit",
  ];
  const typeCards: OptionCard<TypePairingId>[] = typeOrder.map((v) => ({
    value: v,
    label: TYPE_SPECIMEN[v].label,
    hint: TYPE_SPECIMEN[v].note,
    preview: (
      <div className="flex size-full items-center justify-center bg-muted/40">
        <span
          className="text-3xl leading-none text-foreground"
          style={{ fontFamily: TYPE_SPECIMEN[v].family }}
        >
          Ag
        </span>
      </div>
    ),
  }));

  return (
    <div className="flex max-w-xl flex-col gap-7">
      <Section
        title="Theme"
        description="A starting point. Every control below stays editable and the result is always AA-contrast safe."
      >
        <OptionCardGroup
          ariaLabel="Theme preset"
          value={(doc.theme.preset as PresetId) ?? DEFAULT_PRESET_ID}
          onChange={applyPreset}
          options={presetCards}
          columns={2}
        />
        <Field label="Appearance">
          <Segmented
            ariaLabel="Appearance"
            value={inputs.appearance}
            onChange={(appearance) => setInputs({ appearance })}
            options={APPEARANCE_OPTS}
          />
        </Field>
      </Section>

      <Section title="Surface & shape" className="border-t border-border pt-6">
        <Field label="Surface style">
          <OptionCardGroup
            ariaLabel="Surface style"
            value={inputs.surfaceStyle}
            onChange={(surfaceStyle) => setInputs({ surfaceStyle })}
            options={surfaceCards}
            columns={3}
            previewClassName="aspect-[4/3]"
          />
        </Field>
        <Field label="Corner radius">
          <RadiusPicker
            value={inputs.radius}
            onChange={(radius) => setInputs({ radius })}
          />
        </Field>
        <Field label="Density">
          <Segmented
            ariaLabel="Density"
            value={inputs.density}
            onChange={(density) => setInputs({ density })}
            options={DENSITY_OPTS}
          />
        </Field>
      </Section>

      <Section title="Buttons" className="border-t border-border pt-6">
        <OptionCardGroup
          ariaLabel="Button style"
          value={inputs.buttonStyle}
          onChange={(buttonStyle) => setInputs({ buttonStyle })}
          options={buttonCards}
          columns={3}
          previewClassName="aspect-[4/3]"
        />
      </Section>

      <Section title="Typeface" className="border-t border-border pt-6">
        <OptionCardGroup
          ariaLabel="Typeface"
          value={inputs.typePairing}
          onChange={(typePairing) => setInputs({ typePairing })}
          options={typeCards}
          columns={2}
          previewClassName="aspect-[16/9]"
        />
      </Section>

      <Section title="Color" className="border-t border-border pt-6">
        <Field label="Accent intensity">
          <OptionCardGroup
            ariaLabel="Accent intensity"
            value={inputs.accentIntensity}
            onChange={(accentIntensity) => setInputs({ accentIntensity })}
            options={accentCards}
            columns={3}
            previewClassName="aspect-[4/3]"
          />
        </Field>
        <Field
          label="Neutral tone"
          hint="The temperature of greys, backgrounds and borders."
        >
          <Segmented
            ariaLabel="Neutral tone"
            value={inputs.neutralTone}
            onChange={(neutralTone) => setInputs({ neutralTone })}
            options={NEUTRAL_OPTS}
          />
        </Field>
        <ColorOverridesField doc={doc} onChange={onChange} />
      </Section>
    </div>
  );
}

function RadiusPicker({
  value,
  onChange,
}: {
  value: FormThemeInputs["radius"];
  onChange: (value: FormThemeInputs["radius"]) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Corner radius"
      className="grid grid-cols-5 gap-2"
    >
      {RADIUS_DISPLAY.map((display, i) => {
        const v = i as FormThemeInputs["radius"];
        const active = value === v;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={RADIUS_LABELS[i]}
            onClick={() => onChange(v)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border py-2.5 transition-[border-color,box-shadow]",
              active
                ? "border-brand ring-2 ring-brand/60"
                : "border-border hover:border-foreground/25",
            )}
          >
            <span
              className="size-6 border-2 border-foreground/55"
              style={{
                borderRadius: display,
                borderBottomColor: "transparent",
                borderRightColor: "transparent",
              }}
              aria-hidden
            />
            <span className="text-[10px] font-medium text-muted-foreground">
              {RADIUS_LABELS[i]}
            </span>
          </button>
        );
      })}
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
  const [open, setOpen] = React.useState(
    () =>
      colorOverrides.accent !== null ||
      colorOverrides.background !== null ||
      colorOverrides.surface !== null ||
      colorOverrides.text !== null,
  );

  const base = React.useMemo(() => {
    try {
      const snap = resolveThemeSnapshot(inputs);
      return inputs.appearance === "dark"
        ? snap.schemes.dark
        : (snap.schemes.light ?? snap.schemes.dark);
    } catch {
      return undefined;
    }
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
  const scorable =
    isValidHexColor(effective.text) &&
    effective.text !== "" &&
    isValidHexColor(effective.surface) &&
    effective.surface !== "";
  const ratio = scorable
    ? contrastRatio(effective.text, effective.surface)
    : null;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-foreground">
          <SlidersIcon className="size-4 text-muted-foreground" aria-hidden />
          Fine-tune colors
        </span>
        <CaretDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="flex flex-col gap-3 border-t border-border p-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Override any base color — everything else re-derives and stays
            AA-contrast safe.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {OVERRIDE_TOKENS.map(({ key, label }) => {
              const overridden = colorOverrides[key] !== null;
              return (
                <Field
                  key={key}
                  label={label}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setOverride(key, null)}
                      disabled={!overridden}
                      className={cn(
                        "text-[11px] font-medium underline-offset-2 transition-colors",
                        overridden
                          ? "text-muted-foreground hover:text-foreground hover:underline"
                          : "text-muted-foreground/50",
                      )}
                    >
                      Auto
                    </button>
                  }
                >
                  <ColorPicker
                    id={`sf-color-${key}`}
                    label={label}
                    clearable={false}
                    value={effective[key]}
                    onChange={(v) =>
                      setOverride(key, v.trim() === "" ? null : v)
                    }
                  />
                </Field>
              );
            })}
          </div>
          {ratio !== null ? (
            <div className="flex items-center gap-2 text-[11px]">
              <AaBadge ratio={ratio} />
              <span className="text-muted-foreground">text on surface</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
