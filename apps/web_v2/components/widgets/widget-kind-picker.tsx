"use client";

/**
 * WidgetKindPicker — two-step modal for creating a new widget.
 *
 * Step 1: Pick kind (Embed vs Wall of Love).
 * Step 2: Pick a template — each is a self-contained display design (layout,
 *         card personality, theme recipe), previewed live through the real
 *         derivation engine with the project's brand color.
 */

import * as React from "react";
import {
  Globe as GlobeIcon,
  Code as CodeIcon,
  CaretLeft as CaretLeftIcon,
  CaretRight as CaretRightIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WIDGET_TEMPLATES } from "@workspace/widgets-core/schema";
import type { WidgetKind } from "@/lib/widgets/widget-types";
import { WidgetThemeSwatch } from "./studio/widget-theme-swatch";

interface WidgetKindPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (opts: { kind: WidgetKind; templateId: string }) => void;
  /** Optional initial kind to skip directly to step 2. */
  initialKind?: WidgetKind | null;
  /** Seeds the "Your brand" style chip. */
  projectBrandColor?: string | null;
}

type Step = "kind" | "template";

export function WidgetKindPicker({
  open,
  onOpenChange,
  onCreate,
  initialKind,
  projectBrandColor,
}: WidgetKindPickerProps) {
  const [step, setStep] = React.useState<Step>(
    initialKind === "embed" ? "template" : "kind",
  );
  const [kind, setKind] = React.useState<WidgetKind | null>(
    initialKind ?? null,
  );
  const [templateId, setTemplateId] = React.useState("marquee");

  // Reset on close.
  React.useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => {
        setStep(initialKind === "embed" ? "template" : "kind");
        setKind(initialKind ?? null);
        setTemplateId("marquee");
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [open, initialKind]);

  // Sync if initialKind changes while open.
  React.useEffect(() => {
    if (!open) return;
    if (initialKind === "embed") {
      setKind("embed");
      setStep("template");
    } else if (initialKind === "wall") {
      setKind("wall");
      setStep("kind");
    }
  }, [open, initialKind]);

  const handleKindPick = (k: WidgetKind) => {
    setKind(k);
    setTemplateId(k === "wall" ? "editorial" : "marquee");
    setStep("template");
  };

  const handleCreate = () => {
    if (!kind) return;
    onCreate({ kind, templateId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] gap-0 p-0 sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-base font-semibold tracking-tight">
            {step === "kind" ? "Create a widget" : "Pick a template"}
          </DialogTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {step === "kind"
              ? "Both kinds pull from your approved testimonials."
              : "Each template is its own design — switchable later without losing content."}
          </p>
        </DialogHeader>

        {step === "kind" ? (
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            <KindOption
              kind="wall"
              title="Wall of Love"
              hint="Standalone hosted page"
              Icon={GlobeIcon}
              accent="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              onPick={handleKindPick}
            />
            <KindOption
              kind="embed"
              title="Embed widget"
              hint="Drop into your site"
              Icon={CodeIcon}
              accent="bg-foreground/10 text-foreground"
              onPick={handleKindPick}
            />
          </div>
        ) : (
          <div className="space-y-3 p-5">
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Template"
            >
              {WIDGET_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={templateId === t.id}
                  onClick={() => setTemplateId(t.id)}
                  title={t.tagline}
                  className={cn(
                    "group flex flex-col items-stretch gap-2 rounded-lg border p-2.5 text-left",
                    "transition-[border-color,background] duration-150",
                    templateId === t.id
                      ? "border-foreground bg-card"
                      : "border-border hover:border-muted-foreground/40 hover:bg-card",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  )}
                >
                  <div className="aspect-[5/3] w-full overflow-hidden rounded-md bg-muted/40">
                    <WidgetThemeSwatch
                      inputs={t.themeInputs(
                        projectBrandColor ?? "#4338ca",
                        "light",
                        {},
                      )}
                      scale={7}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[12px] font-semibold text-foreground">
                      {t.name}
                    </div>
                    <p className="text-[10.5px] leading-snug text-muted-foreground">
                      {t.tagline}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (initialKind === "embed") {
                    onOpenChange(false);
                  } else {
                    setStep("kind");
                  }
                }}
                className="gap-1 text-xs text-muted-foreground"
              >
                <CaretLeftIcon className="size-3" weight="bold" aria-hidden />
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                className="gap-1 text-xs"
              >
                Create widget
                <CaretRightIcon className="size-3" weight="bold" aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

function KindOption({
  kind,
  title,
  hint,
  Icon,
  accent,
  onPick,
}: {
  kind: WidgetKind;
  title: string;
  hint: string;
  Icon: PhosphorIcon;
  accent: string;
  onPick: (kind: WidgetKind) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(kind)}
      className={cn(
        "group relative flex flex-col items-stretch gap-3 rounded-xl border border-border bg-card p-4 text-left",
        "transition-[border-color,transform] duration-150 ease-out",
        "hover:-translate-y-px hover:border-foreground/25",
        "active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-md",
          accent,
        )}
      >
        <Icon className="size-4" weight="bold" />
      </span>
      <div>
        <div className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {hint}
        </p>
      </div>
    </button>
  );
}
