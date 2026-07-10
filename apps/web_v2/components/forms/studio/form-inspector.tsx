"use client";

/**
 * Form Studio inspector — the right panel's content.
 *
 * Three tabs (Content · Design · Flow) plus a contextual Field view that
 * replaces them while a field is selected (from the outline or the canvas).
 * Structure editing lives in the left outline; this panel only configures.
 * Every edit mutates the working draft immutably; the parent owns persistence.
 */

import * as React from "react";
import {
  TextAlignLeftIcon,
  PaintBrushBroadIcon,
  FlowArrowIcon,
  ArrowLeftIcon,
  TrashIcon,
  CopySimpleIcon,
} from "@phosphor-icons/react";
import { type StudioTab } from "@/components/studio/studio-frame";
import type {
  FormDefinitionDoc,
  FormField,
  FlowMode,
  ConsentPlacement,
  CaptchaMode,
} from "@workspace/forms-core";
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
import { FormStylePanel } from "./form-style-panel";
import { FIELD_TYPE_ICON } from "./field-palette";
import { FieldTypeSettings, FieldPrivacySettings } from "./field-settings";
import { FlowRulesEditor } from "./flow-rules";
import type { OutlineActions } from "./form-outline";

export type FormTabId = "content" | "design" | "flow";

/** Tab model consumed by the shared StudioFrame. */
export const FORM_TABS: ReadonlyArray<StudioTab<FormTabId>> = [
  { id: "content", label: "Content", icon: TextAlignLeftIcon },
  { id: "design", label: "Design", icon: PaintBrushBroadIcon },
  { id: "flow", label: "Flow", icon: FlowArrowIcon },
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
      {tab === "content" && <ContentPanel doc={doc} onChange={onChange} />}
      {tab === "design" && <FormStylePanel doc={doc} onChange={onChange} />}
      {tab === "flow" && <FlowPanel doc={doc} onChange={onChange} />}
    </div>
  );
}

// ── Field view (contextual override) ─────────────────────────────────────────

/**
 * FieldInspector — the selected field's editor. Replaces the tabbed panel
 * while a selection is active (Esc or the breadcrumb returns).
 */
