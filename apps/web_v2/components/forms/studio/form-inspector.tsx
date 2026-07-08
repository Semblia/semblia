"use client";

/**
 * FormInspectorPanel — the Form Studio's guided editing surface.
 *
 * Five outcome-shaped sections (Setup · Questions · Design · After submit ·
 * Publish) replace the old config taxonomy. Users tune visible product
 * choices; Semblia owns spam protection, consent plumbing, routing, and
 * schema mechanics — none of that surfaces here. Every edit mutates the
 * working draft immutably; the parent owns persistence.
 */

import * as React from "react";
import { toast } from "sonner";
import {
  SlidersHorizontalIcon,
  ListBulletsIcon,
  PaintBrushBroadIcon,
  PaperPlaneTiltIcon,
  RocketLaunchIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowSquareOutIcon,
  TrashIcon,
  CopySimpleIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { type StudioSection } from "@/components/studio/studio-rail";
import type { FormDefinitionDoc, FormField } from "@workspace/forms-core";
import type { V2FormDTO } from "@workspace/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Section,
  Field,
  Segmented,
  SwitchRow,
} from "@/components/studio/controls";
import { SnippetBlock } from "@/components/studio/snippet-block";
import { hostedFormUrl, hostedFormLink } from "@/lib/semblia-urls";
import { intentMeta } from "@/lib/forms/intents";
import { FormStylePanel } from "./form-style-panel";
import {
  FieldPalette,
  fieldDisplayMeta,
  duplicateField,
} from "./field-palette";
import { FieldTypeSettings } from "./field-settings";

export type FormSectionId =
  | "setup"
  | "questions"
  | "design"
  | "after"
  | "publish";

/** Section model consumed by the shared StudioRail. */
export const FORM_SECTIONS: ReadonlyArray<StudioSection<FormSectionId>> = [
  { id: "setup", label: "Setup", icon: SlidersHorizontalIcon },
  { id: "questions", label: "Questions", icon: ListBulletsIcon },
  { id: "design", label: "Design", icon: PaintBrushBroadIcon },
  { id: "after", label: "After", icon: PaperPlaneTiltIcon },
  { id: "publish", label: "Publish", icon: RocketLaunchIcon },
];

const PLACEHOLDER_TYPES: ReadonlySet<FormField["type"]> = new Set([
  "shortText",
  "longText",
  "name",
  "email",
  "company",
  "role",
  "website",
]);

/** Canvas → inspector selection. `nonce` re-triggers on repeat clicks. */
export interface FieldSelection {
  id: string;
  nonce: number;
}

/** Server-backed studio context the Setup + Publish panels need. */
export interface FormStudioContext {
  form: V2FormDTO;
  publishing: boolean;
  onPublish: () => void;
  /** PATCHes the form record (slug / open). Resolves when the server accepts. */
  onUpdateForm: (patch: { slug?: string; open?: boolean }) => Promise<void>;
}

export function FormInspectorPanel({
  section,
  doc,
  onChange,
  selection,
  studio,
}: {
  section: FormSectionId;
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
  selection?: FieldSelection | null;
  studio: FormStudioContext;
}) {
  return (
    <div className="px-5 pb-12 pt-5">
      {section === "setup" && (
        <SetupPanel doc={doc} onChange={onChange} studio={studio} />
      )}
      {section === "questions" && (
        <QuestionsPanel doc={doc} onChange={onChange} selection={selection} />
      )}
      {section === "design" && <FormStylePanel doc={doc} onChange={onChange} />}
      {section === "after" && (
        <AfterSubmitPanel doc={doc} onChange={onChange} />
      )}
      {section === "publish" && <PublishPanel studio={studio} />}
    </div>
  );
}

// ── Setup ────────────────────────────────────────────────────────────────────

