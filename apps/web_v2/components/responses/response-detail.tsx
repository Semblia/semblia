"use client";

/**
 * ResponseDetail — one response on its own page.
 *
 * List → detail: the queue at `/[slug]/responses` is the index; this screen
 * is the record. Two columns on desktop — the person on the left, what they
 * said on the right, which is wider because reading it is the job. Actions
 * live in one decision bar under the reading column.
 *
 * Emphasis follows the decision (V4): approve carries the fill because it is
 * the common outcome; reject is quiet because it is the consequential one.
 * Destructive actions live behind the overflow, with a real confirmation.
 *
 * Keyboard: A approves, R rejects, Esc returns to the queue.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  X,
  Eye,
  EyeSlash,
  Trash,
  DotsThreeVertical,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataState,
  PageBody,
  StatusBadge,
  reviewStatusMeta,
  useDataState,
} from "@/components/shared";
import {
  orDash,
  timeAgo,
  fmtDateTime,
  nameInitials,
  humanizeLabel,
  isEditableTarget,
} from "@/lib/format";
import { formatImportSourceLabel } from "@/lib/imports/source-label";
import { responsesPath } from "@/lib/routes";
import type {
  V2ProjectDTO,
  V2ResponseDTO,
  V2FormResponsePublishStatus,
} from "@workspace/types";
import {
  useResponse,
  useUpdateResponseStatus,
  useUpdateResponsePublish,
  useDeleteResponse,
} from "@/hooks/api";
import { ModerationVerdict } from "./moderation-verdict";

/** Trust modes in words a reviewer can act on — never the raw enum. */
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

export function ResponseDetail({
  project,
  responseId,
}: {
  project: V2ProjectDTO;
  responseId: string;
}) {
  const router = useRouter();
  const slug = project.slug;

  const query = useResponse(slug, responseId);
  const response = query.data;
  const state = useDataState(query, { count: response ? 1 : 0 });

  const statusMutation = useUpdateResponseStatus(slug);
  const publishMutation = useUpdateResponsePublish(slug);
  const deleteMutation = useDeleteResponse(slug);
  const busy =
    statusMutation.isPending ||
    publishMutation.isPending ||
    deleteMutation.isPending;

  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const decide = React.useCallback(
    (status: string, label: string) => {
      statusMutation.mutate(
        { responseId, status },
        {
          onSuccess: () => toast.success(label),
          onError: () => toast.error(`Couldn't ${label.toLowerCase()} it.`),
        },
      );
    },
    [responseId, statusMutation],
  );

  const handlePublish = (status: V2FormResponsePublishStatus) => {
    publishMutation.mutate(
      { responseId, status },
      {
        onSuccess: () =>
          toast.success(status === "PUBLISHED" ? "Featured" : "Unfeatured"),
        onError: () => toast.error("Couldn't change how this is displayed."),
      },
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(responseId, {
      onSuccess: () => {
        toast.success("Response deleted");
        router.push(responsesPath(slug));
      },
      onError: () => toast.error("Couldn't delete this response."),
    });
  };

  // ── Keyboard: verdict + way back ─────────────────────────────────────────
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) {
        return;
      }
      if (event.key === "Escape") {
        router.push(responsesPath(slug));
        return;
      }
      if (!response || response.reviewStatus !== "PENDING" || busy) return;
      if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        decide("APPROVED", "Approved");
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        decide("REJECTED", "Rejected");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, decide, response, router, slug]);

  const author = response?.authorName?.trim() || "Anonymous";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── One header line: the way back, the person, the state ── */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-5">
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="-ml-2 h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link href={responsesPath(slug)}>
            <ArrowLeft className="size-3.5" weight="bold" aria-hidden />
            Responses
          </Link>
        </Button>

        {response && (
          <>
            <span aria-hidden className="h-4 w-px bg-border" />
            <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground">
              {author}
            </h1>
            <StatusBadge {...reviewStatusMeta(response.reviewStatus)} />
            <span
              className="hidden text-[11px] tabular-nums text-muted-foreground sm:inline"
              title={fmtDateTime(response.createdAt)}
            >
              {timeAgo(response.createdAt)}
            </span>

            <div className="ml-auto flex shrink-0 items-center">
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
          </>
        )}
      </header>

      <PageBody padding="bare" className="flex min-h-0 flex-1 flex-col">
        <DataState
          state={state}
          resource="this response"
          align="center"
          className="min-h-0"
          skeleton={<DetailSkeleton />}
        >
          {response && (
            // One phone column that scrolls as a page, two desktop columns
            // that scroll independently. On the phone the testimonial comes
            // first — reading it is the job; the person and the record's
            // standing follow under the decision.
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-visible">
              {/* ── The person ── */}
              <aside className="order-last shrink-0 border-t border-border lg:order-first lg:w-72 lg:overflow-y-auto lg:border-t-0 lg:border-r xl:w-80">
                <AuthorRail response={response} />
              </aside>

              {/* ── Wider: what they said ── */}
              <main className="flex min-w-0 flex-col bg-card lg:min-h-0 lg:flex-1">
                <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                  <div className="mx-auto w-full max-w-[42rem] px-5 py-7 sm:px-8">
                    <Testimonial response={response} />
                  </div>
                </div>
                <DecisionBar
                  response={response}
                  busy={busy}
                  onApprove={() => decide("APPROVED", "Approved")}
                  onReject={() => decide("REJECTED", "Rejected")}
                  onTogglePublish={handlePublish}
                />
              </main>
            </div>
          )}
        </DataState>
      </PageBody>

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        intent="danger"
        title="Delete this response?"
        description="This permanently removes the testimonial and its private metadata. This cannot be undone."
        cancelLabel="Keep response"
        confirmLabel="Delete response"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ── Left rail — the person and the record's standing ────────────────────────

