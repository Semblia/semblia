"use client";

/**
 * ResponseRecord — the right column of the review split.
 *
 * A column in the layout, not a panel over it. The previous build floated this
 * as a fixed overlay, which covered the page header and its actions — you could
 * not see the queue's own controls while reading a record, and dismissing it was
 * the only way back to them.
 *
 * Emphasis follows the decision (V4): approve carries the fill because it is the
 * common, expected outcome; reject is quiet because it is the consequential one.
 * They are never the same button in two colours. Destructive actions are not
 * here at all — they live behind the overflow, with a real confirmation.
 */

import * as React from "react";
import {
  Check,
  X,
  Eye,
  EyeSlash,
  Trash,
  DotsThreeVertical,
  ArrowUp,
  ArrowDown,
  CaretRight,
  Star,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { StatusBadge, reviewStatusMeta } from "@/components/shared";
import {
  orDash,
  timeAgo,
  fmtDateTime,
  nameInitials,
  humanizeLabel,
} from "@/lib/format";
import { formatImportSourceLabel } from "@/lib/imports/source-label";
import type {
  V2ResponseDTO,
  V2FormResponsePublishStatus,
} from "@workspace/types";
import { ModerationVerdict } from "./moderation-verdict";

/**
 * How the submission proved itself, in words a reviewer can act on — never
 * the raw enum. The fallback keeps an API-added mode readable.
 */
const TRUST_LABELS: Record<string, string> = {
  ORIGIN: "Origin-checked submit",
  HMAC: "Signed submit",
  IMPORT: "Imported",
};

function trustLabel(mode: string): string {
  return TRUST_LABELS[mode] ?? humanizeLabel(mode);
}

const CONSENT_FIELDS: Array<{
  key: keyof V2ResponseDTO["consent"];
  label: string;
}> = [
  { key: "canPublishText", label: "Testimonial" },
  { key: "canPublishName", label: "Name" },
  { key: "canPublishRole", label: "Role" },
  { key: "canPublishCompany", label: "Company" },
  { key: "canPublishAvatar", label: "Photo" },
  { key: "canEditForClarity", label: "Edits for clarity" },
];

export interface ResponseRecordProps {
  response: V2ResponseDTO;
  busy: boolean;
  position: { index: number; total: number };
  onPrev?: () => void;
  onNext?: () => void;
  onApprove: () => void;
  onReject: () => void;
  onTogglePublish: (next: V2FormResponsePublishStatus) => void;
  onDelete: () => void;
  /** Mobile only — the split collapses to one column and needs a way back. */
  onBack?: () => void;
}

export function ResponseRecord({
  response,
  busy,
  position,
  onPrev,
  onNext,
  onApprove,
  onReject,
  onTogglePublish,
  onDelete,
  onBack,
}: ResponseRecordProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const author = response.authorName?.trim() || "Anonymous";
  const isPublished = response.publishStatus === "PUBLISHED";
  const blocked = !isPublished && !response.publishable;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      {/* ── Record chrome: identity, position, record-scoped actions ── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-2.5">
        {onBack && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onBack}
            className="-ml-2 h-7 px-2 text-xs lg:hidden"
          >
            Back
          </Button>
        )}

        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/12 text-[10px] font-semibold text-brand"
        >
          {nameInitials(response.authorName, "?")}
        </span>

        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {author}
          </h2>
          <span
            className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
            title={fmtDateTime(response.createdAt)}
          >
            {timeAgo(response.createdAt)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-1 hidden text-[11px] tabular-nums text-muted-foreground/70 sm:inline">
            {position.index + 1} of {position.total}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={!onPrev}
            onClick={onPrev}
            title="Previous (↑)"
          >
            <ArrowUp className="size-3.5" weight="bold" aria-hidden />
            <span className="sr-only">Previous response</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={!onNext}
            onClick={onNext}
            title="Next (↓)"
          >
            <ArrowDown className="size-3.5" weight="bold" aria-hidden />
            <span className="sr-only">Next response</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="More actions"
              >
                <DotsThreeVertical
                  className="size-4"
                  weight="bold"
                  aria-hidden
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem
                variant="destructive"
                className="gap-2 text-xs"
                onSelect={() => setConfirmDelete(true)}
              >
                <Trash className="size-3.5" weight="bold" aria-hidden />
                Delete response
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── The record ──
          Read as a testimonial being judged, not as a database row. The quote
          leads, the attribution sits under it the way it will appear on the
          customer's own site, and everything else is context ranked by how much
          it bears on the decision. The full consent matrix and the provider
          breakdown are real but rarely load-bearing, so they sit behind
          disclosures instead of filling the page with "Granted" six times. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[38rem] px-6 py-7">
          <Testimonial response={response} />
          <Attribution response={response} />

          <div className="mt-8 space-y-5 border-t border-border pt-6">
            <PublishingLine response={response} />

            <RecordBlock title="Automated check">
              <ModerationVerdict
                runs={response.moderationRuns}
                humanDecision={
                  response.reviewStatus === "PENDING"
                    ? null
                    : {
                        label: reviewStatusMeta(response.reviewStatus).label,
                        at: response.moderatedAt,
                      }
                }
              />
            </RecordBlock>

            <Disclosure summary="Consent, in full">
              <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                {CONSENT_FIELDS.map(({ key, label }) => (
                  <li
                    key={key}
                    className="flex items-baseline justify-between gap-3 text-xs"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span
                      className={cn(
                        "font-medium",
                        response.consent[key]
                          ? "text-foreground"
                          : "text-muted-foreground/60",
                      )}
                    >
                      {response.consent[key] ? "Granted" : "Withheld"}
                    </span>
                  </li>
                ))}
              </ul>
            </Disclosure>

            <Disclosure summary="Provenance">
              <Facts
                rows={[
                  ["Source", <SourceValue key="src" response={response} />],
                  ["Received", fmtDateTime(response.createdAt)],
                  ["Trust", trustLabel(response.trustMode)],
                  ["Role", orDash(response.authorRole)],
                  ["Company", orDash(response.authorCompany)],
                ]}
              />
            </Disclosure>
          </div>
        </div>
      </div>

      {/* ── Decision bar ── */}
      <footer className="shrink-0 border-t border-border px-5 py-3">
        {response.reviewStatus === "PENDING" ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="ink-raised gap-1.5 text-xs"
              disabled={busy}
              onClick={onApprove}
            >
              <Check className="size-3.5" weight="bold" aria-hidden />
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              disabled={busy}
              onClick={onReject}
            >
              <X className="size-3.5" weight="bold" aria-hidden />
              Reject
            </Button>
            <span className="ml-auto hidden text-[11px] text-muted-foreground/70 sm:block">
              <kbd className="font-mono">A</kbd> approve ·{" "}
              <kbd className="font-mono">R</kbd> reject ·{" "}
              <kbd className="font-mono">↓</kbd> next
            </span>
          </div>
        ) : response.reviewStatus === "APPROVED" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={isPublished ? "outline" : "default"}
              className={cn("gap-1.5 text-xs", !isPublished && "ink-raised")}
              disabled={busy || blocked}
              onClick={() =>
                onTogglePublish(isPublished ? "UNPUBLISHED" : "PUBLISHED")
              }
            >
              {isPublished ? (
                <EyeSlash className="size-3.5" weight="bold" aria-hidden />
              ) : (
                <Eye className="size-3.5" weight="bold" aria-hidden />
              )}
              {isPublished ? "Remove from widgets" : "Feature in widgets"}
            </Button>
            {blocked && (
              // The reason is stated once, up in the record where the reviewer
              // reads it before reaching for the button. Repeating it here
              // would be the same sentence twice on one screen.
              <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
                Consent is missing — see “Can&apos;t be shown publicly” above.
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <StatusBadge {...reviewStatusMeta(response.reviewStatus)} />
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              disabled={busy}
              onClick={onApprove}
            >
              Approve instead
            </Button>
          </div>
        )}
      </footer>

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        intent="danger"
        title="Delete this response?"
        description="This permanently removes the testimonial and its private metadata. This cannot be undone."
        cancelLabel="Keep response"
        confirmLabel="Delete response"
        onConfirm={onDelete}
      />
    </div>
  );
}

