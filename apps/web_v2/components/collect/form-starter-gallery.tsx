"use client";

/**
 * FormStarterGallery — the form-creation chooser.
 *
 * Presentational grid of curated starters (each a real, validated
 * `FormDefinitionDoc`) plus a "Blank form" escape hatch. `onSelect(starter)`
 * creates from that starter's config; `onSelect(null)` creates a blank/default
 * form (the prior behavior). Thumbnails reuse `FormCardPreview`, keyed to each
 * starter's layout preset.
 */

import * as React from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { FORM_STARTERS, type FormStarter } from "@/lib/collect/form-starters";
import { FormCardPreview } from "./form-card-preview";

interface FormStarterGalleryProps {
  onSelect: (starter: FormStarter | null) => void;
  busy?: boolean;
  className?: string;
}

export function FormStarterGallery({
  onSelect,
  busy,
  className,
}: FormStarterGalleryProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
      role="list"
      aria-label="Form starters"
    >
      {FORM_STARTERS.map((starter) => (
        <div key={starter.id} role="listitem">
          <StarterCard
            starter={starter}
            disabled={busy}
            onClick={() => onSelect(starter)}
          />
        </div>
      ))}
      <div role="listitem">
        <BlankCard disabled={busy} onClick={() => onSelect(null)} />
      </div>
    </div>
  );
}

function StarterCard({
  starter,
  disabled,
  onClick,
}: {
  starter: FormStarter;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left",
        "transition-[border-color,transform] duration-150 ease-out",
        "hover:-translate-y-px hover:border-foreground/25",
        "active:translate-y-0 disabled:pointer-events-none disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
      )}
    >
      <div className="aspect-[16/10] w-full border-b border-border/60">
        <FormCardPreview preset={starter.layout} />
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold tracking-tight text-foreground">
            {starter.name}
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground/70">
            {starter.layout}
          </span>
        </div>
        <p className="text-[11.5px] leading-snug text-muted-foreground">
          {starter.description}
        </p>
      </div>
    </button>
  );
}

function BlankCard({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-transparent px-3.5 py-6 text-center",
        "transition-[border-color,background] duration-150",
        "hover:border-foreground/30 hover:bg-card",
        "disabled:pointer-events-none disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
      )}
      aria-label="Blank form — start from scratch"
    >
      <span className="flex size-8 items-center justify-center rounded-md bg-foreground/10 text-foreground">
        <PlusIcon className="size-4" weight="bold" aria-hidden />
      </span>
      <span className="text-[13px] font-semibold tracking-tight text-foreground">
        Blank form
      </span>
      <span className="text-[11.5px] leading-snug text-muted-foreground">
        Start from scratch and add your own questions.
      </span>
    </button>
  );
}
