"use client";

/**
 * useListSelection — keyboard triage for lists whose job is repetitive review.
 *
 * Three row states, three inputs, kept deliberately separate because collapsing
 * them is what makes a triage list feel like a form:
 *
 *   highlight — where the cursor is.     ↑ ↓ / j k / hover
 *   select    — what a bulk action hits. x / Shift-click / Shift-↑↓ / Cmd-A
 *   act       — do the thing.            Enter, or a per-row control
 *
 * `Esc` clears selection first and highlight second, so it always has somewhere
 * to go. Cmd-A selects everything *currently listed* — i.e. after filtering —
 * never the unfiltered set, because a bulk action that reaches rows the user
 * cannot see is how people destroy data.
 *
 * Nothing is selected on mount. Ever.
 */

import * as React from "react";
import { isEditableTarget } from "@/lib/format";

export interface ListSelectionOptions {
  /** Ids of the rows currently rendered — i.e. already filtered. */
  ids: string[];
  /** Invoked when the highlighted row is activated (Enter). */
  onActivate?: (id: string) => void;
  /** Turn the global key handler off (e.g. while a dialog owns the keyboard). */
  enabled?: boolean;
}

export interface ListSelection {
  selected: ReadonlySet<string>;
  selectedIds: string[];
  count: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string, extendRange?: boolean) => void;
  selectAll: () => void;
  clear: () => void;
  /** Tri-state for the select-all control. */
  allState: "none" | "some" | "all";
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
  /** Bind to the list container so arrow keys work when it has focus. */
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Inclusive index range between the anchor and the target row, lowest first;
 * null when either end is no longer listed.
 */
function rangeBetween(
  ids: string[],
  anchorId: string,
  id: string,
): [number, number] | null {
  const from = ids.indexOf(anchorId);
  const to = ids.indexOf(id);
  if (from === -1 || to === -1) return null;
  return from < to ? [from, to] : [to, from];
}

interface ToggleInput {
  ids: string[];
  id: string;
  anchorId: string | null;
  extendRange: boolean;
}

/**
 * Next selection set after a toggle: a Shift-extend sweeps the whole
 * anchor→target range in; a plain toggle flips the single row.
 */
function toggledSelection(
  prev: ReadonlySet<string>,
  { ids, id, anchorId, extendRange }: ToggleInput,
): Set<string> {
  const next = new Set(prev);
  const range =
    extendRange && anchorId ? rangeBetween(ids, anchorId, id) : null;
  if (range) {
    for (let i = range[0]; i <= range[1]; i += 1) next.add(ids[i]);
    return next;
  }
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * Cursor target after moving `delta` rows, clamped to the listed rows; null
 * when there is nothing to move over.
 */
function nextMoveId(
  ids: string[],
  highlightedId: string | null,
  delta: number,
): string | null {
  if (ids.length === 0) return null;
  const current = highlightedId ? ids.indexOf(highlightedId) : -1;
  const nextIndex = Math.min(
    ids.length - 1,
    Math.max(0, current === -1 ? 0 : current + delta),
  );
  return ids[nextIndex];
}

/**
 * Drop selected rows that are no longer listed; keep the same set instance
 * when nothing changed so React can bail out of the update.
 */
function pruneToListed(
  prev: ReadonlySet<string>,
  live: ReadonlySet<string>,
): ReadonlySet<string> {
  const next = new Set([...prev].filter((id) => live.has(id)));
  return next.size === prev.size ? prev : next;
}

/** The cursor survives refiltering only while its row is still listed. */
function keepIfListed(
  id: string | null,
  live: ReadonlySet<string>,
): string | null {
  return id && live.has(id) ? id : null;
}

function allStateOf(
  selectedCount: number,
  listedCount: number,
): ListSelection["allState"] {
  if (selectedCount === 0) return "none";
  return selectedCount >= listedCount && listedCount > 0 ? "all" : "some";
}

type ListKeyEvent = React.KeyboardEvent | KeyboardEvent;

/**
 * A modal owns the keyboard while it is open. Without this, `x` inside a
 * delete-confirmation dialog would silently toggle selection on the row behind
 * it — the shortcut fires on a list the user cannot currently see.
 */
function modalIsOpen(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.querySelector('[role="dialog"], [role="alertdialog"]') !== null
  );
}

/**
 * The list only answers keys it truly owns: never while disabled, never while
 * the user is typing into an editable control, and never underneath a modal.
 */
function keyBelongsElsewhere(event: ListKeyEvent, enabled: boolean): boolean {
  if (!enabled) return true;
  if (isEditableTarget(event.target)) return true;
  return modalIsOpen();
}

/** What a triage key can do to the list, resolved fresh per keypress. */
interface KeyActions {
  shiftKey: boolean;
  highlightedId: string | null;
  hasSelection: boolean;
  move: (delta: number, extend: boolean) => void;
  toggle: (id: string) => void;
  activate: ((id: string) => void) | undefined;
  selectAll: () => void;
  clear: () => void;
  clearHighlight: () => void;
}

/** A handler returns true only when it consumed the key (→ preventDefault). */
type KeyHandler = (actions: KeyActions) => boolean;

const moveBy =
  (delta: number): KeyHandler =>
  (actions) => {
    actions.move(delta, actions.shiftKey);
    return true;
  };

const toggleHighlighted: KeyHandler = (actions) => {
  if (!actions.highlightedId) return false;
  actions.toggle(actions.highlightedId);
  return true;
};