function SetupPanel({
  doc,
  onChange,
  studio,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
  studio: FormStudioContext;
}) {
  const set = (patch: Partial<FormDefinitionDoc["content"]>) =>
    onChange({ ...doc, content: { ...doc.content, ...patch } });

  const { form } = studio;
  const meta = intentMeta(form.intent);
  const IntentIcon = meta.icon;
  const isLive = form.status === "PUBLISHED";

  return (
    <div className="flex flex-col gap-7">
      {!isLive && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5 text-[11.5px] leading-relaxed text-foreground">
          <span className="font-semibold">This form isn&apos;t live yet.</span>{" "}
          Only you can see it — publish when you&apos;re ready to start
          collecting responses.
        </div>
      )}

      <Section
        title="What this form asks"
        description="The heading respondents see first."
      >
        <Field label="Title" htmlFor="f-title">
          <Input
            id="f-title"
            value={doc.content.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Share your experience"
          />
        </Field>
        <Field label="Description" htmlFor="f-desc">
          <Textarea
            id="f-desc"
            rows={2}
            value={doc.content.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="A short line of context under the title."
          />
        </Field>
        <Field
          label="Welcome note"
          htmlFor="f-intro"
          hint="Optional longer note shown above the questions."
        >
          <Textarea
            id="f-intro"
            rows={2}
            value={doc.content.introText}
            onChange={(e) => set({ introText: e.target.value })}
          />
        </Field>
      </Section>

      <Section title="Type">
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              meta.accent,
            )}
          >
            <IntentIcon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">
              {meta.label} form
            </p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Chosen at creation — it seeded the questions below.
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Link"
        description="The address your form lives at once published."
      >
        <SlugField
          slug={form.slug}
          onCommit={(slug) => studio.onUpdateForm({ slug })}
        />
      </Section>
    </div>
  );
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 64);
}

/**
 * Slug editor — commits on blur/Enter so the public address never churns per
 * keystroke. Renaming a live form's link is allowed but flagged, since old
 * links stop resolving.
 */
function SlugField({
  slug,
  onCommit,
}: {
  slug: string | null;
  onCommit: (slug: string) => Promise<void>;
}) {
  const [raw, setRaw] = React.useState(slug ?? "");
  const [saving, setSaving] = React.useState(false);
  const dirty = raw !== (slug ?? "");
  const valid = raw.length >= 3 && SLUG_RE.test(raw);

  // Follow server-confirmed renames (and other sessions' edits) while clean.
  React.useEffect(() => {
    setRaw(slug ?? "");
  }, [slug]);

  const commit = async () => {
    if (!dirty || !valid || saving) return;
    setSaving(true);
    try {
      await onCommit(raw);
      toast.success("Link updated");
    } catch {
      toast.error("That link isn't available — try another.");
      setRaw(slug ?? "");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Field
      label="Your link"
      hint={
        dirty && !valid
          ? "Use at least 3 characters — lowercase letters, numbers, and hyphens."
          : "Lowercase letters, numbers, and hyphens."
      }
      trailing={
        saving ? (
          <CircleNotchIcon
            className="size-3.5 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : undefined
      }
    >
      <div className="flex items-stretch overflow-hidden rounded-md border border-border bg-background focus-within:border-foreground/40">
        <span className="flex select-none items-center bg-muted/40 px-2 font-mono text-[10.5px] text-muted-foreground">
          forms.semblia.com/f/
        </span>
        <Input
          value={raw}
          onChange={(e) => setRaw(normalizeSlug(e.target.value))}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            }
          }}
          aria-invalid={dirty && !valid}
          className="h-8 rounded-none border-0 font-mono text-xs focus-visible:ring-0"
          spellCheck={false}
          placeholder="your-form"
        />
      </div>
    </Field>
  );
}

// ── Questions ────────────────────────────────────────────────────────────────

