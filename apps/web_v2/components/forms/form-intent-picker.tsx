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
 */

import * as React from "react";
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
  /** Brand fact: seeds the preview + created form with the project's color. */
  projectBrandColor?: string | null;
}

const PREVIEW_STAGE_WIDTH = 640;
const PREVIEW_SCALE = 0.62;

export function FormIntentPicker({
  open,
  onOpenChange,
  onCreate,
  pending = false,
  projectBrandColor,
}: FormIntentPickerProps) {
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

  const dark = snapshot.template.appearance === "dark";

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
          <p className="mt-1 text-xs text-muted-foreground">
            Pick what you&apos;re collecting and a template — the preview is the
            real form. Words and questions stay editable in the studio.
          </p>
        </DialogHeader>

        <div className="grid sm:grid-cols-[264px_1fr]">
          {/* Bases */}
          <div
            className="flex flex-col gap-1.5 p-4 sm:border-r sm:border-border/60"
            role="radiogroup"
            aria-label="Form base"
          >
            {INTENT_ORDER.map((value) => {
              const meta = intentMeta(value);
              const Icon = meta.icon;
              const active = intent === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={pending}
                  onClick={() => setIntent(value)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    "disabled:pointer-events-none disabled:opacity-60",
                    active
                      ? "border-brand/60 bg-brand/5"
                      : "border-transparent hover:border-border hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md",
                      meta.accent,
                    )}
                  >
                    <Icon className="size-4" weight="bold" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold tracking-tight text-foreground">
                      {meta.label}
                    </span>
                    <span className="mt-px block text-[11px] leading-snug text-muted-foreground">
                      {meta.blurb}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live preview + templates */}
          <div className="flex min-w-0 flex-col">
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
                  key={`${intent}:${templateId}:${delivery}`}
                  snapshot={snapshot}
                  mode="showcase"
                  forcedScheme={dark ? "dark" : "light"}
                  surface={delivery}
                />
              </div>
              {/* Bottom fade so the crop reads intentional */}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-14"
                style={{
                  background: `linear-gradient(to bottom, transparent, ${
                    dark ? "#0a0a0b" : "#f4f4f5"
                  })`,
                }}
              />
            </div>

            <div
              className="flex items-center gap-2 border-t border-border/60 px-4 py-2.5"
              role="radiogroup"
              aria-label="Where the form lives"
            >
              {(
                [
                  {
                    value: "hosted" as const,
                    label: "Hosted page",
                    blurb: "A full page at your form link",
                  },
                  {
                    value: "embed" as const,
                    label: "Embedded",
                    blurb: "Lives inside your own site",
                  },
                ] as const
              ).map((option) => {
                const active = delivery === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={pending}
                    title={option.blurb}
                    onClick={() => setDelivery(option.value)}
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      "disabled:pointer-events-none disabled:opacity-60",
                      active
                        ? "border-brand/50 bg-brand/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
              <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                {delivery === "embed"
                  ? "A smaller form, by design — up to 6 questions, no uploads."
                  : "The template's full range, including video and uploads."}
              </span>
            </div>

            <div
              className="flex flex-wrap gap-1.5 border-t border-border/60 px-4 py-3"
              role="radiogroup"
              aria-label="Template"
            >
              {orderedTemplates.map((t) => {
                const active = templateId === t.id;
                const recommended = t.id === recommendedId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={pending}
                    title={t.tagline}
                    onClick={() => setTemplateId(t.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      "disabled:pointer-events-none disabled:opacity-60",
                      active
                        ? "border-brand/50 bg-brand/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                    )}
                  >
                    {t.name}
                    {recommended ? (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        · suggested
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-6 py-3.5">
          <p className="text-[11px] text-muted-foreground">
            {intentMeta(intent).label} ·{" "}
            {FORM_TEMPLATES.find((t) => t.id === templateId)?.name}
          </p>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => onCreate(intent, templateId, delivery)}
          >
            {pending ? "Creating…" : "Create form"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
