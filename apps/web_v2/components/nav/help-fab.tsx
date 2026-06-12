"use client";

import * as React from "react";
import {
  Question as HelpCircleIcon,
  BookOpen as BookOpenIcon,
  Sparkle as SparklesIcon,
  Envelope as MailIcon,
  X as XIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const LINKS = [
  {
    label: "Docs",
    href: "https://semblia.com/docs",
    icon: BookOpenIcon,
  },
  {
    label: "Changelog",
    href: "https://semblia.com/changelog",
    icon: SparklesIcon,
  },
  {
    label: "Support",
    href: "mailto:support@semblia.com",
    icon: MailIcon,
  },
] as const;

export function HelpFab() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div
      ref={ref}
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2"
    >
      {/* Menu items */}
      {open && (
        <div className="flex flex-col gap-1 help-fab-menu-enter">
          {LINKS.map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("mailto") ? undefined : "_blank"}
              rel={
                link.href.startsWith("mailto")
                  ? undefined
                  : "noopener noreferrer"
              }
              className="flex items-center gap-2.5 rounded-lg bg-popover px-3.5 py-2.5 text-xs font-medium text-popover-foreground shadow-md ring-1 ring-foreground/[0.06] transition-all duration-150 hover:bg-muted/80 active:scale-[0.97] help-fab-item-enter"
              style={{
                animationDelay: `${i * 50}ms`,
              }}
              onClick={() => setOpen(false)}
            >
              <link.icon className="size-3.5 shrink-0 text-muted-foreground" />
              {link.label}
            </a>
          ))}
        </div>
      )}

      {/* FAB button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex size-10 items-center justify-center rounded-full shadow-lg ring-1 ring-foreground/[0.06] transition-all duration-200",
          open
            ? "bg-foreground text-background rotate-0"
            : "bg-popover text-muted-foreground hover:text-foreground hover:shadow-xl",
        )}
        aria-label={open ? "Close help menu" : "Help & resources"}
        aria-expanded={open}
      >
        {open ? (
          <XIcon className="size-4 help-fab-icon-enter" />
        ) : (
          <HelpCircleIcon className="size-4" />
        )}
      </button>
    </div>
  );
}
