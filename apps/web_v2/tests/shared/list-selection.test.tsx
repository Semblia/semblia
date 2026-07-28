import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useListSelection } from "@/hooks/use-list-selection";

/**
 * The rules that make bulk actions safe to ship. Each of these, if broken,
 * lets a destructive action reach records the user cannot see.
 */

const IDS = ["a", "b", "c", "d", "e"];

function setup(ids: string[] = IDS) {
  return renderHook(({ list }) => useListSelection({ ids: list }), {
    initialProps: { list: ids },
  });
}

describe("useListSelection", () => {
  it("selects nothing on mount", () => {
    const { result } = setup();
    expect(result.current.count).toBe(0);
    expect(result.current.highlightedId).toBeNull();
  });

  it("selects only what is currently listed", () => {
    // Cmd-A after filtering must never reach the unfiltered set.
    const { result } = setup(["a", "b"]);
    act(() => result.current.selectAll());
    expect(result.current.selectedIds.sort()).toEqual(["a", "b"]);
  });

  it("drops selections for rows that leave the list", () => {
    // Paging or refiltering must not leave a bulk action pointed at records
    // that are no longer on screen.
    const { result, rerender } = setup();
    act(() => result.current.selectAll());
    expect(result.current.count).toBe(5);

    rerender({ list: ["a", "b"] });
    expect(result.current.selectedIds.sort()).toEqual(["a", "b"]);
  });

  it("extends a range from the last anchor", () => {
    const { result } = setup();
    act(() => result.current.toggle("b"));
    act(() => result.current.toggle("d", true));
    expect(result.current.selectedIds.sort()).toEqual(["b", "c", "d"]);
  });

  it("toggles a single row off again", () => {
    const { result } = setup();
    act(() => result.current.toggle("c"));
    expect(result.current.isSelected("c")).toBe(true);
    act(() => result.current.toggle("c"));
    expect(result.current.isSelected("c")).toBe(false);
  });

  it("reports a tri-state for the select-all control", () => {
    const { result } = setup();
    expect(result.current.allState).toBe("none");
    act(() => result.current.toggle("a"));
    expect(result.current.allState).toBe("some");
    act(() => result.current.selectAll());
    expect(result.current.allState).toBe("all");
  });

  it("keeps highlight and selection as separate states", () => {
    // Moving the cursor must not select — otherwise arrowing through a queue
    // silently builds a bulk selection the user never asked for.
    const { result } = setup();
    act(() => result.current.setHighlightedId("c"));
    expect(result.current.highlightedId).toBe("c");
    expect(result.current.count).toBe(0);
  });

  it("clears selection before clearing highlight", () => {
    const { result } = setup();
    act(() => result.current.toggle("b"));
    expect(result.current.highlightedId).toBe("b");

    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
    // Escape has somewhere to go next: the cursor survives the first press.
    expect(result.current.highlightedId).toBe("b");
  });
});
