"use client";

/**
 * useStudioHotkeys — the keyboard layer every Semblia Studio shares.
 *
 *   1…n   jump to an inspector tab
 *   ⌘⏎    publish
 *   ?     toggle the shortcuts popover
 *
 * (Canvas zoom keys — ⇧1 fit, 0 = 100%, ⌘± — are registered by StudioCanvas.)
 *
 * Typing-safe: `useKeyboardShortcuts` already skips events from editable
 * targets, so digits in a text field never hijack the tabs. (⌘S stays a
 * studio-local listener because it must fire *while* typing.)
 */

import {
  useKeyboardShortcuts,
  type Shortcut,
} from "@/hooks/use-keyboard-shortcuts";
import type { StudioTab } from "./studio-frame";

export function useStudioHotkeys<Id extends string>({
  tabs,
  onTabChange,
  onPublish,
  onToggleHelp,
}: {
  tabs: ReadonlyArray<StudioTab<Id>>;
  onTabChange: (id: Id) => void;
  onPublish?: () => void;
  onToggleHelp?: () => void;
}) {
  const shortcuts: Shortcut[] = tabs.map((tab, index) => ({
    key: String(index + 1),
    label: `Go to ${tab.label}`,
    group: "Studio",
    action: () => onTabChange(tab.id),
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

/** The help-popover entries that match `useStudioHotkeys` + StudioCanvas. */
export function studioHotkeyHelp(tabCount: number) {
  return [
    { keys: ["⌘", "S"], label: "Save draft" },
    { keys: ["⌘", "⏎"], label: "Publish" },
    { keys: [`1–${tabCount}`], label: "Jump to panel" },
    { keys: ["⇧", "1"], label: "Zoom to fit" },
    { keys: ["0"], label: "Zoom to 100%" },
    { keys: ["⌘", "±"], label: "Zoom in / out" },
    { keys: ["?"], label: "Toggle this panel" },
  ];
}
