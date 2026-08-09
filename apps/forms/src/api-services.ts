import type { PublicSnapshot } from "@workspace/forms-core";
import { RuntimeApiError, runtimeApiRequest } from "./api-client.js";
import type { FormsRuntimeEnv } from "./env.js";
import type {
  FormsRuntimeServices,
  RuntimeForwardMetadata,
  RuntimeRequestContext,
  RuntimeSubmitResult,
  RuntimeUploadIntentResult,
} from "./types.js";

function runtimeForwardHeaders(
  metadata: RuntimeForwardMetadata | undefined,
): Record<string, string | undefined> {
  return {
    origin: metadata?.origin,
    "user-agent": metadata?.userAgent,
    "x-forwarded-for": metadata?.forwardedFor,
    "idempotency-key": metadata?.idempotencyKey,
  };
}

function projectQuery(context: RuntimeRequestContext) {
  return context.routing.kind === "legacy-project"
    ? `projectId=${encodeURIComponent(context.routing.projectId)}`
    : "";
}

function withQuery(path: string, query: string) {
  return query ? `${path}?${query}` : path;
}

function snapshotPath(context: RuntimeRequestContext) {
  if (context.surface !== "hosted" && context.surface !== "embed") {
    throw new Error("Snapshots require a hosted or embed surface");
  }
  const query = new URLSearchParams({ surface: context.surface });
  if (context.routing.kind === "legacy-project") {
    query.set("projectId", context.routing.projectId);
  }
  return `/runtime/forms/${encodeURIComponent(context.slug)}/snapshot?${query.toString()}`;
}

function submitPath(context: RuntimeRequestContext) {
  return withQuery(
    `/runtime/forms/${encodeURIComponent(context.slug)}/submissions`,
    projectQuery(context),
  );
}

function presignPath(context: RuntimeRequestContext) {
  return withQuery(
    `/runtime/forms/${encodeURIComponent(context.slug)}/uploads/presign`,
    projectQuery(context),
  );
}

function stripStorageKey(
  intent: RuntimeUploadIntentResult & { storageKey?: string },
): RuntimeUploadIntentResult {
  return {
    assetId: intent.assetId,
    uploadUrl: intent.uploadUrl,
    requiredHeaders: intent.requiredHeaders ?? {},
    expiresAt: intent.expiresAt,
  };
}

export function createApiRuntimeServices(
  env: FormsRuntimeEnv,
): FormsRuntimeServices {
  return {
    resolveCollectionHost(hostname) {
      return resolveCollectionHost(env, hostname);
    },
    getSnapshotBySlug(context, metadata) {
      return runtimeApiRequest<PublicSnapshot>({
        env,
        method: "GET",
        path: snapshotPath(context),
        hostname: context.routing.hostname,
        headers: runtimeForwardHeaders({
          ...(metadata ?? {}),
          origin: metadata?.origin ?? context.origin,
        }),
      });
    },
    submitForm(input) {
      return runtimeApiRequest<RuntimeSubmitResult>({
        env,
        method: "POST",
        path: submitPath(input.context),
        hostname: input.context.routing.hostname,
        rawBody: input.rawBody,
        headers: runtimeForwardHeaders({
          ...(input.metadata ?? {}),
          origin: input.metadata?.origin ?? input.context.origin,
        }),
      });
    },
    async presignUpload(input) {
      const intent = await runtimeApiRequest<
        RuntimeUploadIntentResult & { storageKey?: string }
      >({
        env,
        method: "POST",
        path: presignPath(input.context),
        hostname: input.context.routing.hostname,
        rawBody: input.rawBody,
        headers: runtimeForwardHeaders({
          ...(input.metadata ?? {}),
          origin: input.metadata?.origin ?? input.context.origin,
        }),
      });

      return stripStorageKey(intent);
    },
  };
}

export type CollectionHostResolution = {
  requestedHostname: string;
  canonicalHostname: string;
  canonicalUrl: string;
  isCanonical: boolean;
  projectId: string;
  feature: "COLLECTION";
};

type CollectionHostResolverEnvelope = Omit<
  CollectionHostResolution,
  "projectId"
> & {
  resourceType: unknown;
  resourceId: unknown;
  project: unknown;
};

function collectionProjectId(resolution: CollectionHostResolverEnvelope) {
  const project =
    resolution.project &&
    typeof resolution.project === "object" &&
    !Array.isArray(resolution.project)
      ? (resolution.project as Record<string, unknown>)
      : null;
  if (
    resolution.resourceType !== "PROJECT" ||
    typeof resolution.resourceId !== "string" ||
    !resolution.resourceId.trim() ||
    typeof project?.id !== "string" ||
    project.id !== resolution.resourceId
  ) {
    throw new RuntimeApiError(404);
  }
  return resolution.resourceId;
}

export async function resolveCollectionHost(
  env: FormsRuntimeEnv,
  hostname: string,
): Promise<CollectionHostResolution> {
  const resolution = await runtimeApiRequest<CollectionHostResolverEnvelope>({
    env,
    method: "GET",
    path: `/public-surfaces/resolve?${new URLSearchParams({
      hostname,
      feature: "COLLECTION",
    }).toString()}`,
    hostname,
  });
  return {
    requestedHostname: resolution.requestedHostname,
    canonicalHostname: resolution.canonicalHostname,
    canonicalUrl: resolution.canonicalUrl,
    isCanonical: resolution.isCanonical,
    projectId: collectionProjectId(resolution),
    feature: resolution.feature,
  };
}