/**
 * The testimonial itself, set as the reading matter it is: larger, measured,
 * and first. Everything else on the record is context for judging this.
 */
function Testimonial({ response }: { response: V2ResponseDTO }) {
  const primary = response.answers.find((a) => a.role === "primaryText");
  const others = response.answers.flatMap((answer) => {
    if (answer === primary) return [];
    const text = answerDisplay(answer.value);
    return text === null ? [] : [{ answer, text }];
  });

  return (
    <div>
      {response.ratingValue !== null && response.ratingScale && (
        <p
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium tabular-nums text-amber-500"
          aria-label={`Rated ${response.ratingValue} out of ${response.ratingScale}`}
        >
          {Array.from({ length: response.ratingScale }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "size-3.5",
                i < (response.ratingValue ?? 0)
                  ? "text-amber-500"
                  : "text-muted-foreground/25",
              )}
              weight="fill"
              aria-hidden
            />
          ))}
          <span className="ml-1 text-muted-foreground">
            {response.ratingValue}/{response.ratingScale}
          </span>
        </p>
      )}

      {typeof primary?.value === "string" && primary.value.trim() ? (
        <blockquote className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
          {primary.value}
        </blockquote>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          No written testimonial — this submission is a recording or was left
          blank.
        </p>
      )}

      {others.length > 0 && (
        <dl className="mt-5 space-y-3 border-t border-border pt-4">
          {others.map(({ answer, text }) => (
            <div key={answer.fieldId}>
              <dt className="text-[11px] font-medium text-muted-foreground">
                {answer.labelSnapshot}
                {!answer.publishable && (
                  <span className="ml-1.5 font-normal text-muted-foreground/60">
                    · not for publication
                  </span>
                )}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                {text}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/**
 * An answer as displayable text. Multi-select answers arrive as arrays and
 * used to be dropped from the record entirely — a reviewer judging a
 * submission has to see every answer it carries. Objects stay excluded:
 * there is no honest one-line rendering of a shape this app doesn't know.
 */
function answerDisplay(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => answerDisplay(item))
      .filter((item): item is string => item !== null);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return null;
}

const SAFE_SOURCE_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Imported proof keeps a way back to the original. Truncated evidence with no
 * route to the source is not evidence — a reviewer judging an imported review
 * has to be able to go read it where it was published.
 */
function SourceValue({ response }: { response: V2ResponseDTO }) {
  if (response.origin !== "IMPORT") {
    return <>{response.form?.name ?? "Form"}</>;
  }

  const label = formatImportSourceLabel(
    typeof response.sourceMetadata.source === "string"
      ? response.sourceMetadata.source
      : null,
  );
  const href =
    typeof response.sourceMetadata.sourceUrl === "string"
      ? safeSourceUrl(response.sourceMetadata.sourceUrl)
      : null;

  if (!href) return <>{label}</>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`Source: ${label}`}
      className="underline decoration-border underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      Source: {label}
    </a>
  );
}

function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return SAFE_SOURCE_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Attribution, set the way the testimonial will actually appear once featured.
 * Showing the author as `Name / Role / Company` rows in a fact table made the
 * record read as a database row; showing it as a byline shows the reviewer what
 * they are approving.
 */
function Attribution({ response }: { response: V2ResponseDTO }) {
  const author = response.authorName?.trim() || "Anonymous";
  const line = [response.authorRole, response.authorCompany]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" · ");

  return (
    <figcaption className="mt-4 flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/12 text-[10px] font-semibold text-brand"
      >
        {nameInitials(response.authorName, "?")}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-foreground">
          {author}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {line || "No role or company given"}
        </span>
      </span>
    </figcaption>
  );
}

/**
 * The one thing the reviewer needs to know before deciding: can this be shown
 * publicly, and if not, why. The consent matrix behind it is evidence; this is
 * the verdict.
 */
function PublishingLine({ response }: { response: V2ResponseDTO }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          response.publishable ? "bg-success" : "bg-warning",
        )}
      />
      <p className="min-w-0 leading-relaxed">
        <span className="font-medium text-foreground">
          {response.publishable
            ? "Cleared for public display."
            : "Can't be shown publicly."}
        </span>{" "}
        <span className="text-muted-foreground">
          {response.publishable
            ? "The author consented to everything this testimonial carries."
            : (response.publishBlockedReason ??
              "The author withheld consent for part of this submission.")}
        </span>
      </p>
    </div>
  );
}

function RecordBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0">
      <h3 className="text-xs font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

/**
 * Detail that is real but rarely load-bearing. Native `<details>` so it is
 * keyboard- and screen-reader-correct without a component.
 */
function Disclosure({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group/disc">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30">
        <CaretRight
          className="size-3 transition-transform duration-(--duration-base) group-open/disc:rotate-90"
          weight="bold"
          aria-hidden
        />
        {summary}
      </summary>
      <div className="mt-2 pl-4">{children}</div>
    </details>
  );
}

function Facts({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="space-y-1">
      {rows.map(([term, value]) => (
        <div
          key={term}
          className="flex items-baseline justify-between gap-3 text-xs"
        >
          <dt className="shrink-0 text-muted-foreground">{term}</dt>
          <dd className="min-w-0 truncate text-right font-medium text-foreground">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
