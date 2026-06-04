"use client";

import * as React from "react";
import {
  CheckCircle as CheckCircle2Icon,
  XCircle as XCircleIcon,
  ShieldCheck as ShieldCheckIcon,
  X as XIcon,
  Envelope as MailIcon,
  Calendar as CalendarIcon,
  Tray as FormIcon,
  ShieldWarning as ShieldAlertIcon,
  ArrowLeft as ArrowLeftIcon,
  Quotes as QuoteIcon,
  NotePencil as NoteIcon,
  Robot as RobotIcon,
  Tag as TagIcon,
  ClockCounterClockwise as HistoryIcon,
} from "@phosphor-icons/react";

import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Kbd } from "@/components/kbd-shortcuts-dialog";
import { cn } from "@/lib/utils";
import type {
  V2ResponseDTO,
  V2SubmissionModerationRunDTO,
} from "@workspace/types";
import { Stars, STATUS_CONFIG } from "@/components/responses/shared";
import {
  DetailEmpty,
  DetailBodySkeleton,
  MetaRow,
} from "@/components/responses/detail-parts";
import { toResponseVM } from "@/lib/responses/view-model";

// ── Answer rendering helpers ─────────────────────────────────────────────────

/** Humanise an answer key (`authorName` → "Author name") for the answers list. */
function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function renderAnswerValue(value: unknown): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimestamp(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatActor(type: string | null, id: string | null): string | null {
  if (!type) return null;
  const actor = humanizeEnum(type);
  return id ? `${actor} ${id.slice(0, 8)}` : actor;
}

function formatScore(score: number | null): string | null {
  if (score == null) return null;
  const normalized = score <= 1 ? score * 100 : score;
  return `${Math.round(normalized)}%`;
}

function topCategories(categories: Record<string, number>) {
  return Object.entries(categories)
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function runTone(run: V2SubmissionModerationRunDTO) {
  if (run.status === "FAILED") {
    return "border-destructive/20 bg-destructive/5 text-destructive";
  }
  if (run.status === "SUPPRESSED") {
    return "border-muted bg-muted/50 text-muted-foreground";
  }
  if (run.decision === "REJECT") {
    return "border-destructive/20 bg-destructive/5 text-destructive";
  }
  if (run.decision === "REVIEW") {
    return "border-warning/25 bg-warning/8 text-warning";
  }
  if (run.decision === "APPROVE") {
    return "border-success/20 bg-success/8 text-success";
  }
  return "border-border bg-muted/35 text-muted-foreground";
}

function parseLabels(value: string) {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((label) => label.trim())
    .filter((label) => {
      if (!label || seen.has(label.toLowerCase())) return false;
      seen.add(label.toLowerCase());
      return true;
    });
}

type AnnotationBody = {
  note?: string;
  labels?: string[];
  sentiment?: string;
};

// ── Main detail component ─────────────────────────────────────────────────────

interface ResponseDetailProps {
  response: V2ResponseDTO | null;
  loading?: boolean;
  onClose?: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showBack?: boolean;
  onBack?: () => void;
  variant?: "panel" | "page";
  isApproving?: boolean;
  isRejecting?: boolean;
  isCreatingAnnotation?: boolean;
  onCreateAnnotation?: (
    responseId: string,
    body: AnnotationBody,
  ) => Promise<unknown> | unknown;
}

export function ResponseDetail({
  response,
  loading,
  onClose,
  onApprove,
  onReject,
  showBack,
  onBack,
  variant = "panel",
  isApproving,
  isRejecting,
  isCreatingAnnotation,
  onCreateAnnotation,
}: ResponseDetailProps) {
  const isPage = variant === "page";
  const vm = response ? toResponseVM(response) : null;
  const cfg = vm ? STATUS_CONFIG[vm.moderationStatus] : null;
  const isActionable = vm
    ? vm.moderationStatus === "PENDING" || vm.moderationStatus === "FLAGGED"
    : false;
  const isMutating = isApproving || isRejecting;
  const [confirmRejectOpen, setConfirmRejectOpen] = React.useState(false);
  const [annotationNote, setAnnotationNote] = React.useState("");
  const [annotationLabels, setAnnotationLabels] = React.useState("");
  const [annotationSentiment, setAnnotationSentiment] = React.useState("");
  const [annotationError, setAnnotationError] = React.useState<string | null>(
    null,
  );

  const answerEntries = response ? Object.entries(response.answers ?? {}) : [];
  const canAnnotate = Boolean(onCreateAnnotation);

  React.useEffect(() => {
    setAnnotationError(null);
    setAnnotationNote("");
    setAnnotationLabels("");
    setAnnotationSentiment("");
  }, [response?.id]);

  async function handleAnnotationSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!vm || !onCreateAnnotation) return;

    const note = annotationNote.trim();
    const labels = parseLabels(annotationLabels);
    const sentiment = annotationSentiment.trim();

    if (!note && labels.length === 0 && !sentiment) {
      setAnnotationError("Add a note, label, or sentiment before saving.");
      return;
    }

    setAnnotationError(null);

    try {
      await onCreateAnnotation(vm.id, {
        ...(note ? { note } : {}),
        ...(labels.length > 0 ? { labels } : {}),
        ...(sentiment ? { sentiment } : {}),
      });
      setAnnotationNote("");
      setAnnotationLabels("");
      setAnnotationSentiment("");
    } catch {
      setAnnotationError("Could not save this note. Please try again.");
    }
  }

  // Empty state — no header needed
  if (!loading && !response) return <DetailEmpty />;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header bar — always visible, never part of skeleton */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border shrink-0",
          isPage ? "px-6 h-12" : "px-5 h-11",
        )}
      >
        {showBack && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onBack}
            aria-label="Back to list"
            className="mr-1"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
        )}
        <span className="flex-1 text-xs font-semibold text-foreground truncate">
          Response
        </span>
        {onClose && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            aria-label="Close detail panel"
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Loading skeleton — only the body */}
      {loading && <DetailBodySkeleton isPage={isPage} />}

      {/* Scrollable body — only when we have data */}
      {response && vm && cfg && (
        <ScrollArea className="flex-1">
          <div key={vm.id} className="detail-content-enter">
            <div className={cn(isPage ? "px-6" : "px-5")}>
              {/* ── Author ── */}
              <div
                className="py-5 detail-section-enter"
                style={{ animationDelay: "0ms" }}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background select-none">
                    {vm.authorName[0].toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {vm.authorName}
                      </span>
                      {vm.isVerified && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-success shrink-0">
                          <ShieldCheckIcon className="size-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    {(vm.authorRole || vm.authorCompany) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[vm.authorRole, vm.authorCompany]
                          .filter(Boolean)
                          .join(" at ")}
                      </p>
                    )}
                    {vm.authorEmail && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MailIcon className="size-3 shrink-0" />
                        {vm.authorEmail}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Rating ── */}
              {vm.rating != null && (
                <div
                  className="pb-4 detail-section-enter"
                  style={{ animationDelay: "30ms" }}
                >
                  <Stars rating={vm.rating} scale={vm.ratingScale} size="lg" />
                </div>
              )}

              {/* ── Primary text (blockquote accent) ── */}
              {vm.content && (
                <div
                  className="pb-5 detail-section-enter"
                  style={{ animationDelay: "60ms" }}
                >
                  <div className="relative rounded-lg bg-muted/40 p-4">
                    <QuoteIcon className="absolute top-3 right-3 size-5 text-muted-foreground/15" />
                    <p className="text-sm leading-relaxed text-foreground pr-6">
                      {vm.content}
                    </p>
                  </div>
                </div>
              )}

              {/* ── All answers (the full submitted record) ── */}
              {answerEntries.length > 0 && (
                <div
                  className="border-t border-border py-5 detail-section-enter"
                  style={{ animationDelay: "80ms" }}
                >
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Answers
                  </h3>
                  <dl className="space-y-3">
                    {answerEntries.map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-[11px] font-medium text-muted-foreground">
                          {humanizeKey(key)}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap break-words text-xs text-foreground">
                          {renderAnswerValue(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* ── Status + moderation ── */}
              <div
                className="border-t border-border py-5 space-y-4 detail-section-enter"
                style={{ animationDelay: "90ms" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      cfg.pill,
                    )}
                  >
                    <cfg.icon className="size-3.5 shrink-0" />
                    {cfg.label}
                  </span>
                </div>

                {(response.moderatedAt || response.moderatedByActorType) && (
                  <div className="grid gap-2 rounded-lg border border-border bg-muted/25 p-3 text-[11px] text-muted-foreground sm:grid-cols-2">
                    {response.moderatedAt && (
                      <div>
                        <span className="block font-medium text-foreground">
                          Last reviewed
                        </span>
                        {formatTimestamp(response.moderatedAt)}
                      </div>
                    )}
                    {response.moderatedByActorType && (
                      <div>
                        <span className="block font-medium text-foreground">
                          Reviewed by
                        </span>
                        {formatActor(
                          response.moderatedByActorType,
                          response.moderatedByActorId,
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Moderation flags */}
                {(vm.moderationFlags.length > 0 || vm.moderationReason) && (
                  <div className="rounded-lg bg-destructive/5 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShieldAlertIcon className="size-3.5 text-destructive" />
                      <span className="text-[11px] font-semibold text-destructive">
                        Moderation
                      </span>
                    </div>
                    {vm.moderationFlags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {vm.moderationFlags.map((flag) => (
                          <span
                            key={flag}
                            className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive"
                          >
                            {flag.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    {vm.moderationReason && (
                      <p className="mt-2 text-[11px] text-destructive/80">
                        {vm.moderationReason}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <RobotIcon className="size-3.5" />
                    Provider checks
                  </h3>
                  {response.moderationRuns.length > 0 ? (
                    <div className="space-y-2">
                      {response.moderationRuns.map((run) => {
                        const score = formatScore(run.score);
                        const categories = topCategories(run.categories);

                        return (
                          <div
                            key={run.id}
                            className={cn(
                              "rounded-lg border p-3",
                              runTone(run),
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">
                                {humanizeEnum(run.artifactType)}
                              </span>
                              <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium">
                                {humanizeEnum(run.status)}
                              </span>
                              {run.decision && (
                                <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium">
                                  {humanizeEnum(run.decision)}
                                </span>
                              )}
                              {score && (
                                <span className="ml-auto font-mono text-[11px] tabular-nums">
                                  {score}
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {run.provider} · {run.providerOperation}
                            </p>

                            {run.flags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {run.flags.map((flag) => (
                                  <span
                                    key={flag}
                                    className="rounded bg-background/70 px-1.5 py-0.5 text-[10px] font-medium"
                                  >
                                    {flag.replace(/_/g, " ")}
                                  </span>
                                ))}
                              </div>
                            )}

                            {categories.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {categories.map(([category, value]) => (
                                  <div
                                    key={category}
                                    className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2 text-[10px]"
                                  >
                                    <span className="truncate text-muted-foreground">
                                      {humanizeEnum(category)}
                                    </span>
                                    <span className="text-right font-mono tabular-nums text-foreground">
                                      {formatScore(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {(run.reason || run.completedAt) && (
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                {run.reason
                                  ? run.reason
                                  : `Completed ${formatTimestamp(run.completedAt)}`}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                      No provider checks have been recorded for this response.
                    </p>
                  )}
                </div>
              </div>

              {/* ── Internal annotations ── */}
              <div
                className="border-t border-border py-5 detail-section-enter"
                style={{ animationDelay: "100ms" }}
              >
                <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <NoteIcon className="size-3.5" />
                  Review notes
                </h3>

                {response.annotations.length > 0 ? (
                  <div className="space-y-2">
                    {response.annotations.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          {note.sentiment && (
                            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {humanizeEnum(note.sentiment)}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatActor(note.actorType, note.actorId)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTimestamp(note.createdAt)}
                          </span>
                        </div>
                        {note.note && (
                          <p className="mt-1.5 leading-snug">{note.note}</p>
                        )}
                        {note.labels.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {note.labels.map((label) => (
                              <span
                                key={label}
                                className="inline-flex items-center gap-1 rounded-full bg-brand-muted px-2 py-0.5 text-[10px] font-medium text-brand"
                              >
                                <TagIcon className="size-2.5" />
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                    No reviewer notes yet.
                  </p>
                )}

                {canAnnotate && (
                  <form
                    className="mt-3 rounded-lg border border-border bg-background p-3"
                    onSubmit={handleAnnotationSubmit}
                  >
                    <div className="space-y-2">
                      <label
                        htmlFor={`response-note-${vm.id}`}
                        className="block text-[11px] font-medium text-foreground"
                      >
                        Add review note
                      </label>
                      <textarea
                        id={`response-note-${vm.id}`}
                        value={annotationNote}
                        onChange={(event) =>
                          setAnnotationNote(event.target.value)
                        }
                        rows={3}
                        maxLength={2000}
                        placeholder="Capture context for the next reviewer."
                        className="min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isCreatingAnnotation}
                      />
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem]">
                      <div className="space-y-2">
                        <label
                          htmlFor={`response-labels-${vm.id}`}
                          className="block text-[11px] font-medium text-foreground"
                        >
                          Labels
                        </label>
                        <input
                          id={`response-labels-${vm.id}`}
                          value={annotationLabels}
                          onChange={(event) =>
                            setAnnotationLabels(event.target.value)
                          }
                          placeholder="urgent, follow-up"
                          className="h-8 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isCreatingAnnotation}
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`response-sentiment-${vm.id}`}
                          className="block text-[11px] font-medium text-foreground"
                        >
                          Sentiment
                        </label>
                        <select
                          id={`response-sentiment-${vm.id}`}
                          value={annotationSentiment}
                          onChange={(event) =>
                            setAnnotationSentiment(event.target.value)
                          }
                          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isCreatingAnnotation}
                        >
                          <option value="">None</option>
                          <option value="positive">Positive</option>
                          <option value="neutral">Neutral</option>
                          <option value="negative">Negative</option>
                        </select>
                      </div>
                    </div>

                    {annotationError && (
                      <p className="mt-2 text-[11px] text-destructive">
                        {annotationError}
                      </p>
                    )}

                    <div className="mt-3 flex justify-end">
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={isCreatingAnnotation}
                      >
                        {isCreatingAnnotation ? (
                          <Spinner className="size-3.5" />
                        ) : (
                          <HistoryIcon className="size-3.5" />
                        )}
                        Save note
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* ── Metadata grid ── */}
              <div
                className="border-t border-border py-4 detail-section-enter"
                style={{ animationDelay: "120ms" }}
              >
                <MetaRow
                  icon={CalendarIcon}
                  label="Submitted"
                  value={new Date(vm.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                />
                {vm.formName && (
                  <MetaRow icon={FormIcon} label="Form" value={vm.formName} />
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      )}

      {/* ── Sticky action footer ── */}
      {vm && isActionable && (onApprove || onReject) && (
        <div
          className={cn(
            "shrink-0 border-t border-border bg-background/95 backdrop-blur-sm",
            isPage ? "px-6 py-4" : "px-5 py-3",
          )}
        >
          <div className="flex items-center gap-2">
            {onApprove && (
              <ActionButton
                size="sm"
                tone="success"
                className="flex-1 gap-1.5"
                disabled={isMutating}
                onClick={() => onApprove(vm.id)}
              >
                {isApproving ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <CheckCircle2Icon className="size-3.5" />
                )}
                Approve
                {!isPage && <Kbd className="ml-auto">a</Kbd>}
              </ActionButton>
            )}
            {onReject && (
              <ActionButton
                size="sm"
                tone="danger"
                className="flex-1 gap-1.5"
                disabled={isMutating}
                onClick={() => setConfirmRejectOpen(true)}
              >
                {isRejecting ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <XCircleIcon className="size-3.5" />
                )}
                Reject
                {!isPage && <Kbd className="ml-auto">r</Kbd>}
              </ActionButton>
            )}
          </div>

          {onReject && (
            <ConfirmationDialog
              open={confirmRejectOpen}
              onOpenChange={setConfirmRejectOpen}
              intent="danger"
              size="sm"
              title="Reject this response?"
              description={
                <>
                  {vm.authorName}&rsquo;s response won&rsquo;t appear in your
                  published feedback, and it can&rsquo;t be approved from here
                  afterward.
                </>
              }
              confirmLabel="Reject response"
              onConfirm={() => onReject(vm.id)}
            />
          )}
        </div>
      )}
    </div>
  );
}
