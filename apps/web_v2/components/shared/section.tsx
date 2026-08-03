"use client";

/**
 * Section — grouping without a container.
 *
 * The cards-on-cards defect comes from one habit: needing to group things, and
 * reaching for `rounded-xl border bg-card` to do it. There were 152 hand-rolled
 * containers in this app for exactly that reason.
 *
 * A bordered surface is sanctioned in three cases only — a settings fieldset
 * (`SettingsSection`), a grid tile where the tile *is* the entity, and a
 * floating layer (dialog / popover / sheet). Everything else groups with a
 * heading and a hairline, sitting directly on the page background. That is what
 * this is.
 *
 * Grouping ladder, in order of preference — never skip ahead to a second card:
 *   stack gap → section heading → hairline divider → one tint step → inset
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionProps {
  /** Section heading. Omit for an unlabelled grouping that only needs a rule. */
  title?: React.ReactNode;
  /**
   * Supporting sentence. This is where explanatory prose lives — a *page*
   * header carries identity and actions only, never a paragraph of copy.
   */
  description?: React.ReactNode;
  /** Right-aligned controls on the heading row. */
  actions?: React.ReactNode;
  /**
   * Inline state beside the title — a count, a status, a freshness stamp.
   * Rendered one type step down, so it reads as metadata, not a second title.
   */
  meta?: React.ReactNode;
  /** Draw the hairline above the heading, separating it from the section before. */
  divided?: boolean;
  /** Heading level. Defaults to h2; nest to h3 inside an already-headed region. */
  as?: "h2" | "h3";
  /** Vertical rhythm between the heading and the body. */
  density?: "default" | "tight";
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export function Section({
  title,
  description,
  actions,
  meta,
  divided = false,
  as: Heading = "h2",
  density = "default",
  id,
  className,
  children,
}: SectionProps) {
  const headingId = id ? `${id}-heading` : undefined;
  const hasHeader = Boolean(title || description || actions);

  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn(
        divided && "border-t border-border pt-6",
        density === "tight" ? "space-y-3" : "space-y-4",
        className,
      )}
    >
      {hasHeader && (
        <SectionHeader
          title={title}
          description={description}
          actions={actions}
          meta={meta}
          headingId={headingId}
          as={Heading}
        />
      )}
      {children}
    </section>
  );
}

/**
 * SectionHeader — the heading row: title with inline meta, description under,
 * actions right-aligned.
 */
function SectionHeader({
  title,
  description,
  actions,
  meta,
  headingId,
  as: Heading,
}: Pick<SectionProps, "title" | "description" | "actions" | "meta"> & {
  headingId?: string;
  as: NonNullable<SectionProps["as"]>;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0 space-y-1">
        {title && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Heading
              id={headingId}
              className={cn(
                "min-w-0 font-semibold tracking-tight text-foreground",
                Heading === "h2" ? "text-sm" : "text-xs",
              )}
            >
              {title}
            </Heading>
            {meta && (
              <span className="text-xs font-normal text-muted-foreground">
                {meta}
              </span>
            )}
          </div>
        )}
        {description && (
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/**
 * SectionStack — vertical rhythm between sibling sections on a page.
 *
 * Sections separate by space, not by borders on each one. `divided` on a child
 * Section adds the rule where a category genuinely changes.
 */
export function SectionStack({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("space-y-8", className)}>{children}</div>;
}

/**
 * DefinitionList — a record's key/value pairs.
 *
 * The correct answer to "show this object's fields", replacing both the
 * two-column `<table>` (banned: nothing is compared down a column) and the
 * grid of tiny bordered cards. Absent values must arrive already formatted as
 * an em dash by `orDash` — this renders exactly what it is given.
 */
export function DefinitionList({
  items,
  columns = 1,
  className,
}: {
  items: Array<{
    term: React.ReactNode;
    value: React.ReactNode;
    /** Full-width row inside a multi-column list (long URLs, snippets). */
    wide?: boolean;
  }>;
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-8 gap-y-0",
        columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "flex items-baseline justify-between gap-4 border-b border-border/60 py-2.5 last:border-b-0",
            item.wide && columns === 2 && "sm:col-span-2",
          )}
        >
          <dt className="shrink-0 text-xs text-muted-foreground">
            {item.term}
          </dt>
          <dd className="min-w-0 text-right text-xs font-medium tabular-nums text-foreground">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
