"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { V2ImportJobDTO, V2ImportJobStatus } from "@workspace/types";
import {
  createManualImport,
  createMigrationImport,
  createPublicUrlImport,
  createSpreadsheetImport,
  createImportConnection,
  deleteImportConnection,
  disableImportConnection,
  enableImportConnection,
  fetchImportCatalog,
  fetchImportConnections,
  fetchImportJob,
  fetchImportJobs,
  fetchImportProviderResources,
  syncImportConnection,
  updateImportConnection,
} from "@/lib/semblia-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

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

export function useImportCatalog(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: queryKeys.imports.catalog(slug),
    queryFn: async () => fetchImportCatalog(await getToken(), slug),
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useImportJobs(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.imports.jobs(slug),
    queryFn: async () => fetchImportJobs(await getToken(), slug),
    enabled: isSignedIn === true && !!slug,
    refetchInterval: (query) =>
      query.state.data?.items.some((job) => ACTIVE_JOB_STATUSES.has(job.status))
        ? JOB_POLL_INTERVAL_MS
        : false,
    ...liveQueryOptions(options),
  });
  useInvalidateResponsesOnTerminalTransition(slug, query.data?.items);
  return query;
}

export function useImportJob(
  slug: string,
  jobId: string | null,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.imports.job(slug, jobId ?? "none"),
    queryFn: async () => fetchImportJob(await getToken(), slug, jobId!),
    enabled: isSignedIn === true && !!slug && !!jobId,
    refetchInterval: (query) =>
      query.state.data && ACTIVE_JOB_STATUSES.has(query.state.data.status)
        ? JOB_POLL_INTERVAL_MS
        : false,
    ...liveQueryOptions(options),
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

function invalidateImportJobs(
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.imports.jobs(slug),
  });
}

function invalidateImportConnections(
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.imports.connections(slug),
  });
}

export function useCreateSpreadsheetImport(slug: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof createSpreadsheetImport>[2]) =>
      createSpreadsheetImport(await getToken(), slug, body),
    onSuccess: () => invalidateImportJobs(queryClient, slug),
  });
}

export function useCreatePublicUrlImport(slug: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof createPublicUrlImport>[2]) =>
      createPublicUrlImport(await getToken(), slug, body),
    onSuccess: () => invalidateImportJobs(queryClient, slug),
  });
}

export function useCreateMigrationImport(slug: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof createMigrationImport>[2]) =>
      createMigrationImport(await getToken(), slug, body),
    onSuccess: () => invalidateImportJobs(queryClient, slug),
  });
}

export function useImportConnections(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: queryKeys.imports.connections(slug),
    queryFn: async () => fetchImportConnections(await getToken(), slug),
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useImportProviderResources(
  slug: string,
  provider: string | null,
  params?: { cursor?: string },
  options?: ApiQueryOptions & { enabled?: boolean },
) {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: queryKeys.imports.resources(slug, provider ?? "none", params),
    queryFn: async () =>
      fetchImportProviderResources(await getToken(), slug, provider!, params),
    enabled:
      options?.enabled !== false && isSignedIn === true && !!slug && !!provider,
    ...liveQueryOptions(options),
  });
}

export function useCreateImportConnection(slug: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof createImportConnection>[2]) =>
      createImportConnection(await getToken(), slug, body),
    onSuccess: () => invalidateImportConnections(queryClient, slug),
  });
}

export function useUpdateImportConnection(slug: string, connectionId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof updateImportConnection>[3]) =>
      updateImportConnection(await getToken(), slug, connectionId, body),
    onSuccess: () => invalidateImportConnections(queryClient, slug),
  });
}

export function useSyncImportConnection(slug: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) =>
      syncImportConnection(await getToken(), slug, connectionId),
    onSuccess: () => {
      invalidateImportConnections(queryClient, slug);
      invalidateImportJobs(queryClient, slug);
    },
  });
}

function useImportConnectionAction(
  slug: string,
  action:
    | typeof enableImportConnection
    | typeof disableImportConnection
    | typeof deleteImportConnection,
) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) =>
      action(await getToken(), slug, connectionId),
    onSuccess: () => invalidateImportConnections(queryClient, slug),
  });
}

export function useEnableImportConnection(slug: string) {
  return useImportConnectionAction(slug, enableImportConnection);
}

export function useDisableImportConnection(slug: string) {
  return useImportConnectionAction(slug, disableImportConnection);
}

export function useDeleteImportConnection(slug: string) {
  return useImportConnectionAction(slug, deleteImportConnection);
}
