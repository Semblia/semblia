"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { V2ImportJobDTO, V2ImportJobStatus } from "@workspace/types";
import {
  createManualImport,
  fetchImportCatalog,
  fetchImportJob,
  fetchImportJobs,
} from "@/lib/semblia-api";
import { queryKeys } from "./keys";

const ACTIVE_JOB_STATUSES: ReadonlySet<V2ImportJobStatus> = new Set([
  "QUEUED",
  "RUNNING",
]);
const TERMINAL_JOB_STATUSES: ReadonlySet<V2ImportJobStatus> = new Set([
  "SUCCEEDED",
  "PARTIAL",
  "FAILED",
]);
const JOB_POLL_INTERVAL_MS = 5_000;

type ObservedImportJob = Pick<V2ImportJobDTO, "id" | "status">;

function useInvalidateResponsesOnTerminalTransition(
  slug: string,
  jobs: readonly ObservedImportJob[] | undefined,
) {
  const queryClient = useQueryClient();
  const previous = React.useRef<{
    slug: string;
    statuses: Map<string, V2ImportJobStatus>;
  } | null>(null);

  React.useEffect(() => {
    if (!jobs) return;

    const statuses = new Map(jobs.map((job) => [job.id, job.status]));
    const priorSnapshot = previous.current;
    previous.current = { slug, statuses };

    const reachedTerminal = jobs.some((job) => {
      const priorStatus =
        priorSnapshot?.slug === slug
          ? priorSnapshot.statuses.get(job.id)
          : undefined;
      return (
        TERMINAL_JOB_STATUSES.has(job.status) &&
        (priorStatus === undefined || ACTIVE_JOB_STATUSES.has(priorStatus))
      );
    });
    if (reachedTerminal) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.responses.all(slug),
      });
    }
  }, [jobs, queryClient, slug]);
}

export function useImportCatalog(slug: string) {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: queryKeys.imports.catalog(slug),
    queryFn: async () => fetchImportCatalog(await getToken(), slug),
    enabled: isSignedIn === true && !!slug,
  });
}

export function useImportJobs(slug: string) {
  const { getToken, isSignedIn } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.imports.jobs(slug),
    queryFn: async () => fetchImportJobs(await getToken(), slug),
    enabled: isSignedIn === true && !!slug,
    refetchInterval: (query) =>
      query.state.data?.items.some((job) => ACTIVE_JOB_STATUSES.has(job.status))
        ? JOB_POLL_INTERVAL_MS
        : false,
  });
  useInvalidateResponsesOnTerminalTransition(slug, query.data?.items);
  return query;
}

export function useImportJob(slug: string, jobId: string | null) {
  const { getToken, isSignedIn } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.imports.job(slug, jobId ?? "none"),
    queryFn: async () => fetchImportJob(await getToken(), slug, jobId!),
    enabled: isSignedIn === true && !!slug && !!jobId,
    refetchInterval: (query) =>
      query.state.data && ACTIVE_JOB_STATUSES.has(query.state.data.status)
        ? JOB_POLL_INTERVAL_MS
        : false,
  });
  const observedJobs = React.useMemo(
    () => (query.data ? [query.data] : undefined),
    [query.data],
  );
  useInvalidateResponsesOnTerminalTransition(slug, observedJobs);
  return query;
}

export function useCreateManualImport(slug: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof createManualImport>[2]) =>
      createManualImport(await getToken(), slug, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.imports.jobs(slug),
      });
    },
  });
}
