"use client";

/**
 * FormPreview — a REAL, scaled-down render of the actual form. It runs the same
 * forms-core compile + forms-renderer path the hosted page uses, then scales the
 * result to fit whatever frame it's dropped into and clips the overflow. No
 * synthetic mock, no forced gradients: what you see is the true top of the form
 * (logo, title, first fields, submit), at correct proportions.
 *
 * It is non-interactive (pointer-events: none) and overflow-clipped, so it can
 * never grow a scrollbar of its own or shift its frame.
 *
 * ponytail: mounts one live renderer per visible form — fine for normal list
 * sizes; virtualize the list if a project ever holds hundreds of forms.
 */

import * as React from "react";
import { FormRenderer } from "@workspace/forms-renderer";
import type { V2FormIntent } from "@workspace/types";
import { cn } from "@/lib/utils";
import { parseDraftDoc, compilePreviewSnapshot } from "@/lib/forms/draft";
import { useContainerWidth } from "@/hooks/use-container-width";

export interface FormPreviewProps {
  draft: Record<string, unknown>;
  intent: V2FormIntent;
  formId: string;
  projectId: string;
  slug: string | null;
  /**
   * Virtual width the form is laid out at before it's scaled to fit the frame.
   * Smaller = more zoomed-in (more legible in narrow frames). Use a mobile-ish
   * width for tight list panels, a desktop width for wide cards.
   */
  virtualWidth?: number;
  inactive?: boolean;
  className?: string;
}

export const FormPreview = React.memo(function FormPreview({
  draft,
  intent,
  formId,
  projectId,
  slug,
  virtualWidth = 720,
  inactive = false,
  className,
}: FormPreviewProps) {
  const [ref, width] = useContainerWidth<HTMLDivElement>();

  const snapshot = React.useMemo(() => {
    try {
      return compilePreviewSnapshot(parseDraftDoc(draft, intent), {
        formId,
        projectId,
        slug,
      });
    } catch {
      return null;
    }
  }, [draft, intent, formId, projectId, slug]);

  const scale = width > 0 ? width / virtualWidth : 0;
  const scheme = snapshot?.design.mode === "dark" ? "dark" : "light";
  const pageBg = scheme === "dark" ? "#0a0a0b" : "#f4f4f5";

  return (
    <div
      ref={ref}
      className={cn(
        "relative h-full w-full overflow-hidden",
        inactive && "opacity-50 grayscale",
        className,
      )}
      style={{ background: pageBg }}
      role="img"
      aria-label="Form preview"
    >
      {snapshot && scale > 0 ? (
        <div
          aria-hidden
          inert
          className="pointer-events-none absolute left-0 top-0 origin-top-left select-none"
          style={{ width: virtualWidth, transform: `scale(${scale})` }}
        >
          <FormRenderer
            snapshot={snapshot}
            mode="preview"
            forcedScheme={scheme}
          />
        </div>
      ) : null}
    </div>
  );
});
