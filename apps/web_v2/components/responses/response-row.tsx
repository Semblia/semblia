"use client";

import {
  CheckCircle as CheckCircle2Icon,
  XCircle as XCircleIcon,
  ShieldCheck as ShieldCheckIcon,
  Check as CheckIcon,
  CaretRight as ChevronRightIcon,
} from "@phosphor-icons/react";

import { ActionButton } from "@/components/ui/action-button";
import { ItemShell } from "@/components/shared";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import type { ResponseVM } from "@/lib/responses/view-model";
import { Stars, StatusPill } from "@/components/responses/shared";
import type { StatusFilter } from "@/components/responses/responses-filter-bar";

// ── Response row (with inline actions on hover) ──────────────────────────────

export interface ResponseRowProps {
  t: ResponseVM;
  /** Active filter tab — used to suppress redundant per-row status pills */
  currentTab?: StatusFilter;
  isSelected?: boolean;
  isBulkSelected?: boolean;
  bulkMode?: boolean;
  onSelect?: (id: string) => void;
  onBulkToggle?: (id: string) => void;
  onInlineApprove?: (id: string) => void;
  onInlineReject?: (id: string) => void;
}

export function ResponseRow({
  t,
  currentTab,
  isSelected,
  isBulkSelected,
  bulkMode,
  onSelect,
  onBulkToggle,
  onInlineApprove,
  onInlineReject,
}: ResponseRowProps) {
  const isActionable =
    t.moderationStatus === "PENDING" || t.moderationStatus === "FLAGGED";
  const showStatusPill = currentTab === "ALL" || currentTab === undefined;

  return (
    <ItemShell
      shape="row"
      selected={isSelected}
      bulkSelected={isBulkSelected}
      onClick={() => {
        if (bulkMode) {
          onBulkToggle?.(t.id);
        } else {
          onSelect?.(t.id);
        }
      }}
      className="group items-start gap-3 px-5 py-3.5"
    >
      {/* Checkbox / avatar */}
      {bulkMode ? (
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150",
            isBulkSelected
              ? "border-brand bg-brand text-brand-foreground"
              : "border-border bg-background text-transparent hover:border-muted-foreground/40",
          )}
        >
          <CheckIcon className="size-3.5" />
        </span>
      ) : (
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold select-none transition-colors duration-150",
            isSelected
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground",
          )}
        >
          {t.authorName[0].toUpperCase()}
        </span>
      )}

      <div
        className={cn("min-w-0 flex-1", !bulkMode && isActionable && "pr-14")}
      >
        {/* Name + role + time */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground truncate">
            {t.authorName}
          </span>
          {t.isVerified && (
            <ShieldCheckIcon className="size-3 shrink-0 text-success" />
          )}
          {(t.authorRole || t.authorCompany) && (
            <span className="hidden sm:inline text-[11px] text-muted-foreground truncate">
              {[t.authorRole, t.authorCompany].filter(Boolean).join(" at ")}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {timeAgo(t.createdAt)}
          </span>
        </div>

        {/* Content preview */}
        {t.content && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {t.content}
          </p>
        )}

        {/* Compact meta */}
        <div className="mt-1.5 flex items-center gap-2">
          <Stars rating={t.rating} scale={t.ratingScale} />
          {showStatusPill && <StatusPill status={t.moderationStatus} />}
          {t.formName && (
            <span className="truncate text-[10px] text-muted-foreground">
              {t.formName}
            </span>
          )}
        </div>
      </div>

      {/* Inline actions — appear on hover, only for actionable items */}
      {!bulkMode && isActionable && (onInlineApprove || onInlineReject) && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:flex group-hover:opacity-100">
          {onInlineApprove && (
            <ActionButton
              onClick={(e) => {
                e.stopPropagation();
                onInlineApprove(t.id);
              }}
              tone="success"
              size="icon-sm"
              className="rounded-md bg-muted"
              aria-label={`Approve ${t.authorName}`}
              title="Approve"
            >
              <CheckCircle2Icon className="size-3.5" />
            </ActionButton>
          )}
          {onInlineReject && (
            <ActionButton
              onClick={(e) => {
                e.stopPropagation();
                onInlineReject(t.id);
              }}
              tone="danger"
              size="icon-sm"
              className="rounded-md bg-muted"
              aria-label={`Reject ${t.authorName}`}
              title="Reject"
            >
              <XCircleIcon className="size-3.5" />
            </ActionButton>
          )}
        </div>
      )}

      {/* Mobile chevron */}
      {!bulkMode && (
        <ChevronRightIcon className="mt-2 size-3.5 shrink-0 text-muted-foreground/40 lg:hidden" />
      )}
    </ItemShell>
  );
}
