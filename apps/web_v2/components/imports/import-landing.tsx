"use client";

/**
 * ImportLanding — how proof gets into the project.
 *
 * The previous Import Center asked "which of 56 sources?" — four tile groups,
 * filter pills, a search field, and a history feed, all on one page. The 2026-
 * 08-02 collection IA (principles P1–P5) replaces the question with "how?":
 * five methods, one sentence each, one decision on this screen. The breadth
 * lives in the header as a number, not on the page as tiles; the sources
 * themselves appear inside the method that reads them, after the user has
 * committed to a method.
 *
 * Auto-import sits alone above the hairline: it is the one method that keeps
 * working after today. The four below are one-shot ways to bring in what you
 * already have. Recent imports keep a quiet band at the foot — results, not
 * controls.
 */

import * as React from "react";
import Link from "next/link";
import {
  ArrowsClockwiseIcon,
  CaretRightIcon,
  FileXlsIcon,
  LinkIcon,
  PencilSimpleLineIcon,
  SignpostIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import type { V2ImportJobDTO, V2ProjectDTO } from "@workspace/types";
import {
  PageBody,
  PageHeader,
  DataState,
  DataList,
  ItemRow,
  ListSkeleton,
  StatusDot,
  useDataState,
  importJobMeta,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useImportCatalog, useImportJobs } from "@/hooks/api";
import { formatImportSourceLabel } from "@/lib/imports/source-label";
import {
  importConnectPath,
  importManualPath,
  importMigratePath,
  importSpreadsheetPath,
  importWebPath,
  responsesPath,
} from "@/lib/routes";
import { fmtCount, fmtDateTime, timeAgo } from "@/lib/format";

interface Method {
  href: (slug: string) => string;
  icon: PhosphorIcon;
  title: string;
  blurb: string;
}

const AUTO_METHOD: Method = {
  href: importConnectPath,
  icon: ArrowsClockwiseIcon,
  title: "Connect a platform",
  blurb:
    "Sign in to X, LinkedIn, Google, or YouTube once — Semblia imports new proof on a six-hour schedule.",
};

const MANUAL_METHODS: Method[] = [
  {
    href: importWebPath,
    icon: LinkIcon,
    title: "Import from the web",
    blurb:
      "Paste a public link to reviews or posts. Only what the source publishes openly is read.",
  },
  {
    href: importSpreadsheetPath,
    icon: FileXlsIcon,
    title: "Upload a spreadsheet",
    blurb:
      "A CSV, XLS, or XLSX you already have — map the columns once and Semblia reads the rows.",
  },
  {
    href: importManualPath,
    icon: PencilSimpleLineIcon,
    title: "Add proof manually",
    blurb:
      "Paste a testimonial, review, or recommendation you have the right to use.",
  },
  {
    href: importMigratePath,
    icon: SignpostIcon,
    title: "Migrate a wall",
    blurb:
      "Move a wall of love from another tool, keeping each testimonial's original author and date.",
  },
];

export function ImportLanding({ project }: { project: V2ProjectDTO }) {
  const importScope = { slug: project.slug };
  const catalogQuery = useImportCatalog(importScope);
  const jobsQuery = useImportJobs(importScope);

  const sourceCount = catalogQuery.data?.length;
  const jobs = React.useMemo(
    () => jobsQuery.data?.items ?? [],
    [jobsQuery.data],
  );
  const jobsState = useDataState(jobsQuery, { count: jobs.length });
  const recentJobs = jobs.slice(0, 5);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Import proof"
        description={
          sourceCount
            ? `${fmtCount(sourceCount)} sources · everything you import arrives pending review`
            : "Everything you import arrives pending review"
        }
      />

      <PageBody padding="bare" className="min-h-0 overflow-y-auto pb-8">
        <nav aria-label="Import methods" className="pt-2">
          <MethodRow slug={project.slug} method={AUTO_METHOD} />
          {/* The hairline is the information: above it, the method that keeps
              working after today; below it, the one-shot ways to bring in
              what you already have. */}
          <div role="presentation" className="border-t border-border" />
          {MANUAL_METHODS.map((method) => (
            <MethodRow key={method.title} slug={project.slug} method={method} />
          ))}
        </nav>

        <section
          id="import-history"
          aria-labelledby="import-history-heading"
          aria-busy={jobsState.kind === "loading-initial"}
          className="mt-10 border-t border-border pt-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-3 sm:px-6">
            <h2
              id="import-history-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Recent imports
            </h2>
            {jobs.length > 0 && (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Link href={`${responsesPath(project.slug)}?status=pending`}>
                  Review what arrived
                </Link>
              </Button>
            )}
          </div>
          <DataState
            state={jobsState}
            resource="recent imports"
            align="start"
            skeleton={
              <ListSkeleton rows={2} leading="none" trailing density="dense" />
            }
            empty={
              <p className="px-4 py-2 text-xs text-muted-foreground sm:px-6">
                Nothing imported yet. Every import lands here with its exact
                result.
              </p>
            }
          >
            <DataList aria-label="Recent imports">
              {recentJobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </DataList>
          </DataState>
        </section>
      </PageBody>
    </div>
  );
}

/**
 * One method. The row is the whole pitch: name, one sentence, chevron. No
 * availability dots, no per-source policy, no action menus — that context
 * belongs to the method page, after the choice is made (P4).
 */
function MethodRow({ slug, method }: { slug: string; method: Method }) {
  const Icon = method.icon;
  return (
    <ItemRow
      href={method.href(slug)}
      padding="comfortable"
      aria-label={method.title}
      leading={
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface text-foreground"
        >
          <Icon className="size-4" />
        </span>
      }
      title={
        <span className="text-[13px] font-medium text-foreground">
          {method.title}
        </span>
      }
      subtitle={
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          {method.blurb}
        </p>
      }
      trailing={
        <CaretRightIcon
          className="size-3.5 text-muted-foreground"
          aria-hidden
        />
      }
    />
  );
}

/**
 * A finished job's counts are the whole point of the record: a partial import
 * that reports only "Partially completed" leaves the owner unable to tell what
 * landed. Zeroes are shown, because "0 failed" is a fact worth reading.
 */
function JobRow({ job }: { job: V2ImportJobDTO }) {
  const meta = importJobMeta(job.status);
  const running = job.status === "QUEUED" || job.status === "RUNNING";
  const finishedAt = job.completedAt ?? job.startedAt ?? job.createdAt;

  return (
    <ItemRow
      padding="dense"
      aria-label={`${formatImportSourceLabel(job.sourceKey)} import`}
      title={
        <span className="text-sm font-medium text-foreground">
          {formatImportSourceLabel(job.sourceKey)}
        </span>
      }
      subtitle={
        running ? (
          <p className="text-xs text-muted-foreground">
            {job.totalCount > 0
              ? `Reading ${fmtCount(job.totalCount)} records…`
              : "Import in progress"}
          </p>
        ) : (
          <p className="text-xs tabular-nums text-muted-foreground">
            {job.importedCount} imported · {job.duplicateCount} duplicate ·{" "}
            {job.failedCount} failed
            {job.errorMessage ? (
              <span className="text-destructive"> · {job.errorMessage}</span>
            ) : null}
          </p>
        )
      }
      trailing={
        <div className="flex items-center gap-3">
          <StatusDot
            label={meta.label}
            tone={meta.tone}
            transitional={meta.transitional}
          />
          <span
            className="hidden text-xs tabular-nums text-muted-foreground sm:block"
            title={fmtDateTime(finishedAt)}
          >
            {timeAgo(finishedAt)}
          </span>
        </div>
      }
    />
  );
}
