"use client";

/**
 * FieldTypeSettings — the per-type half of a field editor. forms-core defines
 * a fixed settings surface per field type (spec §7); this renders exactly that
 * surface and nothing else: rating scale/style, select options, text length
 * bounds, upload constraints, hidden-field capture — plus the privacy/publish
 * eligibility block that feeds the consent + widget pipeline.
 */

import * as React from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  ALWAYS_PRIVATE_TYPES,
  type FormField,
  type RatingStyle,
  type SelectOption,
  type HiddenFieldSource,
} from "@workspace/forms-core";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Field,
  Segmented,
  SelectField,
  SwitchRow,
} from "@/components/studio/controls";

const TEXT_LENGTH_TYPES: ReadonlySet<FormField["type"]> = new Set([
  "shortText",
  "longText",
]);

const UPLOAD_TYPE_CHOICES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "image/png", label: "PNG" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/webp", label: "WebP" },
  { value: "application/pdf", label: "PDF" },
];

const FILE_SIZE_CHOICES = [
  { value: "2000000", label: "2 MB" },
  { value: "5000000", label: "5 MB" },
  { value: "10000000", label: "10 MB" },
  { value: "25000000", label: "25 MB" },
] as const;

export function FieldTypeSettings({
  field,
  onUpdate,
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
}) {
  return (
    <>
      {field.type === "rating" && (
        <RatingSettings field={field} onUpdate={onUpdate} />
      )}
      {(field.type === "singleSelect" || field.type === "multiSelect") && (
        <SelectSettings field={field} onUpdate={onUpdate} />
      )}
      {TEXT_LENGTH_TYPES.has(field.type) && (
        <LengthSettings field={field} onUpdate={onUpdate} />
      )}
      {(field.type === "imageUpload" || field.type === "fileUpload") && (
        <UploadSettings field={field} onUpdate={onUpdate} />
      )}
      {field.type === "hidden" && (
        <HiddenSettings field={field} onUpdate={onUpdate} />
      )}
    </>
  );
}

// ── Rating ───────────────────────────────────────────────────────────────────

const RATING_STYLES: ReadonlyArray<{ value: RatingStyle; label: string }> = [
  { value: "stars", label: "Stars" },
  { value: "numbers", label: "Numbers" },
  { value: "hearts", label: "Hearts" },
  { value: "emoji", label: "Emoji" },
];

function RatingSettings({
  field,
  onUpdate,
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
}) {
  return (
    <>
      <Field label="Style">
        <Segmented<RatingStyle>
          ariaLabel="Rating style"
          value={field.ratingStyle ?? "stars"}
          onChange={(ratingStyle) => onUpdate({ ratingStyle })}
          options={RATING_STYLES}
        />
      </Field>
      <Field label="Scale" hint="How many steps the rating has.">
        <SelectField
          ariaLabel="Rating scale"
          value={String(field.ratingScale ?? 5)}
          onChange={(v) => onUpdate({ ratingScale: Number(v) })}
          options={["3", "5", "7", "10"].map((v) => ({
            value: v,
            label: `1–${v}`,
          }))}
        />
      </Field>
    </>
  );
}

// ── Selects ──────────────────────────────────────────────────────────────────

function slugifyOption(label: string, taken: ReadonlySet<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "option";
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  }
}

