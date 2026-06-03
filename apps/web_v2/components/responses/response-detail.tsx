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
} from "@phosphor-icons/react";

import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Kbd } from "@/components/kbd-shortcuts-dialog";
import { cn } from "@/lib/utils";
import type { V2ResponseDTO } from "@workspace/types";
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
}: ResponseDetailProps) {
  const isPage = variant === "page";
  const vm = response ? toResponseVM(response) : null;
  const cfg = vm ? STATUS_CONFIG[vm.moderationStatus] : null;
  const isActionable = vm
    ? vm.moderationStatus === "PENDING" || vm.moderationStatus === "FLAGGED"
    : false;
  const isMutating = isApproving || isRejecting;
  const [confirmRejectOpen, setConfirmRejectOpen] = React.useState(false);

  const answerEntries = response ? Object.entries(response.answers ?? {}) : [];

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
                  <Stars rating={vm.rating} size="lg" />
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
              </div>

              {/* ── Internal annotations ── */}
              {response.annotations.length > 0 && (
                <div
                  className="border-t border-border py-5 detail-section-enter"
                  style={{ animationDelay: "100ms" }}
                >
                  <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <NoteIcon className="size-3.5" />
                    Notes
                  </h3>
                  <div className="space-y-2">
                    {response.annotations.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground"
                      >
                        {note.note && (
                          <p className="leading-snug">{note.note}</p>
                        )}
                        {note.labels.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {note.labels.map((label) => (
                              <span
                                key={label}
                                className="rounded-full bg-brand-muted px-2 py-0.5 text-[10px] font-medium text-brand"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
