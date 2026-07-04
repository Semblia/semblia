import type { ChangeEvent, ReactNode } from "react";
import type { FormField, RatingStyle } from "@workspace/forms-core";

export interface FieldControlProps {
  field: FormField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  /** Called after a value is picked on a control that can trigger auto-advance. */
  onCommit?: () => void;
  autoFocus?: boolean;
}

const asText = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

function FieldShell({
  field,
  error,
  children,
  stepped,
}: {
  field: FormField;
  error?: string;
  children: ReactNode;
  stepped?: boolean;
}) {
  const helpId = field.description ? `${field.id}-help` : undefined;
  const errId = error ? `${field.id}-err` : undefined;
  return (
    <div
      className={`tf-field${stepped ? " tf-step-field" : ""}`}
      data-tf-field={field.id}
    >
      <label className="tf-label" htmlFor={field.id}>
        {field.label}
        {field.required ? <span className="tf-required" aria-hidden="true">*</span> : null}
      </label>
      {field.description ? (
        <p className="tf-help" id={helpId}>
          {field.description}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="tf-error" id={errId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(field: FormField, error?: string): string | undefined {
  const ids = [
    field.description ? `${field.id}-help` : null,
    error ? `${field.id}-err` : null,
  ].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

const RATING_GLYPH: Record<RatingStyle, (active: boolean) => string> = {
  stars: (a) => (a ? "★" : "☆"),
  hearts: (a) => (a ? "♥" : "♡"),
  emoji: () => "🙂",
  numbers: (_a) => "",
};

function RatingControl({ field, value, error, onChange, onCommit }: FieldControlProps) {
  const scale = field.ratingScale ?? 5;
  const style: RatingStyle = field.ratingStyle ?? "stars";
  const current = Number(value) || 0;
  return (
    <div
      className="tf-rating"
      data-style={style}
      role="radiogroup"
      aria-label={field.label}
      aria-describedby={describedBy(field, error)}
    >
      {Array.from({ length: scale }, (_, i) => i + 1).map((n) => {
        const active = n <= current;
        const label = style === "numbers" ? String(n) : RATING_GLYPH[style](active);
        return (
          <button
            key={n}
            type="button"
            className="tf-rating-btn"
            role="radio"
            aria-checked={current === n}
            aria-pressed={active}
            aria-label={`${n} of ${scale}`}
            onClick={() => {
              onChange(n);
              onCommit?.();
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function SingleSelectControl({ field, value, error, onChange }: FieldControlProps) {
  const options = field.options ?? [];
  return (
    <div className="tf-options" role="radiogroup" aria-label={field.label} aria-describedby={describedBy(field, error)}>
      {options.map((opt) => (
        <label key={opt.value} className="tf-option" data-selected={value === opt.value}>
          <input
            type="radio"
            name={field.id}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function MultiSelectControl({ field, value, error, onChange }: FieldControlProps) {
  const options = field.options ?? [];
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const atMax = field.maxSelections != null && selected.length >= field.maxSelections;
  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else if (!atMax) onChange([...selected, v]);
  };
  return (
    <div className="tf-options" role="group" aria-label={field.label} aria-describedby={describedBy(field, error)}>
      {options.map((opt) => {
        const isOn = selected.includes(opt.value);
        return (
          <label key={opt.value} className="tf-option" data-selected={isOn}>
            <input
              type="checkbox"
              value={opt.value}
              checked={isOn}
              disabled={!isOn && atMax}
              onChange={() => toggle(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function ConsentControl({ field, value, error, onChange }: FieldControlProps) {
  const errId = error ? `${field.id}-err` : undefined;
  return (
    <div className="tf-field" data-tf-field={field.id}>
      <label className="tf-consent" htmlFor={field.id}>
        <input
          id={field.id}
          type="checkbox"
          checked={value === true || value === "true"}
          aria-describedby={errId}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          {field.consentCopy || field.label}
          {field.required ? <span className="tf-required" aria-hidden="true">*</span> : null}
        </span>
      </label>
      {error ? (
        <p className="tf-error" id={errId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function UploadControl({ field, value, error, onChange }: FieldControlProps) {
  const multiple = (field.maxFileCount ?? 1) > 1;
  const accept = field.fileTypes?.join(",");
  const name = typeof value === "string" ? value : "";
  return (
    <label className="tf-upload" htmlFor={field.id}>
      <input
        id={field.id}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: "none" }}
        aria-describedby={describedBy(field, error)}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          onChange(multiple ? files.map((f) => f.name) : (files[0]?.name ?? ""));
        }}
      />
      <span>{name || (field.type === "imageUpload" ? "Upload an image" : "Upload a file")}</span>
    </label>
  );
}

function TextControl({ field, value, error, onChange }: FieldControlProps) {
  const common = {
    id: field.id,
    value: asText(value),
    placeholder: field.placeholder,
    required: field.required,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy(field, error),
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
  };
  if (field.type === "longText") {
    return <textarea className="tf-textarea" maxLength={field.maxLength} {...common} />;
  }
  const inputType =
    field.type === "email" ? "email" : field.type === "website" ? "url" : "text";
  return (
    <input
      className="tf-input"
      type={inputType}
      inputMode={field.type === "email" ? "email" : undefined}
      maxLength={field.maxLength}
      {...common}
    />
  );
}

/** Render one field's control, dispatching on type. Hidden fields render nothing. */
export function FieldControl(props: FieldControlProps) {
  const { field } = props;
  switch (field.type) {
    case "hidden":
      return null;
    case "consent":
      return <ConsentControl {...props} />;
    case "rating":
      return (
        <FieldShell field={field} error={props.error} stepped>
          <RatingControl {...props} />
        </FieldShell>
      );
    case "singleSelect":
      return (
        <FieldShell field={field} error={props.error} stepped>
          <SingleSelectControl {...props} />
        </FieldShell>
      );
    case "multiSelect":
      return (
        <FieldShell field={field} error={props.error} stepped>
          <MultiSelectControl {...props} />
        </FieldShell>
      );
    case "imageUpload":
    case "fileUpload":
      return (
        <FieldShell field={field} error={props.error} stepped>
          <UploadControl {...props} />
        </FieldShell>
      );
    default:
      return (
        <FieldShell field={field} error={props.error} stepped>
          <TextControl {...props} />
        </FieldShell>
      );
  }
}
