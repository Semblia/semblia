import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const LOCALHOST_HTTP_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export class BlockedOutboundWebhookUrlError extends Error {
  constructor(message = "Outbound webhook URL is not allowed") {
    super(message);
    this.name = "BlockedOutboundWebhookUrlError";
  }
}

export async function assertOutboundWebhookTargetAllowed(
  input: string,
): Promise<URL> {
  let target: URL;

  try {
    target = new URL(input);
  } catch {
    throw new BlockedOutboundWebhookUrlError("Webhook URL must be absolute");
  }

  if (target.username || target.password) {
    throw new BlockedOutboundWebhookUrlError(
      "Webhook URL must not include credentials",
    );
  }

  const hostname = normalizeHostname(target.hostname);
  const protocol = target.protocol.toLowerCase();
  const isLocalHttp =
    protocol === "http:" &&
    process.env.NODE_ENV !== "production" &&
    LOCALHOST_HTTP_HOSTS.has(hostname);

  if (protocol !== "https:" && !isLocalHttp) {
    throw new BlockedOutboundWebhookUrlError(
      "Webhook URL must use https://, except localhost HTTP outside production",
    );
  }

  if (isLocalHttp) {
    return target;
  }

  if (isBlockedHostname(hostname)) {
    throw new BlockedOutboundWebhookUrlError();
  }

  const addresses =
    isIP(hostname) === 0
      ? await lookup(hostname, { all: true, verbatim: true })
      : [{ address: hostname }];
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isBlockedIpAddress(address))
  ) {
    throw new BlockedOutboundWebhookUrlError();
  }

  return target;
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

export function isBlockedHostname(hostname: string) {
  const h = normalizeHostname(hostname);
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h === "metadata.google.internal"
  );
}

export function isBlockedIpAddress(address: string) {
  const normalized = normalizeHostname(address);
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) {
    return isBlockedIpAddress(mapped[1]);
  }

  if (isIP(normalized) === 4) {
    const octets = normalized.split(".").map((part) => Number(part));
    const a = octets[0] ?? 0;
    const b = octets[1] ?? 0;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && (b === 0 || b === 168)) return true;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
    if (a === 203 && b === 0) return true;
    if (a >= 224) return true;
    return false;
  }

  if (isIP(normalized) === 6) {
    const h = normalized;
    if (h === "::" || h === "::1") return true;
    if (/^fe[89ab]/.test(h)) return true;
    if (h.startsWith("fc") || h.startsWith("fd")) return true;
    if (h.startsWith("ff")) return true;
    return false;
  }

  return true;
}
