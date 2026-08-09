import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  V2ImportJobDTO,
  V2ImportJobStatus,
  V2PaginatedResponse,
} from "@workspace/types";
import {
  queryKeys,
  useCreateManualImport,
  useImportJob,
  useImportJobs,
} from "@/hooks/api";
import {
  createManualImport,
  fetchImportJob,
  fetchImportJobs,
} from "@/lib/imports/import-api";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/imports/import-api", () => ({
  createManualImport: vi.fn(),
  fetchImportJob: vi.fn(),
  fetchImportJobs: vi.fn(),
}));

let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function job(status: V2ImportJobStatus): V2ImportJobDTO {
  return {
    id: "job_1",
    projectId: "project_1",
    mode: "MANUAL",
    sourceKey: "manual",
    status,
    totalCount: 1,
    importedCount: 0,
    duplicateCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errorCode: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
  };
}

function page(item: V2ImportJobDTO): V2PaginatedResponse<V2ImportJobDTO> {
  return {
    items: [item],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };
}

function intervalFor(queryKey: readonly unknown[]) {
  const query = client.getQueryCache().find({ queryKey });
  expect(query).toBeDefined();
  const interval = (
    query as unknown as {
      options: {
        refetchInterval?: number | false | ((query: unknown) => number | false);
      };
    }
  ).options.refetchInterval;
  expect(typeof interval).toBe("function");
  return (interval as (query: unknown) => number | false)(query);
}

describe("import API hooks", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    ["QUEUED", 5_000],
    ["RUNNING", 5_000],
    ["SUCCEEDED", false],
    ["PARTIAL", false],
    ["FAILED", false],
  ] as const)(
    "uses the expected polling interval for %s job lists",
    async (status, expectedInterval) => {
      vi.mocked(fetchImportJobs).mockResolvedValue(page(job(status)));
      const { result } = renderHook(
        () => useImportJobs({ slug: "launchpad" }),
        {
          wrapper,
        },
      );
      await waitFor(() =>
        expect(result.current.data?.items[0]?.status).toBe(status),
      );
      expect(intervalFor(queryKeys.imports.jobs("launchpad"))).toBe(
        expectedInterval,
      );
    },
  );

  it("invalidates responses when the first observed state is already terminal", async () => {
    const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    vi.mocked(fetchImportJobs).mockResolvedValue(page(job("SUCCEEDED")));
    const { result } = renderHook(() => useImportJobs({ slug: "launchpad" }), {
      wrapper,
    });
    await waitFor(() =>
      expect(result.current.data?.items[0]?.status).toBe("SUCCEEDED"),
    );
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.responses.all("launchpad"),
      }),
    );
  });

  it("does not poll an unknown future list status", async () => {
    vi.mocked(fetchImportJobs).mockResolvedValue(
      page(job("FUTURE" as V2ImportJobStatus)),
    );
    renderHook(() => useImportJobs({ slug: "launchpad" }), { wrapper });
    await waitFor(() => expect(fetchImportJobs).toHaveBeenCalledTimes(1));
    expect(intervalFor(queryKeys.imports.jobs("launchpad"))).toBe(false);
  });

  it("uses the same active-only polling policy for job detail", async () => {
    vi.mocked(fetchImportJob).mockResolvedValue({
      ...job("RUNNING"),
      items: [],
    });
    const { result } = renderHook(
      () => useImportJob({ slug: "launchpad", jobId: "job_1" }),
      {
        wrapper,
      },
    );
    await waitFor(() => expect(result.current.data?.status).toBe("RUNNING"));
    expect(intervalFor(queryKeys.imports.job("launchpad", "job_1"))).toBe(
      5_000,
    );

    client.setQueryData(queryKeys.imports.job("launchpad", "job_1"), {
      ...job("SUCCEEDED"),
      items: [],
    });
    expect(intervalFor(queryKeys.imports.job("launchpad", "job_1"))).toBe(
      false,
    );
  });

  it.each(["SUCCEEDED", "PARTIAL", "FAILED"] as const)(
    "invalidates responses once when polling observes a %s transition",
    async (terminalStatus) => {
      vi.useFakeTimers();
      const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");
      vi.mocked(fetchImportJobs)
        .mockResolvedValueOnce(page(job("QUEUED")))
        .mockResolvedValueOnce(page(job(terminalStatus)));

      const { result } = renderHook(
        () => useImportJobs({ slug: "launchpad" }),
        {
          wrapper,
        },
      );
      await vi.waitFor(
        () => expect(result.current.data?.items[0]?.status).toBe("QUEUED"),
        { interval: 1 },
      );
      expect(
        invalidate.mock.calls.filter(
          ([filters]) =>
            JSON.stringify(filters?.queryKey) ===
            JSON.stringify(queryKeys.responses.all("launchpad")),
        ),
      ).toHaveLength(0);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      await vi.waitFor(
        () =>
          expect(result.current.data?.items[0]?.status).toBe(terminalStatus),
        { interval: 1 },
      );
      await vi.waitFor(
        () =>
          expect(
            invalidate.mock.calls.filter(
              ([filters]) =>
                JSON.stringify(filters?.queryKey) ===
                JSON.stringify(queryKeys.responses.all("launchpad")),
            ),
          ).toHaveLength(1),
        { interval: 1 },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(fetchImportJobs).toHaveBeenCalledTimes(2);
      expect(
        invalidate.mock.calls.filter(
          ([filters]) =>
            JSON.stringify(filters?.queryKey) ===
            JSON.stringify(queryKeys.responses.all("launchpad")),
        ),
      ).toHaveLength(1);
    },
  );

  it("invalidates import jobs but not responses when a manual import is created", async () => {
    const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    vi.mocked(createManualImport).mockResolvedValue(job("QUEUED"));
    const { result } = renderHook(
      () => useCreateManualImport({ slug: "launchpad" }),
      {
        wrapper,
      },
    );

    await act(async () => {
      await result.current.mutateAsync({
        text: "Useful proof",
        rightsConfirmed: true,
      });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.imports.jobs("launchpad"),
    });
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: queryKeys.responses.all("launchpad"),
    });
  });
});
