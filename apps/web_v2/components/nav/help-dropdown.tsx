"use client";

import * as React from "react";
import {
  Question as HelpCircleIcon,
  BookOpen as BookOpenIcon,
  Sparkle as SparklesIcon,
  Envelope as MailIcon,
  Keyboard as KeyboardIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdShortcutsDialog } from "@/components/kbd-shortcuts-dialog";
import { isEditableTarget } from "@/lib/format";

// ── Help dropdown (replaces floating FAB) ─────────────────────────────────────

const HELP_LINKS = [
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

export function HelpDropdown() {
  const [kbdOpen, setKbdOpen] = React.useState(false);

  // Global ? shortcut to open keyboard shortcuts dialog
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "?" && !isEditableTarget(e.target)) {
        e.preventDefault();
        setKbdOpen(true);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <KbdShortcutsDialog open={kbdOpen} onOpenChange={setKbdOpen} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Help & resources"
          >
            <HelpCircleIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-48">
          {HELP_LINKS.map((link) => (
            <DropdownMenuItem key={link.label} asChild>
              <a
                href={link.href}
                target={link.href.startsWith("mailto") ? undefined : "_blank"}
                rel={
                  link.href.startsWith("mailto")
                    ? undefined
                    : "noopener noreferrer"
                }
                className="gap-2 text-xs"
              >
                <link.icon className="size-3.5 text-muted-foreground" />
                {link.label}
              </a>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-xs"
            onSelect={() => setKbdOpen(true)}
          >
            <KeyboardIcon className="size-3.5 text-muted-foreground" />
            <span className="flex-1">Keyboard shortcuts</span>
            <Kbd>?</Kbd>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
