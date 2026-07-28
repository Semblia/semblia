"use client";

/**
 * One key, one page.
 *
 * The API-key detail screen carried five hand-rolled bordered surfaces — four
 * KPI tiles, a chart card, a preset card, a scope card, a sticky save bar, and a
 * danger-zone box — several of them nested inside one another. The agent detail
 * screen carried its own four. None of them were a settings fieldset, a grid
 * tile, or a floating layer, so none of them were sanctioned containers.
 *
 * They are all gone. Facts sit on the page background, grouped by `Section` and
 * separated by hairlines; the numbers are `MetricValue`s that link to the rows
 * behind them; the record's fields are a `DefinitionList` instead of a
 * two-column table of tiny cards.
 *
 * The tab strip went with them: with the panels unwrapped the whole record fits
 * one scroll, which also means every metric's backing rows are on the same page
 * as the metric — no hidden destination, nothing to restore from the URL.
 */

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataState,
  DefinitionList,
  ErrorState,
  HeaderSep,
  MetricRow,
  MetricValue,
  PageBody,
  PageHeader,
  type DataStateResult,
} from "@/components/shared";
import { fmtCount, fmtDateTime, timeAgo } from "@/lib/format";
import {
  expiryDisplay,
  lastUsedDisplay,
  maskedKey,
  quotaHint,
  type DescribedKey,
} from "./key-model";

export const ACTIVITY_ANCHOR = "key-activity";
export const SCOPES_ANCHOR = "key-scopes";

// ── Layout ───────────────────────────────────────────────────────────────────

export interface KeyDetailLayoutProps {
  row: DescribedKey | null;
  state: DataStateResult;
  /** Lowercase noun phrase for error copy: "this API key". */
  resource: string;
  /** Header title before the record is known. */
  fallbackTitle: string;
  backHref: string;
  backLabel: string;
  /** Rotate / revoke cluster. Withheld until the record is on screen. */
  actions?: React.ReactNode;
  /** Sticky save bar for the editable part of the record. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function KeyDetailLayout({
  row,
  state,
  resource,
  fallbackTitle,
  backHref,
  backLabel,
  actions,
  footer,
  children,
}: KeyDetailLayoutProps) {
  const loading = state.kind === "loading-initial";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={
          row ? (
            row.entry.name
          ) : loading ? (
            <Skeleton className="animate-shimmer h-5 w-44" />
          ) : (
            fallbackTitle
          )
        }
        description={
          row ? (
            <>
              <span className="font-mono">{maskedKey(row.entry)}</span>
              <HeaderSep />
              {row.state.status.label}
            </>
          ) : undefined
        }
        actions={row ? actions : undefined}
      />

      <PageBody
        padding="default"
        withFooter={footer != null}
        className="min-h-0 overflow-y-auto"
      >
        <DataState
          state={state}
          resource={resource}
          align="start"
          skeleton={<KeyDetailSkeleton />}
          // The record query succeeded and this id was not in it. That is a
          // not-found, and it never offers a retry that must fail again.
          empty={
            <ErrorState
              resource={resource}
              variant="not-found"
              align="start"
              action={
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link href={backHref}>{backLabel}</Link>
                </Button>
              }
            />
          }
        >
          {children}
        </DataState>

        {row && footer}
      </PageBody>
    </div>
  );
}

/** Matches the real layout's bands so the swap causes no shift. */
function KeyDetailSkeleton() {
  return (
    <div aria-hidden className="space-y-8">
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="space-y-2 bg-background px-4 py-3.5 first:pl-0 sm:px-5"
          >
            <Skeleton className="animate-shimmer h-3 w-20" />
            <Skeleton className="animate-shimmer h-5 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="animate-shimmer h-44 w-full rounded-lg" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="animate-shimmer h-3.5 w-full" />
        ))}
      </div>
    </div>
  );
}

// ── Facts ────────────────────────────────────────────────────────────────────

export interface KeyFactsProps {
  row: DescribedKey;
  /** Kind-specific rows shown first: key type, or the preset it was cut from. */
  extra?: Array<{
    term: React.ReactNode;
    value: React.ReactNode;
    wide?: boolean;
  }>;
}

/**
 * Three numbers and the record's fields.
 *
 * `usageCount` is rendered as a plain `0` when it is genuinely zero, and the
 * quota reads as a hint under it rather than as a second number competing with
 * the first. "Last used" says "Never used" when nothing has ever authenticated.
 */
export function KeyFacts({ row, extra = [] }: KeyFactsProps) {
  const { entry, state } = row;
  const lastUsed = lastUsedDisplay(entry);
  const expiry = expiryDisplay(entry, state);

  return (
    <div className="space-y-6">
      <MetricRow columns={3}>
        <MetricValue
          label="Requests"
          value={entry.usageCount}
          hint={quotaHint(entry)}
          href={`#${ACTIVITY_ANCHOR}`}
        />
        <MetricValue
          label="Scopes"
          value={entry.scopes.length}
          href={`#${SCOPES_ANCHOR}`}
        />
        {/* No `href`: there is no set of rows behind a configured ceiling. */}
        <MetricValue
          label="Rate limit"
          value={entry.rateLimit}
          unit="req/min"
        />
      </MetricRow>

      <DefinitionList
        columns={2}
        items={[
          ...extra,
          {
            term: "Created",
            value: (
              <span title={fmtDateTime(entry.createdAt)}>
                {timeAgo(entry.createdAt)}
              </span>
            ),
          },
          {
            term: "Last used",
            value: <span title={lastUsed.title}>{lastUsed.text}</span>,
          },
          {
            term: "Expiry",
            value: <span title={expiry.title}>{expiry.text}</span>,
          },
          {
            term: "Request limit",
            value:
              entry.usageLimit == null
                ? "No limit"
                : fmtCount(entry.usageLimit),
          },
          ...(entry.revokedAt
            ? [
                {
                  term: "Revoked",
                  value: (
                    <span title={fmtDateTime(entry.revokedAt)}>
                      {timeAgo(entry.revokedAt)}
                    </span>
                  ),
                },
              ]
            : []),
          {
            term: "Key ID",
            value: <span className="font-mono break-all">{entry.id}</span>,
            wide: true,
          },
        ]}
      />
    </div>
  );
}

// ── Scopes ───────────────────────────────────────────────────────────────────

export function KeyScopes({ scopes }: { scopes: string[] }) {
  if (scopes.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        This key carries no scopes, so the API refuses every request it makes.
        Create a replacement with the access it needs.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {scopes.map((scope) => (
        <li key={scope}>
          <Badge
            variant="outline"
            className="font-mono text-[11px] font-normal text-foreground"
          >
            {scope}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
