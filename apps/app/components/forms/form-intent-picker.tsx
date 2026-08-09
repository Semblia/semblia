"use client";

/**
 * FormIntentPicker — the create-a-form gallery.
 *
 * Base × template: pick what you're collecting (the intent seeds fields,
 * copy, consent) and which template presents it (a self-contained design
 * project — Meridian, Aperture, Ledger, Parcel, Terminal). The right pane is
 * a real, scaled FormRenderer of that exact combination — the same compiler
 * and renderer the hosted page uses — so what you create is literally what
 * respondents will see. The intent's designed default template is preselected
 * and listed first.
 *
 * Structure notes, from the internal-UI system:
 *   • the dialog is a floating layer, so it is a sanctioned container — but the
 *     options *inside* it are not. They were bordered boxes on a bordered
 *     surface; selection is now the app's tint-plus-ring language, the same one
 *     `FilterPills` uses.
 *   • all three option groups run on Radix `RadioGroup`, which is where the
 *     roving tabindex and Arrow/Home/End behaviour comes from. The previous
 *     build declared `role="radiogroup"` by hand and handled no arrow key at
 *     all, so the markup promised keyboard semantics it did not have.
 */

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type { V2FormIntent } from "@workspace/types";
import {
  createFormTemplate,
  defaultTemplateForIntent,
  FORM_TEMPLATES,
  type FormDelivery,
} from "@workspace/forms-core";
import { FormRenderer } from "@workspace/forms-renderer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { INTENT_ORDER, intentMeta } from "@/lib/forms/intents";
import { compilePreviewSnapshot } from "@/lib/forms/draft";

interface FormIntentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (
    intent: V2FormIntent,
    templateId: string,
    delivery: FormDelivery,
  ) => void;
  /** Disables the options while a create request is in flight. */
  pending?: boolean;
  /**
   * Set when the workspace plan has no form allowance left. The list's own
   * New form button is already disabled for this, but the dialog is addressable
   * on its own (`?new=1` survives a bookmark, a refresh, and Back), so the
   * refusal has to be stated at the control that would actually trigger it —
   * otherwise Create form is a button whose only outcome is a 403.
   */
  blockedReason?: React.ReactNode;
  /** Brand fact: seeds the preview + created form with the project's color. */
  projectBrandColor?: string | null;
}

const PREVIEW_STAGE_WIDTH = 640;
const PREVIEW_SCALE = 0.62;

const DELIVERY_OPTIONS: ReadonlyArray<{
  value: FormDelivery;
  label: string;
  blurb: string;
}> = [
  {
    value: "hosted",
    label: "Hosted page",
    blurb: "A full page at your form link",
  },
  {
    value: "embed",
    label: "Embedded",
    blurb: "Lives inside your own site",
  },
];

/** Selection reads as tint + amber ring — never as a second bordered surface. */
const OPTION_BASE =
  "outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-60";
const OPTION_ON = "bg-brand/8 ring-1 ring-brand/30";
const OPTION_OFF = "hover:bg-muted/50";

function isIntent(value: string): value is V2FormIntent {
  return INTENT_ORDER.includes(value as V2FormIntent);
}

function isDelivery(value: string): value is FormDelivery {
  return DELIVERY_OPTIONS.some((option) => option.value === value);
}

