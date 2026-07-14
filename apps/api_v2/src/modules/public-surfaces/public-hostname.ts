import { normalizePublicHostname } from "@workspace/types";

export const SEMBLIA_FREE_HOST_RESERVED_LABELS: ReadonlySet<string> = new Set([
  "www",
  "app",
  "api",
  "admin",
  "assets",
  "static",
  "cdn",
  "status",
  "support",
  "help",
  "mail",
  "autodiscover",
  "forms",
  "walls",
]);

const DNS_LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

export function isValidDnsHostname(value: string): boolean {
  if (normalizePublicHostname(value) !== value || value.length > 253) {
    return false;
  }

  return value.split(".").every((label) => DNS_LABEL.test(label));
}

export function isValidSembliaFreeHostLabel(value: string): boolean {
  return (
    DNS_LABEL.test(value) && !SEMBLIA_FREE_HOST_RESERVED_LABELS.has(value)
  );
}

export function buildSembliaFreeHostnames(input: {
  label: string;
  formsBaseDomain: string;
}): { collection: string; wall: string } {
  const formsBaseDomain = normalizePublicHostname(input.formsBaseDomain);
  if (!isValidSembliaFreeHostLabel(input.label) || !formsBaseDomain) {
    throw new Error("Invalid Semblia free hostname input");
  }

  const collection = `${input.label}.${formsBaseDomain}`;
  const wall = `${input.label}.walls.semblia.com`;
  if (!isValidDnsHostname(collection) || !isValidDnsHostname(wall)) {
    throw new Error("Invalid Semblia free hostname input");
  }

  return { collection, wall };
}
