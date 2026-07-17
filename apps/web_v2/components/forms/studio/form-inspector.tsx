"use client";

/**
 * Form Studio inspector — the right panel is the DESIGN hub only
 * (2026-07-17 reorg): Template · Brand · Setup. All content editing —
 * header/ending copy, fields, per-field logic — lives in the LEFT rail
 * (see the *Panel editors exported for FormStudio's outlineOverride).
 * Protection/consent/anonymity are platform-owned and have no controls here.
 * Every edit mutates the working draft immutably; the parent owns persistence.
 */

import * as React from "react";
import {
  SwatchesIcon,
  PaintBrushBroadIcon,
  FlowArrowIcon,
  ArrowLeftIcon,
  TrashIcon,
  CopySimpleIcon,
} from "@phosphor-icons/react";
import { type StudioTab } from "@/components/studio/studio-frame";
import {
  checkEmbedFit,
  embedFitProblems,
  type FormDefinitionDoc,
  type FormDelivery,
  type FormField,
  type FormIntent,
} from "@workspace/forms-core";
import { INTENT_ORDER, intentMeta } from "@/lib/forms/intents";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PanelSection,
  Field,
  Segmented,
  SwitchRow,
  SelectField,
} from "@/components/studio/controls";
import { TemplatePanel, BrandPanel } from "./template-panel";
import { FIELD_TYPE_ICON } from "./field-palette";
import { FieldTypeSettings, FieldPrivacySettings } from "./field-settings";
import { FieldLogicSection } from "./flow-rules";
import type { OutlineActions } from "./form-outline";

export type FormTabId = "template" | "brand" | "setup";

/** Tab model consumed by the shared StudioFrame. */
export const FORM_TABS: ReadonlyArray<StudioTab<FormTabId>> = [
  { id: "template", label: "Template", icon: SwatchesIcon },
  { id: "brand", label: "Brand", icon: PaintBrushBroadIcon },
  { id: "setup", label: "Setup", icon: FlowArrowIcon },
];

const FIELD_TYPE_LABEL: Record<FormField["type"], string> = {
  shortText: "Short text",
  longText: "Long text",
  rating: "Rating",
  name: "Name",
  email: "Email",
  company: "Company",
  role: "Role",
  website: "Website",
  singleSelect: "Single select",
  multiSelect: "Multi select",
  imageUpload: "Image upload",
  videoUpload: "Video",
  audioUpload: "Audio",
  fileUpload: "File upload",
  consent: "Consent",
  hidden: "Hidden",
};

const PLACEHOLDER_TYPES: ReadonlySet<FormField["type"]> = new Set([
  "shortText",
  "longText",
  "name",
  "email",
  "company",
  "role",
  "website",
]);

/** Renders the active tab's panel. */
export function FormInspectorPanel({
  tab,
  doc,
  onChange,
}: {
  tab: FormTabId;
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  return (
    <div className="pb-12">
      {tab === "template" && <TemplatePanel doc={doc} onChange={onChange} />}
      {tab === "brand" && <BrandPanel doc={doc} onChange={onChange} />}
      {tab === "setup" && <SetupPanel doc={doc} onChange={onChange} />}
    </div>
  );
}

/** Shared breadcrumb header for the left-rail contextual editors. */
export function RailEditorHeader({
  crumb,
  onClose,
  actions,
}: {
  crumb: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex h-9 items-center gap-1 border-b border-border/60 px-2">
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
        )}
      >
        <ArrowLeftIcon className="size-3" weight="bold" aria-hidden />
        Structure
      </button>
      <span className="text-muted-foreground/50" aria-hidden>
        /
      </span>
      {crumb}
      <span className="min-w-0 flex-1" />
      {actions}
    </div>
  );
}

// ── Field view (contextual override) ─────────────────────────────────────────

/**
 * FieldInspector — the selected field's editor, shown in the LEFT rail
 * (Esc or the breadcrumb returns to the structure outline). Conditional
 * logic is content, so each field carries its own Logic section here.
 */
