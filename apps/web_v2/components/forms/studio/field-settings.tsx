"use client";

/**
 * FieldTypeSettings — the per-type half of a question editor, guided edition.
 *
 * Only visible product choices surface here: rating style/scale and the
 * options list for choice questions. Upload constraints, text length bounds,
 * hidden-field capture, and the privacy/publish-eligibility plumbing are
 * Semblia-owned defaults now — the palette seeds them correctly and the
 * runtime keeps honoring whatever a doc already stores.
 */

import * as React from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import type {
  FormField,
  RatingStyle,
  SelectOption,
} from "@workspace/forms-core";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Field, Segmented, SelectField } from "@/components/studio/controls";

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

// ── Choices ──────────────────────────────────────────────────────────────────

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