function QuestionsPanel({
  doc,
  onChange,
  selection,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
  selection?: FieldSelection | null;
}) {
  const fields = doc.fields;
  const headerRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const updateField = (id: string, patch: Partial<FormField>) =>
    onChange({
      ...doc,
      fields: fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });

  const removeField = (id: string) =>
    onChange({ ...doc, fields: fields.filter((f) => f.id !== id) });

  // New fields land before a trailing consent field — consent reads last.
  const addField = (field: FormField) => {
    const last = fields[fields.length - 1];
    const next =
      last?.type === "consent" && field.type !== "consent"
        ? [...fields.slice(0, -1), field, last]
        : [...fields, field];
    onChange({ ...doc, fields: next });
  };

  const duplicate = (id: string) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const copy = duplicateField(fields[idx], doc);
    const next = [...fields];
    next.splice(idx + 1, 0, copy);
    onChange({ ...doc, fields: next });
  };

  // Keyboard on a field header: ↑/↓ moves focus, Alt+↑/↓ reorders, Delete
  // removes (focus stays useful), D duplicates.
  const handleHeaderKey = (e: React.KeyboardEvent, index: number) => {
    const field = fields[index];
    if (!field) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const dir = e.key === "ArrowDown" ? 1 : -1;
      e.preventDefault();
      if (e.altKey) {
        moveField(field.id, dir);
        // The card carries its ref position; refocus after reorder.
        requestAnimationFrame(() => {
          headerRefs.current[
            Math.min(Math.max(index + dir, 0), fields.length - 1)
          ]?.focus();
        });
      } else {
        headerRefs.current[
          (index + dir + fields.length) % fields.length
        ]?.focus();
      }
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeField(field.id);
      requestAnimationFrame(() => {
        headerRefs.current[Math.max(index - 1, 0)]?.focus();
      });
      return;
    }
    if (e.key.toLowerCase() === "d" && field.type !== "consent") {
      e.preventDefault();
      duplicate(field.id);
    }
  };

  const moveField = (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex((f) => f.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= fields.length) return;
    const reordered = [...fields];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(next, 0, moved);
    onChange({ ...doc, fields: reordered });
  };

  return (
    <Section
      title="Questions"
      description="What your form asks, in order. Click one to edit it."
      action={<FieldPalette doc={doc} onAdd={addField} />}
    >
      <div className="flex flex-col gap-2.5">
        {fields.map((field, i) => (
          <FieldEditor
            key={field.id}
            field={field}
            isFirst={i === 0}
            isLast={i === fields.length - 1}
            selection={selection}
            headerRef={(el) => {
              headerRefs.current[i] = el;
            }}
            onHeaderKeyDown={(e) => handleHeaderKey(e, i)}
            onUpdate={(patch) => updateField(field.id, patch)}
            onRemove={() => removeField(field.id)}
            onDuplicate={() => duplicate(field.id)}
            onMove={(dir) => moveField(field.id, dir)}
          />
        ))}
        {fields.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            No questions yet — add your first one above.
          </p>
        )}
      </div>
    </Section>
  );
}

