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
  resolvePreset,
  type FormDefinitionDoc,
  type FormQuestion,
  type LayoutPresetId,
  type PresetId,
  type QuestionType,
} from "@workspace/forms-core";
import { PageTabs, type PageTabOption } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
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
            setContent={setContent}
            setSuccess={setSuccess}
          />
        ) : null}
        {tab === "questions" ? (
          <QuestionsPanel
            questions={doc.structure.questions}
            setQuestions={setQuestions}
          />
        ) : null}
        {tab === "layout" ? (
          <LayoutPanel
            value={doc.layout.preset}
            onChange={(preset) => onChange({ ...doc, layout: { preset } })}
          />
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
  setContent,
  setSuccess,
}: {
  doc: FormDefinitionDoc;
  setContent: (patch: Partial<FormDefinitionDoc["content"]>) => void;
  setSuccess: (patch: Partial<FormDefinitionDoc["content"]["success"]>) => void;
}) {
  const { content } = doc;
  return (
    <div className="flex max-w-xl flex-col gap-5">
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
      <Field
        label="Logo URL"
        htmlFor="sf-logo"
        hint="A hosted image URL. Shown contained, never cropped."
      >
        <Input
          id="sf-logo"
          value={content.logoUrl ?? ""}
          onChange={(e) =>
            setContent({ logoUrl: e.target.value.trim() || null })
          }
          placeholder="https://…/logo.svg"
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

function LayoutPanel({
  value,
  onChange,
}: {
  value: LayoutPresetId;
  onChange: (preset: LayoutPresetId) => void;
}) {
  return (
    <div className="grid max-w-xl gap-3 sm:grid-cols-2">
      {LAYOUT_PRESETS.map((preset) => {
        const meta = LAYOUT_META[preset];
        const active = value === preset;
        return (
          <button
            key={preset}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(preset)}
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

      <Field label="Brand color" htmlFor="sf-brand-color">
        <ColorPicker
          id="sf-brand-color"
          label="Brand"
          clearable={false}
          value={inputs.brandColor}
          onChange={(v) => setInputs({ brandColor: v || "#4f46e5" })}
        />
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
    </div>
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
    if (!on) return onChange(null);
    const first = others[0]!;
    onChange({ questionId: first.id, op: "eq", value: "" });
  }

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
            onChange={(questionId) => onChange({ ...rule, questionId })}
            options={others.map((o) => ({ value: o.id, label: o.label }))}
          />
          <SelectField
            label="Condition"
            value={rule.op}
            onChange={(op) => onChange({ ...rule, op })}
            options={[
              { value: "eq", label: "equals" },
              { value: "neq", label: "does not equal" },
              { value: "gt", label: "greater than" },
              { value: "lt", label: "less than" },
              { value: "gte", label: "at least" },
              { value: "lte", label: "at most" },
              { value: "includes", label: "includes" },
            ]}
          />
          <Field label="Value">
            <Input
              value={String(rule.value)}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              placeholder="e.g. 5"
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
