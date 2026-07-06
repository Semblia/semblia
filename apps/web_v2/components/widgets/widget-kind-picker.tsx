"use client";

/**
 * WidgetKindPicker — two-step modal for creating a new widget.
 *
 * Step 1: Pick kind (Embed vs Wall of Love).
 * Step 2: Configure the start — layout (embed only; walls are rigid by
 *         design) plus a starting style from the curated preset row, so a new
 *         widget opens already looking like something.
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
import {
  LAYOUT_GLYPHS,
  type WidgetKind,
  type WidgetLayout,
} from "@/lib/widgets/widget-types";
import { STYLE_PRESET_LIST } from "@/lib/widgets/widget-presets";
import { LayoutGlyph } from "./layout-glyph";

interface WidgetKindPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (opts: {
    kind: WidgetKind;
    layout?: WidgetLayout;
    /** Starting style preset id; "brand" keeps the project-brand default. */
    presetId?: string;
  }) => void;
  /** Optional initial kind to skip directly to step 2. */
  initialKind?: WidgetKind | null;
  /** Seeds the "Your brand" style chip. */
  projectBrandColor?: string | null;
}

type Step = "kind" | "layout";

export function WidgetKindPicker({
  open,
  onOpenChange,
  onCreate,
  initialKind,
  projectBrandColor,
}: WidgetKindPickerProps) {
  const [step, setStep] = React.useState<Step>(
    initialKind === "embed" ? "layout" : "kind",
  );
  const [kind, setKind] = React.useState<WidgetKind | null>(
    initialKind ?? null,
  );
  const [layout, setLayout] = React.useState<WidgetLayout>("carousel");
  const [presetId, setPresetId] = React.useState("brand");

  // Reset on close.
  React.useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => {
        setStep(initialKind === "embed" ? "layout" : "kind");
        setKind(initialKind ?? null);
        setLayout("carousel");
        setPresetId("brand");
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [open, initialKind]);

  // Sync if initialKind changes while open.
  React.useEffect(() => {
    if (!open) return;
    if (initialKind === "embed") {
      setKind("embed");
      setStep("layout");
    } else if (initialKind === "wall") {
      setKind("wall");
      setStep("kind");
    }
  }, [open, initialKind]);

  const handleKindPick = (k: WidgetKind) => {
    setKind(k);
    setStep("layout");
  };

  const handleCreate = () => {
    if (!kind) return;
    onCreate(kind === "wall" ? { kind, presetId } : { kind, layout, presetId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] gap-0 p-0 sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-base font-semibold tracking-tight">
            {step === "kind"
              ? "Create a widget"
              : kind === "wall"
                ? "Pick a starting style"
                : "Pick a starting layout"}
          </DialogTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {step === "kind"
              ? "Both kinds pull from your approved testimonials."
              : kind === "wall"
                ? "Walls keep a fixed layout — the style sets their voice."
                : "Switchable later. The layout sets the rhythm of your widget."}
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
            {kind === "embed" && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LAYOUT_GLYPHS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setLayout(g.id)}
                    aria-pressed={layout === g.id}
                    className={cn(
                      "group flex flex-col items-stretch gap-2 rounded-lg border p-2.5 text-left",
                      "transition-[border-color,background] duration-150",
                      layout === g.id
                        ? "border-foreground bg-card"
                        : "border-border hover:border-muted-foreground/40 hover:bg-card",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    )}
                  >
                    <div className="aspect-[5/3] w-full overflow-hidden rounded-md bg-muted/40">
                      <LayoutGlyph layout={g.id} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[12px] font-semibold text-foreground">
                        {g.label}
                      </div>
                      <p className="text-[10.5px] leading-snug text-muted-foreground">
                        {g.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div
              className="space-y-1.5"
              role="radiogroup"
              aria-label="Starting style"
            >
              <p className="text-xs font-medium text-foreground">
                Starting style
              </p>
              <div className="flex flex-wrap gap-1.5">
                <StyleChip
                  active={presetId === "brand"}
                  label="Your brand"
                  title="Project colour, balanced defaults"
                  color={projectBrandColor ?? "#6366f1"}
                  onPick={() => setPresetId("brand")}
                />
                {STYLE_PRESET_LIST.map((preset) => (
                  <StyleChip
                    key={preset.id}
                    active={presetId === preset.id}
                    label={preset.label}
                    title={preset.sub}
                    color={preset.theme.brandColor}
                    onPick={() => setPresetId(preset.id)}
                  />
                ))}
              </div>
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

function StyleChip({
  active,
  label,
  title,
  color,
  onPick,
}: {
  active: boolean;
  label: string;
  title: string;
  color: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      title={title}
      onClick={onPick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "border-brand/50 bg-brand/10 text-foreground"
          : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
      )}
    >
      <span
        aria-hidden
        className="size-2.5 rounded-full ring-1 ring-inset ring-black/10"
        style={{ background: color }}
      />
      {label}
    </button>
  );
}

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
