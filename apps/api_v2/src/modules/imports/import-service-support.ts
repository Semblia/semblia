import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { Prisma } from "@workspace/database/prisma";
import type { ActorContext } from "../../common/authz/actor-context.js";
import type {
  ImportProvider,
  ImportProviderResource,
} from "./providers/official-import-providers.js";
import type { ImportCatalogSource } from "./import-source-catalog.js";
import type { CreateManualImportBodyDto } from "./imports.dto.js";
import type { PublicImportHostPolicy } from "./safe-public-import-fetch.js";
import { ImportProviderError } from "./providers/official-import-providers.js";

const MAX_RESOURCE_DISCOVERY_PAGES = 50;
const MAX_CONNECTED_IMPORT_ITEMS = 2_000;

export function requireImportBytes(bytes: Buffer | undefined) {
  if (!bytes)
    throw new ConflictException("Import source content is unavailable");
  return bytes;
}

export function publicImportPolicy(
  source: ImportCatalogSource,
): PublicImportHostPolicy {
  return {
    sourceKey: source.key,
    exactHosts: source.publicHosts,
    suffixHosts: source.publicHostSuffixes,
  };
}

export function requireConnectedUser(actor: ActorContext | null | undefined) {
  if (actor?.actorType !== "user" || !actor.userId)
    throw new ForbiddenException(
      "Connected imports require an authenticated user account",
    );
  return actor.userId;
}

export async function findProviderResource(
  provider: ImportProvider,
  token: string,
  resourceId: string,
) {
  let cursor: string | undefined;
  const seen = new Set<string>();
  for (
    let pageIndex = 0;
    pageIndex < MAX_RESOURCE_DISCOVERY_PAGES;
    pageIndex++
  ) {
    const page = await provider.listResources(token, cursor);
    const resource = page.items.find((item) => item.id === resourceId);
    if (resource) return resource;
    if (!page.nextCursor) break;
    if (seen.has(page.nextCursor))
      throw new ConflictException("Provider resource pagination is invalid");
    seen.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  throw new NotFoundException("Connected import resource not found");
}

export function boundedProviderConfig(config: Record<string, string>) {
  const entries = Object.entries(config);
  if (
    entries.length > 20 ||
    entries.some(
      ([key, value]) =>
        !key.trim() ||
        key.length > 120 ||
        !value.trim() ||
        value.length > 2_048,
    )
  )
    throw new ConflictException("Provider resource configuration is invalid");
  return Object.fromEntries(entries);
}

export function boundedProviderResource(resource: ImportProviderResource) {
  const id = resource.id.trim();
  const label = resource.label.trim();
  if (!id || id.length > 255 || !label || label.length > 255)
    throw new ImportProviderError(
      "PROVIDER_INVALID_RESPONSE",
      "Provider returned an invalid resource",
    );
  return { id, label, config: boundedProviderConfig(resource.config) };
}

export function connectedConnectionConfig(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ConflictException("Import connection configuration is invalid");
  const config = value as Record<string, unknown>;
  const providerEntries =
    config.provider &&
    typeof config.provider === "object" &&
    !Array.isArray(config.provider)
      ? Object.entries(config.provider)
      : [];
  if (
    config.rightsConfirmed !== true ||
    !providerEntries.length ||
    providerEntries.some(([, entryValue]) => typeof entryValue !== "string")
  )
    throw new ConflictException("Import connection configuration is invalid");
  return {
    rightsConfirmed: true,
    provider: boundedProviderConfig(
      Object.fromEntries(providerEntries) as Record<string, string>,
    ),
  } as const;
}

export function connectedJobCheckpoint(
  value: Prisma.JsonValue | null,
  fallbackCursor: string | null,
) {
  const config =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const cursor =
    typeof config.cursor === "string" && config.cursor.length <= 4_096
      ? config.cursor
      : config.cursor === null
        ? null
        : fallbackCursor;
  const rowOffset =
    typeof config.rowOffset === "number" &&
    Number.isSafeInteger(config.rowOffset) &&
    config.rowOffset >= 0 &&
    config.rowOffset < MAX_CONNECTED_IMPORT_ITEMS
      ? config.rowOffset
      : 0;
  return { cursor, rowOffset, scheduled: config.scheduled === true };
}

export function publicJobCheckpoint(value: Prisma.JsonValue | null) {
  const config =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return { scheduled: config.scheduled === true };
}

export function publicConnectionMode(
  value: Prisma.JsonValue | null,
): "PUBLIC_URL" | "MIGRATION" {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ConflictException("Import connection configuration is invalid");
  const mode = (value as Record<string, unknown>).mode;
  if (mode !== "PUBLIC_URL" && mode !== "MIGRATION")
    throw new ConflictException("Import connection configuration is invalid");
  return mode;
}

export function publicConnectionConfig(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ConflictException("Import connection configuration is invalid");
  const config = value as Record<string, unknown>;
  if (typeof config.sourceUrl !== "string" || config.rightsConfirmed !== true)
    throw new ConflictException("Import connection configuration is invalid");
  return { sourceUrl: config.sourceUrl, rightsConfirmed: true } as const;
}

export function manualIdentity(body: CreateManualImportBodyDto) {
  return createHash("sha256")
    .update(
      `${body.sourceUrl ?? "manual"}:${body.text.trim()}:${body.authorName ?? ""}`,
    )
    .digest("hex");
}

export function sanitizeConfig(value: Record<string, unknown>) {
  return value as Prisma.InputJsonObject;
}

export function isIdentityRace(error: unknown) {
  return isUniqueRace(
    error,
    ["projectId", "sourceKey", "externalIdHash"],
    "ResponseImportIdentity_projectId_sourceKey_externalIdHash_key",
  );
}
export function isImportItemRace(error: unknown) {
  return isUniqueRace(
    error,
    ["jobId", "rowIndex"],
    "ImportItem_jobId_rowIndex_key",
  );
}
export function isMediaAssetReservationRace(error: unknown) {
  return isUniqueRace(error, ["mediaAssetId"], "ImportJob_mediaAssetId_key");
}
export function isImportConnectionRace(error: unknown) {
  return isUniqueRace(
    error,
    ["projectId", "sourceKey", "externalAccountId"],
    "ImportConnection_projectId_sourceKey_externalAccountId_key",
  );
}
export function isActiveImportConnectionJobRace(error: unknown) {
  return isUniqueRace(
    error,
    ["connectionId"],
    "ImportJob_one_active_connection_job_key",
  );
}

function isUniqueRace(
  error: unknown,
  fields: readonly string[],
  constraintName: string,
) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    hasUniqueTarget(error.meta?.target, fields, constraintName)
  );
}

function hasUniqueTarget(
  target: unknown,
  fields: readonly string[],
  constraintName: string,
) {
  if (typeof target === "string") return target === constraintName;
  return (
    Array.isArray(target) &&
    (target.includes(constraintName) ||
      fields.every((field) => target.includes(field)))
  );
}