export function AuthorRail({ response }: { response: V2ResponseDTO }) {
  const author = response.authorName?.trim() || "Anonymous";
  const line = [response.authorRole, response.authorCompany]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="divide-y divide-border/70">
      {/* Identity */}
      <div className="flex items-center gap-3 px-5 py-5">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/12 text-xs font-semibold text-brand"
        >
          {nameInitials(response.authorName, "?")}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            {author}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {line || orDash(null)}
          </p>
        </div>
      </div>

      {/* Publishing standing — the one thing to know before deciding. */}
      <div className="space-y-2.5 px-5 py-4">
        <div className="flex items-start gap-2 text-xs">
          <span
            aria-hidden
            className={cn(
              "mt-1 size-1.5 shrink-0 rounded-full",
              response.publishable ? "bg-success" : "bg-warning",
            )}
          />
          <p className="min-w-0 leading-relaxed">
            <span className="font-medium text-foreground">
              {response.publishable
                ? "Cleared for public display"
                : "Can't be shown publicly"}
            </span>
            {!response.publishable && (
              <span className="block text-muted-foreground">
                {response.publishBlockedReason ??
                  "The author withheld consent for part of this submission."}
              </span>
            )}
          </p>
        </div>
        <ul className="space-y-1">
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
      </div>

      {/* Provenance */}
      <div className="px-5 py-4">
        <Facts
          rows={[
            ["Source", <SourceValue key="src" response={response} />],
            ["Received", fmtDateTime(response.createdAt)],
            ["Trust", trustLabel(response.trustMode)],
          ]}
        />
      </div>

      {/* The machine's opinion, clearly advisory. */}
      <div className="px-5 py-4">
        <h3 className="text-xs font-semibold tracking-tight text-foreground">
          Automated check
        </h3>
        <div className="mt-2">
          <ModerationVerdict runs={response.moderationRuns} />
        </div>
      </div>
    </div>
  );
}

// ── Right column — the testimonial and every answer ─────────────────────────

/**
 * The testimonial itself, set as the reading matter it is: larger, measured,
 * and first. Every other answer follows under it, labelled by its question.
 */
export function Testimonial({ response }: { response: V2ResponseDTO }) {
  const primary = response.answers.find((a) => a.role === "primaryText");
  const ratingShown = response.ratingValue !== null && !!response.ratingScale;
  const others = response.answers.flatMap((answer) => {
    if (answer === primary) return [];
    // The star row above already states the rating — the same number twice
    // on one screen is noise, not detail.
    if (ratingShown && answer.role === "rating") return [];
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
          No written text — a recording, or left blank.
        </p>
      )}

      {others.length > 0 && (
        <dl className="mt-6 space-y-4 border-t border-border pt-5">
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
              <dd className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
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
 * An answer as displayable text. Multi-select answers arrive as arrays;
 * objects stay excluded — there is no honest one-line rendering of a shape
 * this app doesn't know.
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

// ── Decision bar ─────────────────────────────────────────────────────────────

export function DecisionBar({
  response,
  busy,
  onApprove,
  onReject,
  onTogglePublish,
}: {
  response: V2ResponseDTO;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onTogglePublish: (next: V2FormResponsePublishStatus) => void;
}) {
  const isPublished = response.publishStatus === "PUBLISHED";
  const blocked = !isPublished && !response.publishable;

  return (
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
            <kbd className="font-mono">R</kbd> reject
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
            // The reason is stated once, in the rail where the reviewer reads
            // it before reaching for the button.
            <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
              Consent is missing — see the left column.
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
  );
}

// ── Provenance pieces ────────────────────────────────────────────────────────

const SAFE_SOURCE_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Imported proof keeps a way back to the original — truncated evidence with
 * no route to the source is not evidence.
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
      {label}
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

// ── Cold load ────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div aria-hidden className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="shrink-0 space-y-4 border-b border-border px-5 py-5 lg:w-72 lg:border-b-0 lg:border-r xl:w-80">
        <div className="flex items-center gap-3">
          <span className="size-10 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="animate-shimmer h-3.5 w-28" />
            <Skeleton className="animate-shimmer h-2.5 w-36" />
          </div>
        </div>
        <Skeleton className="animate-shimmer h-2.5 w-3/4" />
        <Skeleton className="animate-shimmer h-2.5 w-2/3" />
        <Skeleton className="animate-shimmer h-2.5 w-1/2" />
      </div>
      <div className="flex-1 space-y-3 bg-card px-8 py-7">
        <Skeleton className="animate-shimmer h-3 w-24" />
        <Skeleton className="animate-shimmer h-4 w-full max-w-xl" />
        <Skeleton className="animate-shimmer h-4 w-5/6 max-w-lg" />
        <Skeleton className="animate-shimmer h-4 w-2/3 max-w-md" />
      </div>
    </div>
  );
}
