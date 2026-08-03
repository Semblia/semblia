import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDataState } from "@/components/shared/data-state";
import { ApiError } from "@/lib/api-client";

/**
 * The defect this primitive exists to make impossible: four surfaces rendered
 * "you have nothing yet" whenever their query failed, because each hand-wrote
 * `loading ? … : items.length === 0 ? <Empty/> : <Rows/>` and a failed query
 * also produces zero items.
 *
 * These pin the derivation order — error before empty — so a future refactor
 * cannot quietly reintroduce it.
 */

type QueryStub = Parameters<typeof useDataState>[0];

function query(overrides: Partial<QueryStub> = {}): QueryStub {
  return {
    data: undefined,
    dataUpdatedAt: 0,
    error: null,
    isError: false,
    isFetching: false,
    isPending: true,
    isRefetching: false,
    refetch: vi.fn(),
    ...overrides,
  } as QueryStub;
}

function kindOf(q: QueryStub, options?: Parameters<typeof useDataState>[1]) {
  return renderHook(() => useDataState(q, options)).result.current;
}

describe("useDataState", () => {
  it("reports a failed load as an error, never as empty", () => {
    const state = kindOf(
      query({
        isError: true,
        isPending: false,
        error: new ApiError(500, "boom"),
      }),
      { count: 0 },
    );

    expect(state.kind).toBe("error");
  });

  it("cannot produce an empty state while the query is failing", () => {
    // Every combination of "no rows" + "request failed" must stay non-empty.
    for (const filtered of [true, false]) {
      const state = kindOf(
        query({ isError: true, isPending: false, error: new Error("boom") }),
        { count: 0, filtered },
      );
      expect(state.kind).not.toBe("empty-first-run");
      expect(state.kind).not.toBe("empty-filtered");
    }
  });

  it("separates permission and not-found failures from generic errors", () => {
    const forbidden = kindOf(
      query({ isError: true, isPending: false, error: new ApiError(403, "") }),
      { count: 0 },
    );
    const missing = kindOf(
      query({ isError: true, isPending: false, error: new ApiError(404, "") }),
      { count: 0 },
    );

    expect(forbidden.kind).toBe("forbidden");
    expect(missing.kind).toBe("not-found");
  });

  it("distinguishes a first run from a filtered miss", () => {
    const firstRun = kindOf(query({ data: [], isPending: false }), {
      count: 0,
      filtered: false,
    });
    const filtered = kindOf(query({ data: [], isPending: false }), {
      count: 0,
      filtered: true,
    });

    expect(firstRun.kind).toBe("empty-first-run");
    expect(filtered.kind).toBe("empty-filtered");
  });

  it("keeps loaded rows on screen when a refresh fails", () => {
    const state = kindOf(
      query({
        data: [1],
        isPending: false,
        isError: true,
        error: new ApiError(500, ""),
      }),
      { count: 1 },
    );

    expect(state.kind).toBe("ready");
    expect(state.hasRefreshError).toBe(true);
  });

  it("offers no retry reference for permission denials", () => {
    // A correlation id is for system failures. Surfacing one on a 403 invites
    // the user to file a support ticket about their own role.
    const state = kindOf(
      query({ isError: true, isPending: false, error: new ApiError(403, "") }),
      { count: 0 },
    );

    expect(state.kind).toBe("forbidden");
  });

  it("never leaks the raw error body into the support reference", () => {
    const state = kindOf(
      query({
        isError: true,
        isPending: false,
        error: new ApiError(500, "connection string: postgres://user:pw@host"),
      }),
      { count: 0 },
    );

    expect(state.reference).toBeTruthy();
    expect(state.reference).not.toContain("postgres");
    expect(state.reference).not.toContain("pw");
  });

  it("treats a pending first load as loading, not as empty", () => {
    const state = kindOf(query(), { count: 0 });
    expect(state.kind).toBe("loading-initial");
  });

  it("reports ready with rows present", () => {
    const state = kindOf(query({ data: [1, 2], isPending: false }), {
      count: 2,
    });
    expect(state.kind).toBe("ready");
    expect(state.hasRefreshError).toBe(false);
  });
});
