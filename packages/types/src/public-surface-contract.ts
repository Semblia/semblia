export const SEMBLIA_RUNTIME_HEADERS = {
  host: "x-semblia-runtime-host",
  timestamp: "x-semblia-runtime-timestamp",
  signature: "x-semblia-runtime-signature",
} as const;

const RUNTIME_SIGNATURE_PREFIX = "v1=";
const SHA256_HEX_LENGTH = 64;
const DNS_LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

export function normalizePublicHostname(value: string): string | null {
  if (!value || value.trim() !== value) return null;

  const withoutScheme = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  if (
    !withoutScheme ||
    /[/?#@\[\]]/.test(withoutScheme) ||
    withoutScheme.split(":").length > 2
  ) {
    return null;
  }

  const [rawHostname, port] = withoutScheme.split(":");
  if (
    !rawHostname ||
    (port !== undefined && (!/^\d{1,5}$/.test(port) || Number(port) > 65535))
  ) {
    return null;
  }

  const hostname = rawHostname.toLowerCase().replace(/\.$/, "");
  if (
    hostname.length > 253 ||
    hostname.includes(":") ||
    hostname.split(".").some((label) => !DNS_LABEL.test(label))
  ) {
    return null;
  }

  return hostname;
}

export function canonicalizeRuntimeRequest(input: {
  timestampSeconds: number;
  method: string;
  requestTarget: string;
  hostname: string;
  bodySha256: string;
}): string {
  const hostname = normalizePublicHostname(input.hostname);
  if (!hostname) throw new Error("Invalid public hostname");

  if (!input.requestTarget.startsWith("/") || input.requestTarget.startsWith("//")) {
    throw new Error("Invalid runtime request target");
  }
  if (input.requestTarget.includes("#")) {
    throw new Error("Runtime request target must not include a fragment");
  }

  const queryDelimiter = input.requestTarget.indexOf("?");
  const rawPathname =
    queryDelimiter === -1
      ? input.requestTarget
      : input.requestTarget.slice(0, queryDelimiter);
  const rawQuery =
    queryDelimiter === -1 ? "" : input.requestTarget.slice(queryDelimiter + 1);
  const pathname = normalizeRuntimePathname(rawPathname);
  const query = parseRuntimeQuery(rawQuery)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey !== rightKey) return leftKey < rightKey ? -1 : 1;
      if (leftValue === rightValue) return 0;
      return leftValue < rightValue ? -1 : 1;
    })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  const requestTarget = `${pathname}${query ? `?${query}` : ""}`;

  return [
    "v1",
    String(input.timestampSeconds),
    input.method.toUpperCase(),
    requestTarget,
    hostname,
    input.bodySha256,
  ].join("\n");
}

function normalizeRuntimePathname(value: string): string {
  const parts: string[] = [];
  for (const part of value.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return `/${parts.join("/")}`;
}

function parseRuntimeQuery(value: string): [string, string][] {
  if (!value) return [];

  return value.split("&").map((entry) => {
    const [rawKey, rawValue = ""] = entry.split("=", 2);
    try {
      return [
        decodeURIComponent(rawKey.replace(/\+/g, " ")),
        decodeURIComponent(rawValue.replace(/\+/g, " ")),
      ];
    } catch {
      throw new Error("Invalid runtime request query");
    }
  });
}

export function formatRuntimeSignature(digest: Uint8Array): string {
  if (digest.length !== SHA256_HEX_LENGTH / 2) {
    throw new RangeError("Runtime signature digest must be 32 bytes");
  }

  return `${RUNTIME_SIGNATURE_PREFIX}${Array.from(digest, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

export function parseRuntimeSignature(value: string): Uint8Array | null {
  const hex = value.startsWith(RUNTIME_SIGNATURE_PREFIX)
    ? value.slice(RUNTIME_SIGNATURE_PREFIX.length)
    : null;
  if (!hex || !/^[0-9a-f]{64}$/.test(hex)) return null;

  return Uint8Array.from(
    { length: SHA256_HEX_LENGTH / 2 },
    (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16),
  );
}
