"use client";

/**
 * Content section — testimonial picker.
 *
 * Two modes: "all approved" (default, lighter UI) and "hand-picked"
 * (revealed list with checkbox + arrow-up/down reorder; full DnD deferred
 * to a later pass).
 */

import * as React from "react";
import {
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  Check as CheckIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import { Field, Section, Segmented } from "./studio-primitives";

interface ContentSectionProps {
  widgetId: string;
  /** Real approved + published responses, projected for display. */
  approved: WidgetTestimonial[];
}

export function ContentSection({ widgetId, approved }: ContentSectionProps) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setContentMode = useWidgetStudioStore((s) => s.setContentMode);
  const toggleContentPick = useWidgetStudioStore((s) => s.toggleContentPick);
  const reorderContentPicks = useWidgetStudioStore(
    (s) => s.reorderContentPicks,
  );

  if (!draft) return null;

  const mode = draft.content.mode;
  const picked = new Set(draft.content.pickedIds);

  const move = (id: string, dir: -1 | 1) => {
    const current = draft.content.pickedIds.slice();
    const idx = current.indexOf(id);
    if (idx === -1) return;
    const target = idx + dir;
    if (target < 0 || target >= current.length) return;
    [current[idx], current[target]] = [current[target], current[idx]];
    reorderContentPicks(widgetId, current);
  };

  return (
    <section className="px-5 py-5">
      <Section
        title="Content"
        description="Which testimonials this widget shows."
      >
        <Field label="Source">
          <Segmented
            ariaLabel="Testimonial source"
            options={[
              { value: "all", label: "All approved" },
              { value: "handpicked", label: "Hand-picked" },
            ]}
            value={mode}
            onChange={(v) => setContentMode(widgetId, v)}
          />
        </Field>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Widgets show responses you&apos;ve approved and published. Nothing is
          copied — approve or unpublish a response and every widget updates on
          its own.
        </p>

        {approved.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            No approved responses yet. The preview uses sample content; your
            live widget will show only real responses once they arrive.
          </div>
        )}

        {approved.length > 0 && approved.length < 3 && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            Only {approved.length} approved response
            {approved.length === 1 ? "" : "s"} so far. The preview blends in
            sample content; your live widget shows only the real ones.
          </div>
        )}

        {mode === "handpicked" && (
          <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
            {approved.length === 0 ? (
              <div className="text-[11px] text-muted-foreground">
                Hand-pick activates once you have approved responses.
              </div>
            ) : (
              approved.map((t) => {
                const isPicked = picked.has(t.id);
                const order = isPicked
                  ? draft.content.pickedIds.indexOf(t.id)
                  : -1;
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-start gap-2 rounded-md border p-2",
                      isPicked
                        ? "border-foreground/20 bg-card"
                        : "border-border bg-transparent",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleContentPick(widgetId, t.id)}
                      aria-pressed={isPicked}
                      aria-label={`${isPicked ? "Remove" : "Add"} testimonial from ${t.authorName}`}
                      className={cn(
                        "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded border",
                        isPicked
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background hover:border-foreground/40",
                      )}
                    >
                      {isPicked && (
                        <CheckIcon
                          className="size-2.5"
                          weight="bold"
                          aria-hidden
                        />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                        <span className="truncate">{t.authorName}</span>
                        {isPicked && order >= 0 && (
                          <span className="font-mono text-[9px] text-muted-foreground">
                            #{order + 1}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">
                        {t.content}
                      </p>
                    </div>
                    {isPicked && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => move(t.id, -1)}
                          disabled={order === 0}
                          aria-label="Move up"
                          className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUpIcon
                            className="size-2.5"
                            weight="bold"
                            aria-hidden
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(t.id, 1)}
                          disabled={
                            order === draft.content.pickedIds.length - 1
                          }
                          aria-label="Move down"
                          className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDownIcon
                            className="size-2.5"
                            weight="bold"
                            aria-hidden
                          />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {mode === "handpicked" && draft.content.pickedIds.length > 0 && (
          <div className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {draft.content.pickedIds.length} picked · order shown above
          </div>
        )}
      </Section>
    </section>
  );
}