export function FormIntentPicker({
  open,
  onOpenChange,
  onCreate,
  pending = false,
  blockedReason,
  projectBrandColor,
}: FormIntentPickerProps) {
  const blocked = blockedReason != null && blockedReason !== false;
  const [intent, setIntentState] = React.useState<V2FormIntent>("TESTIMONIAL");
  const [templateId, setTemplateId] = React.useState<string>(() =>
    defaultTemplateForIntent("TESTIMONIAL"),
  );
  const [delivery, setDelivery] = React.useState<FormDelivery>("hosted");

  // Changing the base re-recommends its designed template (still overridable).
  const setIntent = (next: V2FormIntent) => {
    setIntentState(next);
    setTemplateId(defaultTemplateForIntent(next));
  };

  const recommendedId = defaultTemplateForIntent(intent);
  // `find` can miss if a template is retired between builds; the summary then
  // reads as the base alone rather than trailing a separator into nothing.
  const selectedTemplateName = FORM_TEMPLATES.find(
    (t) => t.id === templateId,
  )?.name;
  const orderedTemplates = React.useMemo(
    () =>
      [...FORM_TEMPLATES].sort(
        (a, b) =>
          Number(b.id === recommendedId) - Number(a.id === recommendedId),
      ),
    [recommendedId],
  );

  const snapshot = React.useMemo(() => {
    const doc = createFormTemplate(intent, delivery);
    return compilePreviewSnapshot(
      {
        ...doc,
        templateId,
        brand: {
          ...doc.brand,
          color: projectBrandColor || doc.brand.color,
        },
      },
      { formId: "new", projectId: "new", slug: null },
    );
  }, [intent, templateId, delivery, projectBrandColor]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton
      >
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Create a form
          </DialogTitle>
          {/* DialogDescription, not a bare <p>: it is what wires the dialog's
              `aria-describedby`. A raw paragraph leaves the dialog with a name
              and no description for assistive tech. */}
          <DialogDescription className="mt-1 text-xs leading-relaxed">
            Pick what you&apos;re collecting and a template — the preview is the
            real form. Words and questions stay editable in the studio.
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-[264px_1fr]">
          {/* Bases */}
          <IntentOptions
            intent={intent}
            pending={pending}
            onSelect={setIntent}
          />

          {/* Live preview + templates */}
          <div className="flex min-w-0 flex-col">
            <TemplatePreview
              snapshot={snapshot}
              previewKey={`${intent}:${templateId}:${delivery}`}
              delivery={delivery}
            />

            <DeliveryOptions
              delivery={delivery}
              pending={pending}
              onSelect={setDelivery}
            />

            <TemplateOptions
              templates={orderedTemplates}
              templateId={templateId}
              recommendedId={recommendedId}
              pending={pending}
              onSelect={setTemplateId}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-6 py-3.5">
          {/* When the plan allowance is spent, the reason replaces the
              selection summary: it is the only fact on this bar the user can
              act on, and a disabled button takes no pointer events, so a
              tooltip could never carry it. */}
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            {blocked ? (
              blockedReason
            ) : (
              <span className="block truncate">
                {intentMeta(intent).label}
                {selectedTemplateName ? ` · ${selectedTemplateName}` : ""}
              </span>
            )}
          </p>
          <Button
            size="sm"
            className="shrink-0"
            disabled={pending || blocked}
            aria-busy={pending}
            onClick={() => onCreate(intent, templateId, delivery)}
          >
            {pending ? "Creating…" : "Create form"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The left column: what you're collecting (seeds fields, copy, consent). */
function IntentOptions({
  intent,
  pending,
  onSelect,
}: {
  intent: V2FormIntent;
  pending: boolean;
  onSelect: (value: V2FormIntent) => void;
}) {
  return (
    <RadioGroupPrimitive.Root
      value={intent}
      onValueChange={(next) => {
        if (isIntent(next)) onSelect(next);
      }}
      disabled={pending}
      loop
      aria-label="Form base"
      className="flex flex-col gap-1.5 p-4 sm:border-r sm:border-border/60"
    >
      {INTENT_ORDER.map((value) => {
        const meta = intentMeta(value);
        const Icon = meta.icon;
        const active = intent === value;
        return (
          <RadioGroupPrimitive.Item
            key={value}
            value={value}
            className={cn(
              "flex items-center gap-3 rounded-lg p-2.5 text-left",
              OPTION_BASE,
              active ? OPTION_ON : OPTION_OFF,
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md",
                meta.accent,
              )}
              aria-hidden
            >
              <Icon className="size-4" weight="bold" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight text-foreground">
                {meta.label}
              </span>
              <span className="mt-px block text-xs leading-snug text-muted-foreground">
                {meta.blurb}
              </span>
            </span>
          </RadioGroupPrimitive.Item>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}

/** A real, scaled FormRenderer of the exact intent × template × delivery. */
function TemplatePreview({
  snapshot,
  previewKey,
  delivery,
}: {
  snapshot: ReturnType<typeof compilePreviewSnapshot>;
  previewKey: string;
  delivery: FormDelivery;
}) {
  const dark = snapshot.template.appearance === "dark";
  return (
    <div
      aria-hidden
      // inert: the preview is a picture — its form controls must not
      // be tabbable while aria-hidden.
      inert
      className="relative hidden h-[280px] overflow-hidden sm:block"
      style={{ background: dark ? "#0a0a0b" : "#f4f4f5" }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 origin-top select-none"
        style={
          {
            width: PREVIEW_STAGE_WIDTH,
            transform: `translateX(-50%) scale(${PREVIEW_SCALE})`,
            // The gallery previews the true hosted page; bound its
            // "viewport" so full-page compositions crop, not balloon.
            "--tf-viewport": "620px",
          } as React.CSSProperties
        }
      >
        <FormRenderer
          key={previewKey}
          snapshot={snapshot}
          mode="showcase"
          forcedScheme={dark ? "dark" : "light"}
          surface={delivery}
        />
      </div>
    </div>
  );
}

/** Where the form lives: a hosted page or embedded in the owner's site. */
function DeliveryOptions({
  delivery,
  pending,
  onSelect,
}: {
  delivery: FormDelivery;
  pending: boolean;
  onSelect: (value: FormDelivery) => void;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2.5">
      <RadioGroupPrimitive.Root
        value={delivery}
        onValueChange={(next) => {
          if (isDelivery(next)) onSelect(next);
        }}
        disabled={pending}
        loop
        orientation="horizontal"
        aria-label="Where the form lives"
        className="flex shrink-0 items-center gap-1.5"
      >
        {DELIVERY_OPTIONS.map((option) => {
          const active = delivery === option.value;
          return (
            <RadioGroupPrimitive.Item
              key={option.value}
              value={option.value}
              title={option.blurb}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                OPTION_BASE,
                active
                  ? cn(OPTION_ON, "text-foreground")
                  : cn(
                      OPTION_OFF,
                      "text-muted-foreground hover:text-foreground",
                    ),
              )}
            >
              {option.label}
            </RadioGroupPrimitive.Item>
          );
        })}
      </RadioGroupPrimitive.Root>

      <span className="min-w-0 truncate text-xs text-muted-foreground">
        {delivery === "embed"
          ? "A smaller form, by design — up to 6 questions, no uploads."
          : "The template's full range, including video and uploads."}
      </span>
    </div>
  );
}

/** Template pills: the intent's designed default is listed first + suggested. */
function TemplateOptions({
  templates,
  templateId,
  recommendedId,
  pending,
  onSelect,
}: {
  templates: ReadonlyArray<(typeof FORM_TEMPLATES)[number]>;
  templateId: string;
  recommendedId: string;
  pending: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <RadioGroupPrimitive.Root
      value={templateId}
      onValueChange={onSelect}
      disabled={pending}
      loop
      orientation="horizontal"
      aria-label="Template"
      className="flex flex-wrap gap-1.5 border-t border-border/60 px-4 py-3"
    >
      {templates.map((t) => {
        const active = templateId === t.id;
        const recommended = t.id === recommendedId;
        return (
          <RadioGroupPrimitive.Item
            key={t.id}
            value={t.id}
            title={t.tagline}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              OPTION_BASE,
              active
                ? cn(OPTION_ON, "text-foreground")
                : cn(OPTION_OFF, "text-muted-foreground hover:text-foreground"),
            )}
          >
            {t.name}
            {recommended ? (
              <span className="text-xs font-normal text-muted-foreground">
                · suggested
              </span>
            ) : null}
          </RadioGroupPrimitive.Item>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}
