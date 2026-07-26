import { ImportProviderError } from "./official-import-providers.js";

export function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function requiredRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw invalidProviderResponse();
}

export function requiredRecordField(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return requiredRecord(value[key]);
}

export function optionalRecordField(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  if (value[key] === undefined || value[key] === null) return null;
  return requiredRecord(value[key]);
}

export function requiredArrayField(
  value: Record<string, unknown>,
  key: string,
  maxLength: number,
): unknown[] {
  const result = value[key];
  if (!Array.isArray(result) || result.length > maxLength) {
    throw invalidProviderResponse();
  }
  return result;
}

export function optionalArrayField(
  value: Record<string, unknown>,
  key: string,
  maxLength: number,
): unknown[] {
  if (value[key] === undefined || value[key] === null) return [];
  return requiredArrayField(value, key, maxLength);
}

export function optionalEnvelopeString(
  value: Record<string, unknown>,
  key: string,
) {
  const result = value[key];
  if (result === undefined || result === null) return null;
  if (typeof result !== "string" || !result.trim() || result.length > 2048) {
    throw invalidProviderResponse();
  }
  return result;
}

export function requiredInteger(value: Record<string, unknown>, key: string) {
  const result = value[key];
  if (
    typeof result !== "number" ||
    !Number.isSafeInteger(result) ||
    result < 0
  ) {
    throw invalidProviderResponse();
  }
  return result;
}

export function optionalInteger(value: Record<string, unknown>, key: string) {
  const result = value[key];
  if (result === undefined || result === null) return null;
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

export function optionalString(value: Record<string, unknown>, key: string) {
  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim().slice(0, 10_000)
    : null;
}

export function requiredString(value: Record<string, unknown>, key: string) {
  const result = optionalString(value, key);
  if (!result) throw invalidProviderResponse();
  return result;
}

export function optionalConfigString(
  config: Record<string, unknown>,
  key: string,
) {
  const value = config[key];
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 512)
    : null;
}

export function requiredConfigString(
  config: Record<string, unknown>,
  key: string,
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

export function stringArray(value: unknown, max: number) {
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

export function integer(value: unknown, key: string) {
  const result = record(value)[key];
  return typeof result === "number" &&
    Number.isSafeInteger(result) &&
    result >= 0
    ? result
    : null;
}