function FieldEditor({
  field,
  isFirst,
  isLast,
  selection,
  headerRef,
  onHeaderKeyDown,
  onUpdate,
  onRemove,
  onDuplicate,
  onMove,
}: {
  field: FormField;
  isFirst: boolean;
  isLast: boolean;
  selection?: FieldSelection | null;
  headerRef?: React.Ref<HTMLButtonElement>;
  onHeaderKeyDown?: (e: React.KeyboardEvent) => void;
  onUpdate: (patch: Partial<FormField>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [flash, setFlash] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const showPlaceholder = PLACEHOLDER_TYPES.has(field.type);
  const isConsent = field.type === "consent";
  const display = fieldDisplayMeta(field);
  const TypeIcon = display.icon;

  // Canvas click landed on this field: expand, reveal, and flash the card.
  const selectedHere = selection?.id === field.id;
  const nonce = selection?.nonce;
  React.useEffect(() => {
    if (!selectedHere) return;
    setOpen(true);
    setFlash(true);
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const t = window.setTimeout(() => setFlash(false), 1100);
    return () => window.clearTimeout(t);
  }, [selectedHere, nonce]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "rounded-xl border border-border bg-card transition-shadow duration-300",
        flash && "border-brand/60 shadow-[0_0_0_3px] shadow-brand/15",
      )}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span
          title={display.label}
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground"
        >
          <TypeIcon className="size-3.5" aria-hidden />
          <span className="sr-only">{display.label}</span>
        </span>
        <button
          type="button"
          ref={headerRef}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={onHeaderKeyDown}
          aria-expanded={open}
          className={cn(
            "min-w-0 flex-1 truncate rounded text-left text-xs font-medium text-foreground hover:text-foreground/80",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          {field.label || "Untitled question"}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconBtn
            label="Move up"
            disabled={isFirst}
            onClick={() => onMove(-1)}
          >
            <ArrowUpIcon className="size-3.5" />
          </IconBtn>
          <IconBtn
            label="Move down"
            disabled={isLast}
            onClick={() => onMove(1)}
          >
            <ArrowDownIcon className="size-3.5" />
          </IconBtn>
          {!isConsent && (
            <IconBtn label="Duplicate question" onClick={onDuplicate}>
              <CopySimpleIcon className="size-3.5" />
            </IconBtn>
          )}
          <IconBtn label="Remove question" tone="danger" onClick={onRemove}>
            <TrashIcon className="size-3.5" />
          </IconBtn>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border/60 px-3 py-3">
          <Field label="Label" htmlFor={`fl-${field.id}`}>
            <Input
              id={`fl-${field.id}`}
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
            />
          </Field>

          {isConsent ? (
            <Field label="Consent statement" htmlFor={`fc-${field.id}`}>
              <Textarea
                id={`fc-${field.id}`}
                rows={2}
                value={field.consentCopy ?? ""}
                onChange={(e) => onUpdate({ consentCopy: e.target.value })}
              />
            </Field>
          ) : (
            <Field
              label="Help text"
              htmlFor={`fh-${field.id}`}
              hint="Optional guidance under the question."
            >
              <Input
                id={`fh-${field.id}`}
                value={field.description ?? ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
              />
            </Field>
          )}

          {showPlaceholder && (
            <Field label="Placeholder" htmlFor={`fp-${field.id}`}>
              <Input
                id={`fp-${field.id}`}
                value={field.placeholder ?? ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
              />
            </Field>
          )}

          <FieldTypeSettings field={field} onUpdate={onUpdate} />

          {field.type !== "hidden" && (
            <SwitchRow
              label="Required"
              description="Respondents must answer before submitting."
              checked={field.required}
              onCheckedChange={(required) => onUpdate({ required })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  label,
  children,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        tone === "danger" && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}

// ── After submit ─────────────────────────────────────────────────────────────

function AfterSubmitPanel({
  doc,
  onChange,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const set = (patch: Partial<FormDefinitionDoc["content"]>) =>
    onChange({ ...doc, content: { ...doc.content, ...patch } });

  return (
    <div className="flex flex-col gap-7">
      <Section
        title="The thank-you moment"
        description="What happens right after someone submits."
      >
        <Field label="Submit button" htmlFor="f-submit">
          <Input
            id="f-submit"
            value={doc.content.submitButtonText}
            onChange={(e) => set({ submitButtonText: e.target.value })}
            placeholder="Submit"
          />
        </Field>
        <Field label="Then">
          <Segmented<"message" | "redirect">
            ariaLabel="Success action"
            value={doc.content.successAction}
            onChange={(successAction) => set({ successAction })}
            options={[
              { value: "message", label: "Show a thank-you" },
              { value: "redirect", label: "Send them somewhere" },
            ]}
          />
        </Field>
        {doc.content.successAction === "redirect" ? (
          <RedirectUrlField
            value={doc.content.redirectUrl}
            onCommit={(redirectUrl) => set({ redirectUrl })}
          />
        ) : (
          <Field label="Thank-you message" htmlFor="f-success">
            <Textarea
              id="f-success"
              rows={2}
              value={doc.content.successMessage}
              onChange={(e) => set({ successMessage: e.target.value })}
            />
          </Field>
        )}
      </Section>

      <Section
        title="When the form is closed"
        description="Shown if you stop accepting responses."
      >
        <Field label="Closed message" htmlFor="f-closed">
          <Textarea
            id="f-closed"
            rows={2}
            value={doc.content.closedMessage}
            onChange={(e) => set({ closedMessage: e.target.value })}
          />
        </Field>
      </Section>
    </div>
  );
}

/**
 * Redirect URL input — commits to the doc only when the value is a valid
 * http(s) URL (or empty → null), since the schema hard-rejects anything else
 * at publish time. Local state keeps typing fluid.
 */
function RedirectUrlField({
  value,
  onCommit,
}: {
  value: string | null;
  onCommit: (url: string | null) => void;
}) {
  const [raw, setRaw] = React.useState(value ?? "");
  const valid = raw === "" || /^https?:\/\/\S+\.\S+/i.test(raw);

  return (
    <Field
      label="Redirect to"
      htmlFor="f-redirect"
      hint={
        valid
          ? "Respondents land here right after submitting."
          : "Enter a full URL starting with https://"
      }
    >
      <Input
        id="f-redirect"
        type="url"
        inputMode="url"
        placeholder="https://your-site.com/thanks"
        value={raw}
        aria-invalid={!valid}
        onChange={(e) => {
          const next = e.target.value;
          setRaw(next);
          if (next === "") onCommit(null);
          else if (/^https?:\/\/\S+\.\S+/i.test(next)) onCommit(next);
        }}
      />
    </Field>
  );
}

// ── Publish ──────────────────────────────────────────────────────────────────

function PublishPanel({ studio }: { studio: FormStudioContext }) {
  const { form } = studio;
  const everPublished = form.currentVersion != null;
  const isLive = form.status === "PUBLISHED";
  const link = form.slug ? hostedFormLink(form.slug) : null;

  return (
    <div className="flex flex-col gap-7">
      <Section
        title={everPublished ? "Your form is live" : "Ready when you are"}
        description={
          everPublished
            ? "Publishing again replaces the live version instantly."
            : "Publishing makes your form public at its link."
        }
      >
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-3">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                isLive && form.open
                  ? "bg-success ring-4 ring-success/15"
                  : isLive
                    ? "bg-warning ring-4 ring-warning/15"
                    : "bg-muted-foreground/40 ring-4 ring-muted-foreground/10",
              )}
            />
            <div>
              <p className="text-xs font-semibold text-foreground">
                {isLive ? (form.open ? "Live" : "Live · paused") : "Draft"}
              </p>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {isLive
                  ? form.open
                    ? "Anyone with the link can respond."
                    : "The page is up, but new responses are paused."
                  : "Not visible to anyone yet."}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 text-xs"
            onClick={studio.onPublish}
            disabled={studio.publishing}
          >
            {studio.publishing
              ? "Publishing…"
              : everPublished
                ? "Publish update"
                : "Publish"}
          </Button>
        </div>
      </Section>

      {isLive && link && (
        <Section title="Share your form">
          <SnippetBlock
            title="Live link"
            hint="Share it anywhere — email, socials, your site."
            code={link}
            actions={
              <a
                href={link}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[10.5px] font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              >
                <ArrowSquareOutIcon
                  className="size-3"
                  weight="bold"
                  aria-hidden
                />
                Open
              </a>
            }
          />
        </Section>
      )}

      {isLive && (
        <Section title="Responses">
          <SwitchRow
            label="Accepting responses"
            description="Turn off to pause the form without unpublishing it."
            checked={form.open}
            onCheckedChange={(open) => {
              studio
                .onUpdateForm({ open })
                .catch(() => toast.error("Couldn't update. Try again."));
            }}
          />
        </Section>
      )}

      {!isLive && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Your link will be{" "}
          <span className="font-mono text-foreground/80">
            {hostedFormUrl(form.slug ?? "your-form")}
          </span>
          . You can change it in Setup.
        </p>
      )}
    </div>
  );
}
