"use client";

/**
 * FormPreview — a REAL, scaled-down render of the actual form. It runs the same
 * forms-core compile + forms-renderer path the hosted page uses, then shrinks
 * the result into whatever frame it's dropped into. No synthetic mock, no
 * forced gradients.
 *
 * **The whole page, at the frame's shape — never a crop.** The old preview laid
 * the form out at a fixed logical width, scaled to match the frame's width, and
 * let the rest fall off the bottom edge. In a 144×110 list slot that showed the
 * top-left corner of a split-pane form: a giant headline beside a card sliced
 * through the middle of its own labels. Recognisable as "part of a webpage",
 * not as *this* form.
 *
 * Instead the page is laid out in a logical viewport whose aspect ratio matches
 * the frame's, so scaling by width alone lands the whole composition exactly
 * inside it. A 144×110 slot renders the form as if photographed in a 1180×901
 * browser window — the real desktop composition, its brand pane, its colour and
 * its proportions, just small. That is what a thumbnail is for.
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
import { useContainerSize } from "@/hooks/use-container-width";

/**
 * Logical width the page is composed at before being shrunk to the frame.
 *
 * A real desktop width, deliberately far wider than any frame it lands in:
 * below the templates' 860px breakpoint the hosted layouts collapse to their
 * stacked small-screen form, and a thumbnail that silently shows the phone
 * layout of a desktop page is the same lie as a crop.
 */
const PAGE_WIDTH = 1180;

/** Guard rails on the derived viewport height, as a ratio of the width. */
const MIN_PAGE_RATIO = 0.4;
const MAX_PAGE_RATIO = 2.2;

export interface FormPreviewProps {
  draft: Record<string, unknown>;
  intent: V2FormIntent;
  formId: string;
  projectId: string;
  slug: string | null;
  /**
   * Logical page width the form composes at before it is shrunk to the frame.
   * Lower it only for a frame that is genuinely phone-shaped; a wide frame
   * wants the desktop composition.
   */
  pageWidth?: number;
  inactive?: boolean;
  className?: string;
}

export const FormPreview = React.memo(function FormPreview({
  draft,
  intent,
  formId,
  projectId,
  slug,
  pageWidth = PAGE_WIDTH,
  inactive = false,
  className,
}: FormPreviewProps) {
  const [ref, frame] = useContainerSize<HTMLDivElement>();

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

  const { scale, pageHeight, offsetX, offsetY } = previewGeometry(
    frame,
    pageWidth,
  );

  const scheme = snapshot?.template.appearance === "dark" ? "dark" : "light";
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
          style={
            {
              width: pageWidth,
              height: pageHeight,
              overflow: "hidden",
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
              // Full-page templates size their panes against this rather than
              // the real browser height, so it is what makes the shrunk render
              // a photograph of a window and not a slice of an endless page.
              "--tf-viewport": `${Math.round(pageHeight)}px`,
            } as React.CSSProperties
          }
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

export interface PreviewGeometry {
  /** Factor the logical page is drawn at; 0 until the frame has been measured. */
  scale: number;
  /** Height of the logical window the page composes in. */
  pageHeight: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Where the page sits inside the frame.
 *
 * Normally the logical window *is* the frame's shape, so scaling by width
 * alone fits both axes and the offsets are zero. The clamp is for frames
 * flatter or taller than any real browser window: there the window can no
 * longer match the frame, and fitting by width would crop the page again —
 * the exact defect this component exists to fix. So it contains instead, and
 * centres what's left over.
 */
export function previewGeometry(
  frame: { width: number; height: number },
  pageWidth: number,
): PreviewGeometry {
  if (frame.width <= 0 || frame.height <= 0) {
    return { scale: 0, pageHeight: pageWidth, offsetX: 0, offsetY: 0 };
  }
  const pageHeight =
    pageWidth *
    clamp(frame.height / frame.width, MIN_PAGE_RATIO, MAX_PAGE_RATIO);
  const scale = Math.min(frame.width / pageWidth, frame.height / pageHeight);
  return {
    scale,
    pageHeight,
    offsetX: Math.max(0, (frame.width - pageWidth * scale) / 2),
    offsetY: Math.max(0, (frame.height - pageHeight * scale) / 2),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
