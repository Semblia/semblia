import type { PublicSnapshot } from "@workspace/forms-core";

export type RuntimeSurface = "hosted" | "embed" | "proxy";

export type RuntimeTenantRouting =
  | { kind: "hostname"; hostname: string }
  | { kind: "legacy-project"; hostname: string; projectId: string };

export interface RuntimeRequestContext {
  host: string;
  origin?: string;
  routing: RuntimeTenantRouting;
  slug: string;
  path: string;
  surface: RuntimeSurface;
}

export interface RuntimeForwardMetadata {
  origin?: string;
  userAgent?: string;
  forwardedFor?: string;
  idempotencyKey?: string;
  signature?: string;
  timestamp?: string;
}

export interface RuntimeSubmitResult {
  id: string;
  projectId: string;
  formId: string;
  versionId: string;
  version: number;
  reviewStatus: string;
  publishStatus: string;
  createdAt: string;
}

/** Browser-facing presigned upload intent. The API may return storageKey; never expose it. */
export interface RuntimeUploadIntentResult {
  assetId: string;
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
  expiresAt: string;
}

export interface FormsRuntimeServices {
  resolveCollectionHost(hostname: string): Promise<{
    requestedHostname: string;
    canonicalHostname: string;
    canonicalUrl: string;
    isCanonical: boolean;
    projectId: string;
    feature: "COLLECTION";
  }>;
  getSnapshotBySlug(
    context: RuntimeRequestContext,
    metadata?: RuntimeForwardMetadata,
  ): Promise<PublicSnapshot>;
  submitForm(input: {
    context: RuntimeRequestContext;
    rawBody: string;
    metadata?: RuntimeForwardMetadata;
  }): Promise<RuntimeSubmitResult>;
  presignUpload(input: {
    context: RuntimeRequestContext;
    rawBody: string;
    metadata?: RuntimeForwardMetadata;
  }): Promise<RuntimeUploadIntentResult>;
}
