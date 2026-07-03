import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 3;

export class BlockedMetadataFetchError extends Error {
  constructor(message = "That host isn't allowed.") {
    super(message);
    this.name = "BlockedMetadataFetchError";
  }
}

/** Reject hosts that could let this endpoint reach internal infrastructure. */
export function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local"))
    return true;
  if (h === "metadata.google.internal") return true;
  // IPv6 loopback / link-local
  if (
    h === "::1" ||
    h.startsWith("fe80") ||
    h.startsWith("fc") ||
    h.startsWith("fd")
  )
    return true;
  return isBlockedIpAddress(h);
}

function isBlockedIpAddress(address: string): boolean {
  const h = address.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    return isBlockedIpAddress(mapped[1]);
  }

  if (isIP(h) === 4) {
    const [a, b] = h.split(".").map((part) => Number(part));
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

  if (isIP(h) === 6) {
    if (h === "::" || h === "::1") return true;
    if (/^fe[89ab]/.test(h)) return true;
    if (h.startsWith("fc") || h.startsWith("fd")) return true;
    if (h.startsWith("ff")) return true;
  }

  return false;
}

async function assertFetchTargetAllowed(input: string): Promise<URL> {
  const parsed = new URL(input);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BlockedMetadataFetchError("Only HTTP(S) URLs are allowed.");
  }
  if (parsed.username || parsed.password) {
    throw new BlockedMetadataFetchError("URL credentials are not allowed.");
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new BlockedMetadataFetchError();
  }
  if (isIP(parsed.hostname) === 0) {
    const addresses = await lookup(parsed.hostname, {
      all: true,
      verbatim: true,
    });
    if (
      addresses.length === 0 ||
      addresses.some(({ address }) => isBlockedIpAddress(address))
    ) {
      throw new BlockedMetadataFetchError();
    }
  }
  return parsed;
}

export async function fetchWithSafeRedirects(
  initialTarget: string,
  init: RequestInit,
): Promise<{ response: Response; finalUrl: string }> {
  let target = await assertFetchTargetAllowed(initialTarget);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(target.toString(), {
      ...init,
      redirect: "manual",
    });
    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: target.toString() };
    }

    const location = response.headers.get("location");
    if (!location) {
      return { response, finalUrl: target.toString() };
    }
    if (redirects === MAX_REDIRECTS) {
      throw new BlockedMetadataFetchError("Too many redirects.");
    }
    target = await assertFetchTargetAllowed(
      new URL(location, target).toString(),
    );
  }

  throw new BlockedMetadataFetchError("Too many redirects.");
}