export function FieldInspector({
  field,
  doc,
  onChange,
  actions,
  onUpdate,
  onClose,
}: {
  field: FormField;
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
  actions: OutlineActions;
  onUpdate: (patch: Partial<FormField>) => void;
  onClose: () => void;
}) {
  const showPlaceholder = PLACEHOLDER_TYPES.has(field.type);
  const isConsent = field.type === "consent";
  const TypeIcon = FIELD_TYPE_ICON[field.type];

  return (
    <div className="pb-12">
      <RailEditorHeader
        onClose={onClose}
        crumb={
          <span className="flex min-w-0 items-center gap-1.5 px-1">
            <TypeIcon
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="truncate text-xs font-medium text-foreground">
              {FIELD_TYPE_LABEL[field.type]}
            </span>
          </span>
        }
        actions={
          <div className="flex shrink-0 items-center gap-0.5">
            {!isConsent && (
              <IconBtn
                label="Duplicate field"
                onClick={() => actions.duplicate(field.id)}
              >
                <CopySimpleIcon className="size-3.5" />
              </IconBtn>
            )}
            <IconBtn
              label="Remove field"
              tone="danger"
              onClick={() => {
                actions.removeField(field.id);
                onClose();
              }}
            >
              <TrashIcon className="size-3.5" />
            </IconBtn>
          </div>
        }
      />

      <PanelSection title="Basics">
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
            hint="Optional guidance under the field."
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

        {field.type !== "hidden" && (
          <SwitchRow
            label="Required"
            checked={field.required}
            onCheckedChange={(required) => onUpdate({ required })}
          />
        )}
      </PanelSection>

      <FieldSettingsSections field={field} onUpdate={onUpdate} />

      {!isConsent && field.type !== "hidden" && (
        <FieldLogicSection doc={doc} fieldId={field.id} onChange={onChange} />
      )}
    </div>
  );
}

const TYPE_SETTINGS_TYPES: ReadonlySet<FormField["type"]> = new Set([
  "rating",
  "singleSelect",
  "multiSelect",
  "shortText",
  "longText",
  "imageUpload",
  "fileUpload",
  "hidden",
]);