function SelectSettings({
  field,
  onUpdate,
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
}) {
  const options = field.options ?? [];

  const setOptions = (next: SelectOption[]) => onUpdate({ options: next });

  // Only the label changes on rename — `value` is a stable identifier that
  // conditional rules and submitted answers reference.
  const updateLabel = (index: number, label: string) =>
    setOptions(options.map((o, i) => (i === index ? { ...o, label } : o)));

  const addOption = () => {
    const taken = new Set(options.map((o) => o.value));
    const label = `Option ${options.length + 1}`;
    setOptions([...options, { label, value: slugifyOption(label, taken) }]);
  };

  const removeOption = (index: number) =>
    setOptions(options.filter((_, i) => i !== index));

  const moveOption = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= options.length) return;
    const reordered = [...options];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(next, 0, moved);
    setOptions(reordered);
  };

  return (
    <>
      <Field label="Options">
        <div className="flex flex-col gap-1.5">
          {options.map((option, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                aria-label={`Option ${i + 1}`}
                value={option.label}
                onChange={(e) => updateLabel(i, e.target.value)}
                className="h-8 flex-1 text-xs"
              />
              <OptionBtn
                label="Move option up"
                disabled={i === 0}
                onClick={() => moveOption(i, -1)}
              >
                <ArrowUpIcon className="size-3" />
              </OptionBtn>
              <OptionBtn
                label="Move option down"
                disabled={i === options.length - 1}
                onClick={() => moveOption(i, 1)}
              >
                <ArrowDownIcon className="size-3" />
              </OptionBtn>
              <OptionBtn
                label="Remove option"
                disabled={options.length <= 2}
                onClick={() => removeOption(i)}
              >
                <XIcon className="size-3" />
              </OptionBtn>
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className={cn(
              "mt-0.5 inline-flex items-center gap-1.5 self-start rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground",
              "transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <PlusIcon className="size-3" weight="bold" aria-hidden />
            Add option
          </button>
        </div>
      </Field>
      {field.type === "multiSelect" && (
        <Field
          label="Selection limit"
          hint="Cap how many options a respondent can pick."
        >
          <SelectField
            ariaLabel="Selection limit"
            value={field.maxSelections ? String(field.maxSelections) : "none"}
            onChange={(v) =>
              onUpdate({
                maxSelections: v === "none" ? undefined : Number(v),
              })
            }
            options={[
              { value: "none", label: "No limit" },
              ...[2, 3, 4, 5].map((n) => ({
                value: String(n),
                label: `Up to ${n}`,
              })),
            ]}
          />
        </Field>
      )}
    </>
  );
}

function OptionBtn({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      {children}
    </button>
  );
}

// ── Text length ──────────────────────────────────────────────────────────────

function LengthSettings({
  field,
  onUpdate,
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
}) {
  const parse = (raw: string): number | undefined => {
    const n = Number(raw);
    return raw === "" || !Number.isFinite(n) || n <= 0
      ? undefined
      : Math.floor(n);
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Min length" htmlFor={`fmin-${field.id}`}>
        <Input
          id={`fmin-${field.id}`}
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="None"
          value={field.minLength ?? ""}
          onChange={(e) => {
            const minLength = parse(e.target.value);
            // Drag the paired bound along so min ≤ max always holds — a
            // crossed range would make the field impossible to answer.
            onUpdate(
              minLength != null &&
                field.maxLength != null &&
                minLength > field.maxLength
                ? { minLength, maxLength: minLength }
                : { minLength },
            );
          }}
          className="h-8 text-xs"
        />
      </Field>
      <Field label="Max length" htmlFor={`fmax-${field.id}`}>
        <Input
          id={`fmax-${field.id}`}
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="None"
          value={field.maxLength ?? ""}
          onChange={(e) => {
            const maxLength = parse(e.target.value);
            onUpdate(
              maxLength != null &&
                field.minLength != null &&
                maxLength < field.minLength
                ? { maxLength, minLength: maxLength }
                : { maxLength },
            );
          }}
          className="h-8 text-xs"
        />
      </Field>
    </div>
  );
}

// ── Uploads ──────────────────────────────────────────────────────────────────

function UploadSettings({
  field,
  onUpdate,
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
}) {
  const selected = new Set(field.fileTypes ?? []);
  const choices =
    field.type === "imageUpload"
      ? UPLOAD_TYPE_CHOICES.filter((c) => c.value.startsWith("image/"))
      : UPLOAD_TYPE_CHOICES;

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) {
      if (next.size === 1) return; // at least one type stays allowed
      next.delete(value);
    } else {
      next.add(value);
    }
    onUpdate({
      fileTypes: choices.map((c) => c.value).filter((v) => next.has(v)),
    });
  };

  return (
    <>
      <Field label="Allowed types">
        <div className="flex flex-wrap gap-1.5">
          {choices.map((choice) => {
            const on = selected.has(choice.value);
            return (
              <button
                key={choice.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(choice.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  on
                    ? "border-brand/40 bg-brand/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                )}
              >
                {choice.label}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Max size">
          <SelectField
            ariaLabel="Maximum file size"
            value={String(field.maxFileSize ?? 5_000_000)}
            onChange={(v) => onUpdate({ maxFileSize: Number(v) })}
            options={[...FILE_SIZE_CHOICES]}
          />
        </Field>
        <Field label="Max files">
          <SelectField
            ariaLabel="Maximum file count"
            value={String(field.maxFileCount ?? 1)}
            onChange={(v) => onUpdate({ maxFileCount: Number(v) })}
            options={[1, 2, 3, 5].map((n) => ({
              value: String(n),
              label: String(n),
            }))}
          />
        </Field>
      </div>
    </>
  );
}

// ── Hidden ───────────────────────────────────────────────────────────────────

function HiddenSettings({
  field,
  onUpdate,
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
}) {
  const source = field.hiddenSource ?? "query";
  return (
    <>
      <Field
        label="Source"
        hint={
          source === "utm"
            ? "Captures utm_source, utm_medium, and utm_campaign automatically."
            : source === "static"
              ? "Stores a fixed value with every response."
              : "Reads a parameter from the form URL."
        }
      >
        <Segmented<HiddenFieldSource>
          ariaLabel="Hidden field source"
          value={source}
          onChange={(hiddenSource) => onUpdate({ hiddenSource })}
          options={[
            { value: "query", label: "URL param" },
            { value: "static", label: "Static" },
            { value: "utm", label: "UTM" },
          ]}
        />
      </Field>
      {source !== "utm" && (
        <Field
          label={source === "static" ? "Value key" : "Parameter name"}
          htmlFor={`fhk-${field.id}`}
        >
          <Input
            id={`fhk-${field.id}`}
            value={field.hiddenKey ?? ""}
            placeholder={source === "static" ? "campaign" : "ref"}
            onChange={(e) => onUpdate({ hiddenKey: e.target.value })}
            className="h-8 text-xs"
          />
        </Field>
      )}
      {source === "static" && (
        <Field label="Value" htmlFor={`fhv-${field.id}`}>
          <Input
            id={`fhv-${field.id}`}
            value={field.hiddenValue ?? ""}
            onChange={(e) => onUpdate({ hiddenValue: e.target.value })}
            className="h-8 text-xs"
          />
        </Field>
      )}
    </>
  );
}

// ── Privacy / publish eligibility ────────────────────────────────────────────

export function FieldPrivacySettings({
  field,
  onUpdate,
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
}) {
  if (field.type === "consent" || field.type === "hidden") return null;
  const lockedPrivate = ALWAYS_PRIVATE_TYPES.has(field.type);
  const isPrivate = lockedPrivate || field.private;

  return (
    <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        Publishing
      </p>
      <SwitchRow
        label="Keep private"
        description={
          lockedPrivate
            ? "This field type is always private."
            : "Collected, but never shown publicly."
        }
        checked={isPrivate}
        disabled={lockedPrivate}
        onCheckedChange={(next) =>
          onUpdate(
            next
              ? { private: true, publishable: false, widgetEligible: false }
              : { private: false },
          )
        }
      />
      {!isPrivate && (
        <>
          <SwitchRow
            label="Publishable"
            description="May appear on public pages once the respondent consents."
            checked={field.publishable}
            onCheckedChange={(publishable) =>
              onUpdate(
                publishable
                  ? { publishable: true }
                  : { publishable: false, widgetEligible: false },
              )
            }
          />
          <SwitchRow
            label="Widget eligible"
            description="May be quoted in widgets and walls."
            checked={field.widgetEligible}
            onCheckedChange={(widgetEligible) =>
              onUpdate(
                widgetEligible
                  ? { widgetEligible: true, publishable: true }
                  : { widgetEligible: false },
              )
            }
          />
        </>
      )}
    </div>
  );
}
