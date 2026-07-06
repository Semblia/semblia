"use client";

/**
 * useStudioHotkeys — the keyboard layer every Semblia Studio shares.
 *
 *   1…n   jump to a section (matches the rail order)
 *   ⌘⏎    publish
 *   ?     toggle the shortcuts popover
 *
 * Typing-safe: `useKeyboardShortcuts` already skips events from editable
 * targets, so digits in a text field never hijack the rail. (⌘S stays a
 * studio-local listener because it must fire *while* typing.)
 */

import {
  useKeyboardShortcuts,
  type Shortcut,
} from "@/hooks/use-keyboard-shortcuts";
import type { StudioSection } from "./studio-rail";

export function useStudioHotkeys<Id extends string>({
  sections,
  onSectionChange,
  onPublish,
  onToggleHelp,
}: {
  sections: ReadonlyArray<StudioSection<Id>>;
  onSectionChange: (id: Id) => void;
  onPublish?: () => void;
  onToggleHelp?: () => void;
}) {
  const shortcuts: Shortcut[] = sections.map((section, index) => ({
    key: String(index + 1),
    label: `Go to ${section.label}`,
    group: "Studio",
    action: () => onSectionChange(section.id),
  }));

  if (onPublish) {
    shortcuts.push(
      {
        key: "Meta+Enter",
        label: "Publish",
        group: "Studio",
        action: onPublish,
      },
      {
        key: "Ctrl+Enter",
        label: "Publish",
        group: "Studio",
        action: onPublish,
      },
    );
  }

  if (onToggleHelp) {
    shortcuts.push({
      key: "?",
      label: "Shortcuts",
      group: "Studio",
      action: onToggleHelp,
    });
  }

  useKeyboardShortcuts(shortcuts);
}

/** The help-popover entries that match `useStudioHotkeys`, shared verbatim. */
export function studioHotkeyHelp(sectionCount: number) {
  return [
    { keys: ["⌘", "S"], label: "Save draft" },
    { keys: ["⌘", "⏎"], label: "Publish" },
    { keys: [`1–${sectionCount}`], label: "Jump to section" },
    { keys: ["↑", "↓"], label: "Switch section (rail)" },
    { keys: ["?"], label: "Toggle this panel" },
  ];
}
