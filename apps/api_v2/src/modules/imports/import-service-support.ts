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
  if (entries.length > 20)
    throw new ConflictException("Provider resource configuration is invalid");
  entries.forEach(([key, value]) =>
    assertBoundedProviderConfigEntry(key, value),
  );
  return Object.fromEntries(entries);
}

export function boundedProviderResource(resource: ImportProviderResource) {
  const id = resource.id.trim();
  const label = resource.label.trim();
  assertValidProviderResourceValue(id);
  assertValidProviderResourceValue(label);
  return { id, label, config: boundedProviderConfig(resource.config) };
}

export function connectedConnectionConfig(value: Prisma.JsonValue | null) {
  const config = requireJsonRecord(value);
  if (config.rightsConfirmed !== true)
    throw new ConflictException("Import connection configuration is invalid");
  const providerEntries = Object.entries(requireJsonRecord(config.provider));
  if (!providerEntries.length)
    throw new ConflictException("Import connection configuration is invalid");
  return {
    rightsConfirmed: true,
    provider: boundedProviderConfig(providerConfigFromEntries(providerEntries)),
  } as const;
}

export function connectedJobCheckpoint(
  value: Prisma.JsonValue | null,
  fallbackCursor: string | null,
) {
  const config = jsonRecordOrEmpty(value);
  const cursor = checkpointCursor(config.cursor, fallbackCursor);
  const rowOffset = checkpointRowOffset(config.rowOffset);
  return { cursor, rowOffset, scheduled: config.scheduled === true };
}

export function publicJobCheckpoint(value: Prisma.JsonValue | null) {
  const config = jsonRecordOrEmpty(value);
  return { scheduled: config.scheduled === true };
}

export function publicConnectionMode(
  value: Prisma.JsonValue | null,
): "PUBLIC_URL" | "MIGRATION" {
  const mode = requireJsonRecord(value).mode;
  if (mode !== "PUBLIC_URL" && mode !== "MIGRATION")
    throw new ConflictException("Import connection configuration is invalid");
  return mode;
}

export function publicConnectionConfig(value: Prisma.JsonValue | null) {
  const config = requireJsonRecord(value);
  if (typeof config.sourceUrl !== "string")
    throw new ConflictException("Import connection configuration is invalid");
  if (config.rightsConfirmed !== true)
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

function assertBoundedProviderConfigEntry(key: string, value: string) {
  if (!key.trim()) throwInvalidProviderConfig();
  if (key.length > 120) throwInvalidProviderConfig();
  if (!value.trim()) throwInvalidProviderConfig();
  if (value.length > 2_048) throwInvalidProviderConfig();
}

function throwInvalidProviderConfig(): never {
  throw new ConflictException("Provider resource configuration is invalid");
}

function assertValidProviderResourceValue(value: string) {
  if (!value) throwInvalidProviderResource();
  if (value.length > 255) throwInvalidProviderResource();
}

function throwInvalidProviderResource(): never {
  throw new ImportProviderError(
    "PROVIDER_INVALID_RESPONSE",
    "Provider returned an invalid resource",
  );
}

function requireJsonRecord(value: unknown): Record<string, unknown> {
  if (!value) throwInvalidConnectionConfig();
  if (typeof value !== "object") throwInvalidConnectionConfig();
  if (Array.isArray(value)) throwInvalidConnectionConfig();
  return value as Record<string, unknown>;
}

function jsonRecordOrEmpty(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value !== "object") return {};
  if (Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function throwInvalidConnectionConfig(): never {
  throw new ConflictException("Import connection configuration is invalid");
}

function providerConfigFromEntries(entries: [string, unknown][]) {
  const config: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (typeof value !== "string") throwInvalidConnectionConfig();
    config[key] = value;
  }
  return config;
}

function checkpointCursor(value: unknown, fallbackCursor: string | null) {
  if (typeof value === "string")
    return value.length <= 4_096 ? value : fallbackCursor;
  if (value === null) return null;
  return fallbackCursor;
}

function checkpointRowOffset(value: unknown) {
  if (typeof value !== "number") return 0;
  if (!Number.isSafeInteger(value)) return 0;
  if (value < 0) return 0;
  if (value >= MAX_CONNECTED_IMPORT_ITEMS) return 0;
  return value;
}
