import { ImportProviderError } from "./official-import-providers.js";

export function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function requiredRecord(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  throw invalidProviderResponse();
}

export function requiredRecordField(
  ...[value, key]: [Record<string, unknown>, string]
): Record<string, unknown> {
  return requiredRecord(value[key]);
}

export function optionalRecordField(
  ...[value, key]: [Record<string, unknown>, string]
): Record<string, unknown> | null {
  const field = optionalField(value, key);
  return field === null ? null : requiredRecord(field);
}

export function requiredArrayField(
  ...[value, key, maxLength]: [Record<string, unknown>, string, number]
): unknown[] {
  const result = value[key];
  if (!Array.isArray(result) || result.length > maxLength) {
    throw invalidProviderResponse();
  }
  return result;
}

export function optionalArrayField(
  ...[value, key, maxLength]: [Record<string, unknown>, string, number]
): unknown[] {
  if (optionalField(value, key) === null) return [];
  return requiredArrayField(value, key, maxLength);
}

export function optionalEnvelopeString(
  ...[value, key]: [Record<string, unknown>, string]
) {
  const field = optionalField(value, key);
  if (field === null) return null;
  return requiredProviderString(field, 2048);
}

export function requiredInteger(
  ...[value, key]: [Record<string, unknown>, string]
) {
  const result = value[key];
  if (!isNonNegativeSafeInteger(result)) throw invalidProviderResponse();
  return result;
}

export function optionalInteger(
  ...[value, key]: [Record<string, unknown>, string]
): number | null {
  const result = optionalField(value, key);
  if (result === null) return null;
  if (typeof result !== "number" || !Number.isSafeInteger(result)) {
    throw invalidProviderResponse();
  }
  return result;
}

export function invalidProviderResponse() {
  return new ImportProviderError(
    "PROVIDER_INVALID_RESPONSE",
    "Provider returned an invalid response.",
  );
}

export function optionalString(
  ...[value, key]: [Record<string, unknown>, string]
) {
  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim().slice(0, 10_000)
    : null;
}

export function requiredString(
  ...[value, key]: [Record<string, unknown>, string]
) {
  const result = optionalString(value, key);
  if (!result) throw invalidProviderResponse();
  return result;
}

export function optionalConfigString(
  ...[config, key]: [Record<string, unknown>, string]
) {
  const value = config[key];
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 512)
    : null;
}

export function requiredConfigString(
  ...[config, key]: [Record<string, unknown>, string]
) {
  const result = optionalConfigString(config, key);
  if (!result) throw invalidProviderConfiguration();
  return result;
}

export function invalidProviderConfiguration() {
  return new ImportProviderError(
    "PROVIDER_INVALID_CONFIGURATION",
    "Provider configuration is invalid.",
  );
}

export function stringArray(...[value, max]: [unknown, number]) {
  return Array.isArray(value)
    ? value
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
        .slice(0, max)
        .map((item) => item.trim().slice(0, 512))
    : [];
}

export function integer(...[value, key]: [unknown, string]) {
  const result = record(value)[key];
  return typeof result === "number" &&
    Number.isSafeInteger(result) &&
    result >= 0
    ? result
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object") return false;
  if (value === null) return false;
  return !Array.isArray(value);
}

function optionalField(
  value: Record<string, unknown>,
  key: string,
): unknown | null {
  const field = value[key];
  const emptyValues: readonly unknown[] = [undefined, null];
  return emptyValues.includes(field) ? null : field;
}

function requiredProviderString(value: unknown, maxLength: number) {
  if (typeof value !== "string") throw invalidProviderResponse();
  if (!value.trim()) throw invalidProviderResponse();
  if (value.length > maxLength) throw invalidProviderResponse();
  return value;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  if (typeof value !== "number") return false;
  if (!Number.isSafeInteger(value)) return false;
  return value >= 0;
}
