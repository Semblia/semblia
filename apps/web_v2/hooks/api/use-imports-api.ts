"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { V2ImportJobDTO, V2ImportJobStatus } from "@workspace/types";
import {
  createImportConnection,
  createManualImport,
  createMigrationImport,
  createPublicUrlImport,
  createSpreadsheetImport,
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
} from "@/lib/imports/import-api";
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

type ImportScope = { slug: string };
type ImportQueryContext = ImportScope & { options?: ApiQueryOptions };
type ImportJobContext = ImportQueryContext & { jobId: string | null };
type ImportProviderResourcesContext = ImportQueryContext & {
  provider: string | null;
  params?: { cursor?: string };
  options?: ApiQueryOptions & { enabled?: boolean };
};
type ImportConnectionScope = ImportScope & { connectionId: string };
type ObservedImportJob = Pick<V2ImportJobDTO, "id" | "status">;
type ImportInvalidation = "jobs" | "connections";

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

export function useImportCatalog({ slug, options }: ImportQueryContext) {
  return useAuthenticatedImportQuery({
    scope: { slug },
    options,
    queryKey: queryKeys.imports.catalog(slug),
    request: fetchImportCatalog,
  });
}

export function useImportJobs({ slug, options }: ImportQueryContext) {
  const { getToken, isSignedIn } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.imports.jobs(slug),
    queryFn: async () => fetchImportJobs({ token: await getToken(), slug }),
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

export function useImportJob({ slug, jobId, options }: ImportJobContext) {
  const { getToken, isSignedIn } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.imports.job(slug, jobId ?? "none"),
    queryFn: async () =>
      fetchImportJob({ token: await getToken(), slug, jobId: jobId! }),
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

export function useCreateManualImport(scope: ImportScope) {
  return useImportBodyMutation<
    Parameters<typeof createManualImport>[0]["body"]
  >({
    scope,
    request: createManualImport,
    invalidations: ["jobs"],
  });
}

export function useCreateSpreadsheetImport(scope: ImportScope) {
  return useImportBodyMutation<
    Parameters<typeof createSpreadsheetImport>[0]["body"]
  >({
    scope,
    request: createSpreadsheetImport,
    invalidations: ["jobs"],
  });
}

export function useCreatePublicUrlImport(scope: ImportScope) {
  return useImportBodyMutation<
    Parameters<typeof createPublicUrlImport>[0]["body"]
  >({
    scope,
    request: createPublicUrlImport,
    invalidations: ["jobs"],
  });
}

export function useCreateMigrationImport(scope: ImportScope) {
  return useImportBodyMutation<
    Parameters<typeof createMigrationImport>[0]["body"]
  >({
    scope,
    request: createMigrationImport,
    invalidations: ["jobs"],
  });
}

export function useImportConnections({ slug, options }: ImportQueryContext) {
  return useAuthenticatedImportQuery({
    scope: { slug },
    options,
    queryKey: queryKeys.imports.connections(slug),
    request: fetchImportConnections,
  });
}

export function useImportProviderResources({
  slug,
  provider,
  params,
  options,
}: ImportProviderResourcesContext) {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: queryKeys.imports.resources(slug, provider ?? "none", params),
    queryFn: async () =>
      fetchImportProviderResources({
        token: await getToken(),
        slug,
        provider: provider!,
        params,
      }),
    enabled:
      options?.enabled !== false && isSignedIn === true && !!slug && !!provider,
    ...liveQueryOptions(options),
  });
}

export function useCreateImportConnection(scope: ImportScope) {
  return useImportBodyMutation<
    Parameters<typeof createImportConnection>[0]["body"]
  >({
    scope,
    request: createImportConnection,
    invalidations: ["connections"],
  });
}

export function useUpdateImportConnection(scope: ImportConnectionScope) {
  const { connectionId } = scope;
  return useImportMutation<
    Parameters<typeof updateImportConnection>[0]["body"]
  >({
    scope,
    invalidations: ["connections"],
    mutationFn: async ({ token, slug, variables }) =>
      updateImportConnection({ token, slug, connectionId, body: variables }),
  });
}

export function useSyncImportConnection(scope: ImportScope) {
  return useImportConnectionAction({
    scope,
    action: syncImportConnection,
    invalidations: ["connections", "jobs"],
  });
}

export function useEnableImportConnection(scope: ImportScope) {
  return useImportConnectionAction({
    scope,
    action: enableImportConnection,
    invalidations: ["connections"],
  });
}

export function useDisableImportConnection(scope: ImportScope) {
  return useImportConnectionAction({
    scope,
    action: disableImportConnection,
    invalidations: ["connections"],
  });
}

export function useDeleteImportConnection(scope: ImportScope) {
  return useImportConnectionAction({
    scope,
    action: deleteImportConnection,
    invalidations: ["connections"],
  });
}

function useImportBodyMutation<TBody>(input: {
  scope: ImportScope;
  request: (input: {
    token: string | null;
    slug: string;
    body: TBody;
  }) => Promise<unknown>;
  invalidations: readonly ImportInvalidation[];
}) {
  return useImportMutation<TBody>({
    scope: input.scope,
    invalidations: input.invalidations,
    mutationFn: ({ token, slug, variables }) =>
      input.request({ token, slug, body: variables }),
  });
}

function useAuthenticatedImportQuery<TData>(input: {
  scope: ImportScope;
  options?: ApiQueryOptions;
  queryKey: readonly unknown[];
  request: (input: { token: string | null; slug: string }) => Promise<TData>;
}) {
  const { options, queryKey, request, scope } = input;
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey,
    queryFn: async () => request({ token: await getToken(), slug: scope.slug }),
    enabled: isSignedIn === true && !!scope.slug,
    ...liveQueryOptions(options),
  });
}

function useImportConnectionAction(input: {
  scope: ImportScope;
  action: (input: {
    token: string | null;
    slug: string;
    connectionId: string;
  }) => Promise<unknown>;
  invalidations: readonly ImportInvalidation[];
}) {
  return useImportMutation<string>({
    scope: input.scope,
    invalidations: input.invalidations,
    mutationFn: ({ token, slug, variables }) =>
      input.action({ token, slug, connectionId: variables }),
  });
}

function useImportMutation<TVariables>(input: {
  scope: ImportScope;
  invalidations: readonly ImportInvalidation[];
  mutationFn: (input: {
    token: string | null;
    slug: string;
    variables: TVariables;
  }) => Promise<unknown>;
}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: TVariables) =>
      input.mutationFn({
        token: await getToken(),
        slug: input.scope.slug,
        variables,
      }),
    onSuccess: () =>
      invalidateImportQueries(
        queryClient,
        input.scope.slug,
        input.invalidations,
      ),
  });
}

function invalidateImportQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string,
  invalidations: readonly ImportInvalidation[],
) {
  for (const invalidation of invalidations) {
    const queryKey =
      invalidation === "jobs"
        ? queryKeys.imports.jobs(slug)
        : queryKeys.imports.connections(slug);
    void queryClient.invalidateQueries({ queryKey });
  }
}
