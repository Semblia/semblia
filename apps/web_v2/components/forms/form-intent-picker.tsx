"use client";

/**
 * FormIntentPicker — the create-a-form gallery.
 *
 * Base × look: pick what you're collecting (the intent seeds fields, copy,
 * layout, flow, consent) and how it should start looking (a curated design
 * seed, project-brand first). The right pane is a real, scaled FormRenderer of
 * that exact combination — the same compiler and renderer the hosted page
 * uses — so what you create is literally what respondents will see.
 */

import * as React from "react";
import type { V2FormIntent } from "@workspace/types";
import { createFormTemplate } from "@workspace/forms-core";
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
import {
  FORM_LOOKS,
  lookDesign,
  lookSwatchColor,
  type FormLook,
} from "@/lib/forms/looks";
import { compilePreviewSnapshot } from "@/lib/forms/draft";

interface FormIntentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (intent: V2FormIntent, look: FormLook) => void;
  /** Disables the options while a create request is in flight. */
  pending?: boolean;
  /** Seeds the "Your brand" look. */
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
  const [intent, setIntent] = React.useState<V2FormIntent>("TESTIMONIAL");
  const [lookId, setLookId] = React.useState<string>("brand");
  const look = FORM_LOOKS.find((l) => l.id === lookId) ?? FORM_LOOKS[0];

  const snapshot = React.useMemo(() => {
    const template = createFormTemplate(intent);
    const doc = {
      ...template,
      design: {
        ...template.design,
        ...lookDesign(look, projectBrandColor),
      },
    };
    return compilePreviewSnapshot(doc, {
      formId: "new",
      projectId: "new",
      slug: null,
    });
  }, [intent, look, projectBrandColor]);

  const dark = snapshot.design.mode === "dark";

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
            Pick a base and a starting look — the preview is the real form.
            Everything stays editable in the studio.
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

          {/* Live preview + looks */}
          <div className="flex min-w-0 flex-col">
            <div
              aria-hidden
              className="relative hidden h-[280px] overflow-hidden sm:block"
              style={{ background: dark ? "#0a0a0b" : "#f4f4f5" }}
            >
              <div
                className="pointer-events-none absolute left-1/2 top-5 origin-top select-none"
                style={{
                  width: PREVIEW_STAGE_WIDTH,
                  transform: `translateX(-50%) scale(${PREVIEW_SCALE})`,
                }}
              >
                <div
                  className={cn(
                    "mx-auto w-full max-w-xl overflow-hidden rounded-xl shadow-sm",
                    dark ? "border border-white/10" : "border border-black/5",
                  )}
                >
                  <FormRenderer
                    key={`${intent}:${lookId}`}
                    snapshot={snapshot}
                    mode="preview"
                    forcedScheme={dark ? "dark" : "light"}
                  />
                </div>
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
              className="flex flex-wrap gap-1.5 border-t border-border/60 px-4 py-3"
              role="radiogroup"
              aria-label="Starting look"
            >
              {FORM_LOOKS.map((l) => {
                const active = lookId === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={pending}
                    title={l.sub}
                    onClick={() => setLookId(l.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      "disabled:pointer-events-none disabled:opacity-60",
                      active
                        ? "border-brand/50 bg-brand/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full ring-1 ring-inset ring-black/10"
                      style={{
                        background: lookSwatchColor(l, projectBrandColor),
                      }}
                    />
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-6 py-3.5">
          <p className="text-[11px] text-muted-foreground">
            {intentMeta(intent).label} · {look.label}
          </p>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => onCreate(intent, look)}
          >
            {pending ? "Creating…" : "Create form"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