export function FieldInspector({
  field,
  actions,
  onUpdate,
  onClose,
}: {
  field: FormField;
  actions: OutlineActions;
  onUpdate: (patch: Partial<FormField>) => void;
  onClose: () => void;
}) {
  const showPlaceholder = PLACEHOLDER_TYPES.has(field.type);
  const isConsent = field.type === "consent";
  const TypeIcon = FIELD_TYPE_ICON[field.type];

  return (
    <div className="pb-12">
      {/* Breadcrumb header */}
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
          Fields
        </button>
        <span className="text-muted-foreground/50" aria-hidden>
          /
        </span>
        <span className="flex min-w-0 items-center gap-1.5 px-1">
          <TypeIcon
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="truncate text-xs font-medium text-foreground">
            {FIELD_TYPE_LABEL[field.type]}
          </span>
        </span>
        <span className="min-w-0 flex-1" />
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
      </div>

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

// ── Content ─────────────────────────────────────────────────────────────────

function ContentPanel({
  doc,
  onChange,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const set = (patch: Partial<FormDefinitionDoc["content"]>) =>
    onChange({ ...doc, content: { ...doc.content, ...patch } });

  return (
    <>
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
    </>
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

// ── Flow ────────────────────────────────────────────────────────────────────

function FlowPanel({
  doc,
  onChange,
}: {
  doc: FormDefinitionDoc;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const setFlow = (patch: Partial<FormDefinitionDoc["flow"]>) =>
    onChange({ ...doc, flow: { ...doc.flow, ...patch } });
  const setSettings = (patch: Partial<FormDefinitionDoc["settings"]>) =>
    onChange({ ...doc, settings: { ...doc.settings, ...patch } });

  return (
    <>
      <PanelSection title="Flow">
        <Field label="Mode">
          <Segmented<FlowMode>
            ariaLabel="Flow mode"
            value={doc.flow.mode}
            onChange={(mode) => setFlow({ mode })}
            options={[
              { value: "single", label: "Single page" },
              { value: "step", label: "Step by step" },
            ]}
          />
        </Field>
        {doc.flow.mode === "step" && (
          <>
            <SwitchRow
              label="Progress indicator"
              checked={doc.flow.progressIndicator}
              onCheckedChange={(progressIndicator) =>
                setFlow({ progressIndicator })
              }
            />
            <SwitchRow
              label="Auto-advance"
              description="Move on after a rating is chosen."
              checked={doc.flow.autoAdvance}
              onCheckedChange={(autoAdvance) => setFlow({ autoAdvance })}
            />
          </>
        )}
        <Field label="Consent placement">
          <SelectField<ConsentPlacement>
            ariaLabel="Consent placement"
            value={doc.flow.consentPlacement}
            onChange={(consentPlacement) => setFlow({ consentPlacement })}
            options={[
              { value: "beforeSubmit", label: "Before submit" },
              { value: "finalStep", label: "Final step" },
              { value: "inline", label: "Inline with fields" },
            ]}
          />
        </Field>
      </PanelSection>

      <FlowRulesEditor doc={doc} onChange={onChange} />

      <PanelSection title="Behavior">
        <SwitchRow
          label="Require consent"
          description="Block submission until the respondent agrees."
          checked={doc.settings.requireConsent}
          onCheckedChange={(requireConsent) => setSettings({ requireConsent })}
        />
        <SwitchRow
          label="Allow anonymous"
          description="Submit without identifying themselves."
          checked={doc.settings.allowAnonymous}
          onCheckedChange={(allowAnonymous) => setSettings({ allowAnonymous })}
        />
        <SwitchRow
          label="Semblia attribution"
          description="A subtle “Powered by Semblia” in the footer."
          checked={doc.settings.attribution}
          onCheckedChange={(attribution) => setSettings({ attribution })}
        />
      </PanelSection>

      <PanelSection title="Protection">
        <Field
          label="Captcha"
          hint="“Suspicious” challenges only flagged traffic."
        >
          <Segmented<CaptchaMode>
            ariaLabel="Captcha mode"
            value={doc.settings.captchaMode}
            onChange={(captchaMode) => setSettings({ captchaMode })}
            options={[
              { value: "off", label: "Off" },
              { value: "suspicious", label: "Suspicious" },
              { value: "always", label: "Always" },
            ]}
          />
        </Field>
        <Field
          label="Minimum completion time"
          hint="Submissions faster than this are rejected as bots."
        >
          <SelectField
            ariaLabel="Minimum completion time"
            value={String(doc.settings.minCompletionMs)}
            onChange={(v) => setSettings({ minCompletionMs: Number(v) })}
            options={[
              { value: "0", label: "Off" },
              { value: "2000", label: "2 seconds" },
              { value: "5000", label: "5 seconds" },
              { value: "10000", label: "10 seconds" },
            ]}
          />
        </Field>
        <SwitchRow
          label="Honeypot"
          description="An invisible trap field that catches naive bots."
          checked={doc.settings.honeypot}
          onCheckedChange={(honeypot) => setSettings({ honeypot })}
        />
        <BlockedWordsField
          value={doc.settings.blockedWords}
          onCommit={(blockedWords) => setSettings({ blockedWords })}
        />
      </PanelSection>
    </>
  );
}

/** Comma/newline-separated blocked words; parsed on commit, fluid while typing. */
function BlockedWordsField({
  value,
  onCommit,
}: {
  value: string[];
  onCommit: (words: string[]) => void;
}) {
  const [raw, setRaw] = React.useState(value.join(", "));

  return (
    <Field
      label="Blocked words"
      htmlFor="f-blocked"
      hint="Submissions containing any of these are rejected. Separate with commas."
    >
      <Textarea
        id="f-blocked"
        rows={2}
        placeholder="spam, casino, …"
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          onCommit(
            e.target.value
              .split(/[,\n]/)
              .map((w) => w.trim())
              .filter(Boolean),
          );
        }}
      />
    </Field>
  );
}