const activateHighlighted: KeyHandler = (actions) => {
  if (!actions.highlightedId || !actions.activate) return false;
  actions.activate(actions.highlightedId);
  return true;
};

/** `Esc` clears selection first and highlight second — see the header note. */
const escapeStep: KeyHandler = (actions) => {
  if (actions.hasSelection) {
    actions.clear();
    return true;
  }
  if (actions.highlightedId) {
    actions.clearHighlight();
    return true;
  }
  return false;
};

const selectAllListed: KeyHandler = (actions) => {
  actions.selectAll();
  return true;
};

const KEY_HANDLERS: Record<string, KeyHandler> = {
  ArrowDown: moveBy(1),
  j: moveBy(1),
  ArrowUp: moveBy(-1),
  k: moveBy(-1),
  x: toggleHighlighted,
  Enter: activateHighlighted,
  Escape: escapeStep,
};

/**
 * Which handler owns this key, if any. Cmd/Ctrl-A is select-all over the
 * *currently listed* rows; every other Cmd/Ctrl chord falls through to the
 * browser untouched.
 */
function resolveKeyHandler(event: ListKeyEvent): KeyHandler | null {
  if (event.metaKey || event.ctrlKey) {
    return event.key === "a" || event.key === "A" ? selectAllListed : null;
  }
  return KEY_HANDLERS[event.key] ?? null;
}

/** Everything the keyboard layer needs from the hook, minus per-key state. */
interface ListKeyboardWiring extends Omit<
  KeyActions,
  "shiftKey" | "clearHighlight"
> {
  enabled: boolean;
  setHighlightedId: (id: string | null) => void;
}

/**
 * Keydown wiring shared by the container handler and the window listener.
 * Binds globally too: triage happens with hands on the keyboard, and requiring
 * the user to first click the list to focus it defeats the point.
 */
function useListKeyboard(
  wiring: ListKeyboardWiring,
): ListSelection["onKeyDown"] {
  const {
    enabled,
    highlightedId,
    hasSelection,
    move,
    toggle,
    activate,
    selectAll,
    clear,
    setHighlightedId,
  } = wiring;

  const onKeyDown = React.useCallback(
    (event: ListKeyEvent) => {
      if (keyBelongsElsewhere(event, enabled)) return;
      const handler = resolveKeyHandler(event);
      if (handler === null) return;
      const handled = handler({
        shiftKey: event.shiftKey,
        highlightedId,
        hasSelection,
        move,
        toggle,
        activate,
        selectAll,
        clear,
        clearHighlight: () => setHighlightedId(null),
      });
      if (handled) event.preventDefault();
    },
    [
      activate,
      clear,
      enabled,
      hasSelection,
      highlightedId,
      move,
      selectAll,
      setHighlightedId,
      toggle,
    ],
  );

  React.useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onKeyDown]);

  return onKeyDown;
}

/**
 * Selection, cursor, and range-anchor state, pruned as the list changes. Rows
 * that scrolled out of the current page (or were deleted) must not stay
 * selected — a bulk action would otherwise hit records nobody can see.
 */
function useListedSelectionState(ids: string[]) {
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null);
  const [anchorId, setAnchorId] = React.useState<string | null>(null);

  const idKey = ids.join(" ");
  React.useEffect(() => {
    const live = new Set(ids);
    setSelected((prev) => pruneToListed(prev, live));
    setHighlightedId((prev) => keepIfListed(prev, live));
    // `idKey` is the stable identity of `ids`; depending on the array itself
    // would re-run on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey]);

  return {
    selected,
    setSelected,
    highlightedId,
    setHighlightedId,
    anchorId,
    setAnchorId,
  };
}

export function useListSelection({
  ids,
  onActivate,
  enabled = true,
}: ListSelectionOptions): ListSelection {
  const {
    selected,
    setSelected,
    highlightedId,
    setHighlightedId,
    anchorId,
    setAnchorId,
  } = useListedSelectionState(ids);

  const toggle = React.useCallback(
    (id: string, extendRange = false) => {
      setSelected((prev) =>
        toggledSelection(prev, { ids, id, anchorId, extendRange }),
      );
      setAnchorId(id);
      setHighlightedId(id);
    },
    [anchorId, ids, setAnchorId, setHighlightedId, setSelected],
  );

  const selectAll = React.useCallback(() => {
    setSelected(new Set(ids));
  }, [ids, setSelected]);

  const clear = React.useCallback(() => {
    setSelected(new Set());
    setAnchorId(null);
  }, [setAnchorId, setSelected]);

  const move = React.useCallback(
    (delta: number, extend: boolean) => {
      const nextId = nextMoveId(ids, highlightedId, delta);
      if (nextId === null) return;
      setHighlightedId(nextId);
      if (!extend) return;
      setSelected((prev) => new Set(prev).add(nextId));
      if (!anchorId) setAnchorId(nextId);
    },
    [anchorId, highlightedId, ids, setAnchorId, setHighlightedId, setSelected],
  );

  const onKeyDown = useListKeyboard({
    enabled,
    highlightedId,
    hasSelection: selected.size > 0,
    move,
    toggle,
    activate: onActivate,
    selectAll,
    clear,
    setHighlightedId,
  });

  return {
    selected,
    selectedIds: React.useMemo(() => [...selected], [selected]),
    count: selected.size,
    isSelected: React.useCallback((id: string) => selected.has(id), [selected]),
    toggle,
    selectAll,
    clear,
    allState: allStateOf(selected.size, ids.length),
    highlightedId,
    setHighlightedId,
    onKeyDown,
  };
}
