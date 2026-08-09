"use client";

import * as React from "react";

export interface Shortcut {
  /** Key or key combo (e.g. "j", "Escape", "Shift+a"). Case-insensitive for letters. */
  key: string;
  /** Human-readable description shown in the shortcuts dialog */
  label: string;
  /** Category for grouping in the dialog */
  group: string;
  /** Handler — return `true` to prevent default */
  action: () => void;
  /** Only active when this returns true */
  enabled?: () => boolean;
}

/**
 * Returns true if `target` is an input, textarea, or contenteditable element.
 * Keyboard shortcuts should not fire when the user is typing.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function normalizeKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey) parts.push("Meta");
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey && e.key.length > 1) parts.push("Shift");

  let key = e.key;
  // Normalize single letters to lowercase for matching
  if (key.length === 1) key = key.toLowerCase();
  // Shift+/ produces "?" — match that directly
  parts.push(key);
  return parts.join("+");
}

/**
 * Register keyboard shortcuts. Shortcuts are active while the component is mounted.
 * Automatically skips events when focus is in an input/textarea.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const shortcutsRef = React.useRef(shortcuts);

  React.useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      const pressed = normalizeKey(e);

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.key.toLowerCase() === pressed.toLowerCase()) {
          if (shortcut.enabled && !shortcut.enabled()) continue;
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
