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
  minimal = false,
  className,
}: {
  form: V2FormSummaryDTO;
  virtualWidth?: number;
  inactive?: boolean;
  /** Row-thumbnail size: skip the hover chip, which would clip at ~96px. */
  minimal?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Not a <button>: the scaled FormPreview inside contains real <button>
          elements (rating stars…), and button-in-button is invalid HTML that
          breaks hydration. The preview content itself is aria-hidden +
          pointer-events-none, so this wrapper is the only interactive thing. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label={`Preview ${form.name}`}
        className={cn(
          "group/preview relative block cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
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
        {!minimal && (
        <span className="pointer-events-none absolute inset-0 flex items-end justify-end p-2 opacity-0 transition-opacity duration-200 group-hover/preview:opacity-100">
          {/* Hairline + tint, never a shadow: this chip sits inside a grid
              tile that scrolls with the page, and elevation there is a border
              and a tint step. Shadow belongs to floating layers. */}
          <span className="inline-flex items-center gap-1.5 rounded-md border border-foreground/15 bg-background/95 px-2 py-1 text-xs font-medium text-foreground">
            <ArrowsOutSimpleIcon className="size-3" weight="bold" aria-hidden />
            Preview
          </span>
        </span>
        )}
      </div>

      {open ? (
        <FormPreviewDialog open={open} onOpenChange={setOpen} form={form} />
      ) : null}
    </>
  );
}
