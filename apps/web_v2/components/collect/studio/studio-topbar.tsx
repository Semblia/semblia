"use client";

import * as React from "react";
import {
  ArrowLeft as ArrowLeftIcon,
  FloppyDisk as SaveIcon,
  ArrowCounterClockwise as RotateCcwIcon,
  SidebarSimple as PanelLeftCloseIcon,
  SidebarSimple as PanelLeftOpenIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/* ─── Studio topbar ───────────────────────────────────────────────────────── */

interface StudioTopbarProps {
  onClose: () => void;
  isDesktop: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dirty: boolean;
  onReset: () => void;
  onSave: () => void;
}

export function StudioTopbar({
  onClose,
  isDesktop,
  sidebarOpen,
  setSidebarOpen,
  dirty,
  onReset,
  onSave,
}: StudioTopbarProps) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-2 sm:px-4">
      {/* Left: back + sidebar toggle (desktop) */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="xs"
          onClick={onClose}
          aria-label="Back to form list"
          className="gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Back to forms</span>
        </Button>

        {isDesktop && (
          <>
            <span
              className="mx-1.5 hidden h-4 w-px bg-border/60 lg:block"
              aria-hidden="true"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label={
                sidebarOpen
                  ? "Collapse controls panel"
                  : "Expand controls panel"
              }
              className="hidden lg:flex"
            >
              {sidebarOpen ? (
                <PanelLeftCloseIcon className="size-4" aria-hidden="true" />
              ) : (
                <PanelLeftOpenIcon className="size-4" aria-hidden="true" />
              )}
            </Button>
          </>
        )}
      </div>

      {/* Center: title + dirty dot */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-xs font-medium sm:text-sm">
          Testimonial Studio
        </span>
        {dirty && (
          <span
            className="size-1.5 shrink-0 rounded-full bg-amber-500"
            title="Unsaved changes"
            aria-label="Unsaved changes"
            role="status"
          />
        )}
      </div>

      {/* Right: save/reset */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!dirty}
          className="gap-1.5 text-xs"
        >
          <RotateCcwIcon className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Reset</span>
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={!dirty}
          className="gap-1.5 text-xs"
        >
          <SaveIcon className="size-3.5" aria-hidden="true" />
          Save
        </Button>
      </div>
    </div>
  );
}
