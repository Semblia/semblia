"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── Kbd token ────────────────────────────────────────────────────────────────

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

// ── Shortcut definition (display-only) ───────────────────────────────────────

interface ShortcutEntry {
  key: string;
  label: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    items: [
      { key: "j", label: "Next item" },
      { key: "k", label: "Previous item" },
      { key: "Enter", label: "Open selected" },
      { key: "Esc", label: "Close panel / deselect" },
    ],
  },
  {
    title: "Actions",
    items: [
      { key: "a", label: "Approve response" },
      { key: "r", label: "Reject response" },
    ],
  },
  {
    title: "General",
    items: [{ key: "?", label: "Show keyboard shortcuts" }],
  },
];

// ── Format key for display ──────────────────────────────────────────────────

function KeyDisplay({ shortcut }: { shortcut: string }) {
  const parts = shortcut.split("+");
  return (
    <span className="flex items-center gap-0.5">
      {parts.map((part, i) => (
        <Kbd key={i}>{part}</Kbd>
      ))}
    </span>
  );
}

// ── Dialog ──────────────────────────────────────────────────────────────────

interface KbdShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KbdShortcutsDialog({
  open,
  onOpenChange,
}: KbdShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-sm font-semibold">
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Navigate and take actions without leaving the keyboard.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border border-t border-border">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="px-5 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                {group.title}
              </p>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-xs text-foreground">
                      {item.label}
                    </span>
                    <KeyDisplay shortcut={item.key} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-5 py-3">
          <p className="text-[10px] text-muted-foreground">
            Shortcuts are disabled when typing in inputs.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
