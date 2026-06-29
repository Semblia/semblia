"use client";

/**
 * FormPreviewLauncher — the clickable preview thumbnail shared by FormCard and
 * FormRow. Renders the real scaled FormPreview and owns the full-page preview
 * dialog + its open state, so the list/card components stay lean.
 */

import * as React from "react";
import { ArrowsOutSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { V2FormSummaryDTO } from "@workspace/types";
import { FormPreview } from "./form-preview";
import { FormPreviewDialog } from "./form-preview-dialog";

export function FormPreviewLauncher({
  form,
  virtualWidth,
  inactive = false,
  className,
}: {
  form: V2FormSummaryDTO;
  virtualWidth?: number;
  inactive?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Preview ${form.name}`}
        className={cn(
          "group/preview relative block overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
          className,
        )}
      >
        <FormPreview
          draft={form.draft}
          intent={form.intent}
          formId={form.id}
          projectId={form.projectId}
          slug={form.slug}
          virtualWidth={virtualWidth}
          inactive={inactive}
          className="absolute inset-0"
        />
        <span className="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-foreground/15 via-foreground/0 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover/preview:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-foreground/15 bg-background/95 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm">
            <ArrowsOutSimpleIcon className="size-3" weight="bold" aria-hidden />
            Preview
          </span>
        </span>
      </button>

      {open ? (
        <FormPreviewDialog open={open} onOpenChange={setOpen} form={form} />
      ) : null}
    </>
  );
}
