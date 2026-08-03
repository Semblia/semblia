"use client";

/**
 * DetailSheet — the row inspector, and deliberately not a dialog.
 *
 * Reviewing a queue means reading one record, deciding, and moving to the next.
 * A modal breaks that: it traps focus, dims the queue, and forces a close-then-
 * reopen round trip per record. So this is a *non-modal* complementary panel —
 * the list behind it stays readable and clickable, and ↑ / ↓ walk to the
 * adjacent record without leaving the panel.
 *
 * What it deliberately does not do:
 *   • repeat the page header — it is the detail layer, not a second page
 *   • host a destructive confirmation — that is a real modal with an explicit
 *     gate, because a non-modal surface can be dismissed by a stray click
 *
 * On mobile there is no room to be non-modal, so it becomes a full-width sheet
 * with a dismissing scrim.
 */

import * as React from "react";
import { X, CaretUp, CaretDown, ArrowSquareOut } from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { isEditableTarget } from "@/lib/format";

export interface DetailSheetProps {
  open: boolean;
  onClose: () => void;
  /** Record title. Identifies the record, not the page. */
  title: React.ReactNode;
  /** Inline meta under the title — status, author, timestamp. */
  meta?: React.ReactNode;
  /** Walk to the previous/next record in the list. Omit to hide the control. */
  onPrev?: () => void;
  onNext?: () => void;
  /** Full-page view of the same record — the escape hatch from the peek. */
  fullPageHref?: string;
  /** Sticky action bar at the foot of the panel. */
  footer?: React.ReactNode;
  /**
   * Element that opened the sheet. Focus returns here on close, so keyboard
   * users land back on the row they came from rather than at the top of the page.
   */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  children: React.ReactNode;
}

export function DetailSheet({
  open,
  onClose,
  title,
  meta,
  onPrev,
  onNext,
  fullPageHref,
  footer,
  returnFocusRef,
  className,
  children,
}: DetailSheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const headingId = React.useId();

  // Move focus into the panel on open so screen readers and keyboards follow
  // the content — without trapping it there, which is what makes this non-modal.
  React.useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  useSheetKeyboard({ open, panelRef, onClose, returnFocusRef, onPrev, onNext });

  if (!open) return null;

  const close = () => {
    onClose();
    returnFocusRef?.current?.focus();
  };

  return (
    <>
      {/* Mobile-only scrim. On desktop the list stays live behind the panel. */}
      <div
        aria-hidden
        onClick={close}
        className="ink-veil fixed inset-0 z-40 lg:hidden"
      />

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="complementary"
        aria-labelledby={headingId}
        className={cn(
          "detail-panel-slide-enter fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-card outline-none sm:max-w-[28rem]",
          className,
        )}
      >
        <header className="flex items-start gap-2 border-b border-border px-4 py-3 sm:px-5">
          <SheetHeading headingId={headingId} title={title} meta={meta} />
          <SheetHeaderActions
            onPrev={onPrev}
            onNext={onNext}
            fullPageHref={fullPageHref}
            onClose={close}
          />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>

        {footer && (
          <div className="border-t border-border px-4 py-3 sm:px-5">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}

/** ↑ / ↓ walk to the adjacent record without leaving the panel. */
function walkRecords(
  event: KeyboardEvent,
  onPrev?: () => void,
  onNext?: () => void,
) {
  if (event.key === "ArrowUp" && onPrev) {
    event.preventDefault();
    onPrev();
  }
  if (event.key === "ArrowDown" && onNext) {
    event.preventDefault();
    onNext();
  }
}

function useSheetKeyboard({
  open,
  panelRef,
  onClose,
  returnFocusRef,
  onPrev,
  onNext,
}: {
  open: boolean;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;

    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        returnFocusRef?.current?.focus();
        return;
      }
      // Only walk records while focus is inside the panel — otherwise the
      // list's own arrow-key navigation would fight this one.
      if (!panelRef.current?.contains(document.activeElement)) return;
      walkRecords(event, onPrev, onNext);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, panelRef, onClose, onPrev, onNext, returnFocusRef]);
}

function SheetHeading({
  headingId,
  title,
  meta,
}: {
  headingId: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <h2
        id={headingId}
        className="truncate text-sm font-semibold tracking-tight text-foreground"
      >
        {title}
      </h2>
      {meta != null && (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {meta}
        </div>
      )}
    </div>
  );
}

function SheetHeaderActions({
  onPrev,
  onNext,
  fullPageHref,
  onClose,
}: {
  onPrev?: () => void;
  onNext?: () => void;
  fullPageHref?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {(onPrev || onNext) && (
        <>
          <IconButton
            label="Previous record"
            onClick={onPrev}
            disabled={!onPrev}
          >
            <CaretUp className="size-3.5" weight="bold" aria-hidden />
          </IconButton>
          <IconButton label="Next record" onClick={onNext} disabled={!onNext}>
            <CaretDown className="size-3.5" weight="bold" aria-hidden />
          </IconButton>
        </>
      )}
      {fullPageHref && (
        <Button
          asChild
          size="icon"
          variant="ghost"
          className="size-7"
          title="Open full page"
        >
          <Link href={fullPageHref}>
            <ArrowSquareOut className="size-3.5" weight="bold" aria-hidden />
            <span className="sr-only">Open full page</span>
          </Link>
        </Button>
      )}
      <IconButton label="Close panel" onClick={onClose}>
        <X className="size-3.5" weight="bold" aria-hidden />
      </IconButton>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-7"
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  );
}