/** Per-type + privacy settings grouped into their own sections. */
function FieldSettingsSections({
  field,
  onUpdate,
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
}) {
  return (
    <>
      {TYPE_SETTINGS_TYPES.has(field.type) && (
        <PanelSection title="Settings">
          <FieldTypeSettings field={field} onUpdate={onUpdate} />
        </PanelSection>
      )}
      {field.type !== "consent" && field.type !== "hidden" && (
        <PanelSection title="Privacy & publishing">
          <FieldPrivacySettings field={field} onUpdate={onUpdate} />
        </PanelSection>
      )}
    </>
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
        "flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        tone === "danger" && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}

// ── Left-rail content editors (Header / Ending) ─────────────────────────────

/** The form's opening copy — shown when the outline's Header row is selected. */
export function HeaderEditor({
  doc,
  onChange,
  onClose,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
  onClose: () => void;
}) {
  const set = (patch: Partial<FormDefinitionDoc["content"]>) =>
    onChange({ ...doc, content: { ...doc.content, ...patch } });

  return (
    <div className="pb-12">
      <RailEditorHeader
        onClose={onClose}
        crumb={
          <span className="truncate px-1 text-xs font-medium text-foreground">
            Header
          </span>
        }
      />
      <PanelSection title="Header">
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
          label="Intro text"
          htmlFor="f-intro"
          hint="Optional longer note shown above the fields."
        >
          <Textarea
            id="f-intro"
            rows={2}
            value={doc.content.introText}
            onChange={(e) => set({ introText: e.target.value })}
          />
        </Field>
      </PanelSection>
    </div>
  );
}

/** Submission + closing copy — shown when the outline's Ending row is selected. */
export function EndingEditor({
  doc,
  onChange,
  onClose,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
  onClose: () => void;
}) {
  const set = (patch: Partial<FormDefinitionDoc["content"]>) =>
    onChange({ ...doc, content: { ...doc.content, ...patch } });

  return (
    <div className="pb-12">
      <RailEditorHeader
        onClose={onClose}
        crumb={
          <span className="truncate px-1 text-xs font-medium text-foreground">
            Ending
          </span>
        }
      />
      <PanelSection title="Submission">
        <Field label="Submit button" htmlFor="f-submit">
          <Input
            id="f-submit"
            value={doc.content.submitButtonText}
            onChange={(e) => set({ submitButtonText: e.target.value })}
            placeholder="Submit"
          />
        </Field>
        <Field label="After submit">
          <Segmented<"message" | "redirect">
            ariaLabel="Success action"
            value={doc.content.successAction}
            onChange={(successAction) => set({ successAction })}
            options={[
              { value: "message", label: "Show a message" },
              { value: "redirect", label: "Redirect" },
            ]}
          />
        </Field>
        {doc.content.successAction === "redirect" ? (
          <RedirectUrlField
            value={doc.content.redirectUrl}
            onCommit={(redirectUrl) => set({ redirectUrl })}
          />
        ) : (
          <Field label="Success message" htmlFor="f-success">
            <Textarea
              id="f-success"
              rows={2}
              value={doc.content.successMessage}
              onChange={(e) => set({ successMessage: e.target.value })}
            />
          </Field>
        )}
        <Field
          label="Closed message"
          htmlFor="f-closed"
          hint="Shown when the form is no longer accepting responses."
        >
          <Textarea
            id="f-closed"
            rows={2}
            value={doc.content.closedMessage}
            onChange={(e) => set({ closedMessage: e.target.value })}
          />
        </Field>
      </PanelSection>
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

// ── Setup ───────────────────────────────────────────────────────────────────

/**
 * The form's product posture: what kind of form it is and where it lives.
 * Both are mutable — a wrong first pick is never a dead end. Anti-abuse
 * (captcha, honeypot, timing, blocked words) and consent/anonymity are
 * platform-owned with protective defaults; they are deliberately not
 * user-facing controls (2026-07-17).
 */
function SetupPanel({
  doc,
  onChange,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const setSettings = (patch: Partial<FormDefinitionDoc["settings"]>) =>
    onChange({ ...doc, settings: { ...doc.settings, ...patch } });
  const fit = checkEmbedFit(doc);
  const showFit = doc.delivery === "embed" && !fit.ok;

  return (
    <>
      <PanelSection title="Form">
        <Field
          label="Form type"
          hint="Changing type never touches your fields — it reclassifies the form."
        >
          <SelectField
            ariaLabel="Form type"
            value={doc.intent}
            onChange={(intent) =>
              onChange({ ...doc, intent: intent as FormIntent })
            }
            options={INTENT_ORDER.map((intent) => ({
              value: intent,
              label: intentMeta(intent).label,
            }))}
          />
        </Field>
        <Field
          label="Delivery"
          hint={
            doc.delivery === "embed"
              ? "Lives inside your site. Fewer, lighter questions by design."
              : "A full page at your form link, with the template's full range."
          }
        >
          <Segmented<FormDelivery>
            ariaLabel="Delivery"
            value={doc.delivery}
            onChange={(delivery) => onChange({ ...doc, delivery })}
            options={[
              { value: "hosted", label: "Hosted page" },
              { value: "embed", label: "Embedded" },
            ]}
          />
        </Field>
        {showFit ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-foreground"
          >
            <p className="font-medium">Doesn&apos;t fit an embed yet</p>
            <ul className="mt-1 list-disc pl-4 text-muted-foreground">
              {embedFitProblems(fit).map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </PanelSection>

      <PanelSection title="Branding">
        <SwitchRow
          label="Semblia attribution"
          description="A subtle “Powered by Semblia” in the footer."
          checked={doc.settings.attribution}
          onCheckedChange={(attribution) => setSettings({ attribution })}
        />
      </PanelSection>
    </>
  );
}
