import type {
  V2ImportCatalogSourceDTO,
  V2ImportConnectionDTO,
  V2ImportJobDetailDTO,
  V2ImportJobDTO,
  V2ImportProviderResourcePageDTO,
  V2PaginatedResponse,
  V2SpreadsheetImportPreviewDTO,
} from "@workspace/types";

import { api } from "../semblia-api";

export type ImportApiContext = {
  token: string | null;
  slug: string;
};
type ImportApiRequest = {
  context: ImportApiContext;
  resource: string;
  body?: unknown;
  method?: "POST" | "PATCH" | "DELETE";
  params?: Record<string, string | number | boolean | undefined>;
};
export type CreateManualImportRequest = ImportApiContext & {
  body: {
    sourceKey?: string;
    text: string;
    authorName?: string;
    authorRole?: string;
    authorCompany?: string;
    ratingValue?: number;
    ratingScale?: number;
    sourceUrl?: string;
    rightsConfirmed: true;
  };
};
export type CreateSpreadsheetImportRequest = ImportApiContext & {
  body: {
    assetId: string;
    sourceKey?: string;
    mapping: {
      sheetName: string;
      text: string;
      authorName?: string;
      authorRole?: string;
      authorCompany?: string;
      ratingValue?: string;
      ratingScale?: string;
      sourceUrl?: string;
      sourceCreatedAt?: string;
      tags?: string;
    };
    rightsConfirmed: true;
  };
};
type PublicImportBody = {
  sourceKey: string;
  sourceUrl: string;
  rightsConfirmed: true;
};
type PublicImportRequest = ImportApiContext & { body: PublicImportBody };
type ImportConnectionRequest = ImportApiContext & { connectionId: string };

export function fetchImportCatalog(context: ImportApiContext) {
  return requestImport<V2ImportCatalogSourceDTO[]>({
    context,
    resource: "catalog",
  });
}

export function fetchImportJobs(
  input: ImportApiContext & { params?: { page?: number; pageSize?: number } },
) {
  return requestImport<V2PaginatedResponse<V2ImportJobDTO>>({
    context: input,
    resource: "jobs",
    params: input.params,
  });
}

export function fetchImportJob(input: ImportApiContext & { jobId: string }) {
  return requestImport<V2ImportJobDetailDTO>({
    context: input,
    resource: `jobs/${encodeURIComponent(input.jobId)}`,
  });
}

export function previewSpreadsheetImport(
  input: ImportApiContext & { assetId: string },
) {
  return requestImport<V2SpreadsheetImportPreviewDTO>({
    context: input,
    resource: "spreadsheet/preview",
    method: "POST",
    body: { assetId: input.assetId },
  });
}

export function createManualImport(input: CreateManualImportRequest) {
  return createImportJob({ input, mode: "manual" });
}

export function createSpreadsheetImport(input: CreateSpreadsheetImportRequest) {
  return createImportJob({ input, mode: "spreadsheet" });
}

export function createPublicUrlImport(input: PublicImportRequest) {
  return createImportJob({ input, mode: "public-url" });
}

export function createMigrationImport(input: PublicImportRequest) {
  return createImportJob({ input, mode: "migration" });
}

export function fetchImportConnections(context: ImportApiContext) {
  return requestImport<V2ImportConnectionDTO[]>({
    context,
    resource: "connections",
  });
}

export function fetchImportProviderResources(
  input: ImportApiContext & {
    provider: string;
    params?: { cursor?: string };
  },
) {
  return requestImport<V2ImportProviderResourcePageDTO>({
    context: input,
    resource: `providers/${encodeURIComponent(input.provider)}/resources`,
    params: input.params,
  });
}

export function createImportConnection(
  input: ImportApiContext & {
    body:
      | {
          sourceKey:
            | "x"
            | "linkedin"
            | "youtube"
            | "google-business"
            | "google-play";
          resourceId: string;
          rightsConfirmed: true;
          autoSyncEnabled?: boolean;
        }
      | {
          sourceKey: string;
          sourceUrl: string;
          mode: "PUBLIC_URL" | "MIGRATION";
          rightsConfirmed: true;
          autoSyncEnabled?: boolean;
        };
  },
) {
  return requestImport<V2ImportConnectionDTO>({
    context: input,
    resource: "connections",
    method: "POST",
    body: input.body,
  });
}

export function updateImportConnection(
  input: ImportConnectionRequest & { body: { autoSyncEnabled: boolean } },
) {
  return requestImport<V2ImportConnectionDTO>({
    context: input,
    resource: connectionResource(input),
    method: "PATCH",
    body: input.body,
  });
}

export function syncImportConnection(input: ImportConnectionRequest) {
  return mutateImportConnection<V2ImportJobDTO>({ input, operation: "sync" });
}

export function enableImportConnection(input: ImportConnectionRequest) {
  return mutateImportConnection<V2ImportConnectionDTO>({
    input,
    operation: "enable",
  });
}

export function disableImportConnection(input: ImportConnectionRequest) {
  return mutateImportConnection<V2ImportConnectionDTO>({
    input,
    operation: "disable",
  });
}

export function deleteImportConnection(input: ImportConnectionRequest) {
  return requestImport<void>({
    context: input,
    resource: connectionResource(input),
    method: "DELETE",
  });
}

function createImportJob({
  input,
  mode,
}: {
  input: ImportApiContext & { body: unknown };
  mode: string;
}) {
  return requestImport<V2ImportJobDTO>({
    context: input,
    resource: `jobs/${mode}`,
    method: "POST",
    body: input.body,
  });
}

function mutateImportConnection<T>({
  input,
  operation,
}: {
  input: ImportConnectionRequest;
  operation: string;
}) {
  return requestImport<T>({
    context: input,
    resource: `${connectionResource(input)}/${operation}`,
    method: "POST",
  });
}

function connectionResource(input: ImportConnectionRequest) {
  return `connections/${encodeURIComponent(input.connectionId)}`;
}

function requestImport<T>(request: ImportApiRequest) {
  return api<T>(
    importResourcePath(request),
    request.context.token,
    importRequestOptions(request),
  );
}

function importResourcePath(request: ImportApiRequest) {
  return `/projects/${encodeURIComponent(request.context.slug)}/imports/${request.resource}`;
}

function importRequestOptions(request: ImportApiRequest) {
  return {
    method: request.method,
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
    params: request.params,
  };
}
