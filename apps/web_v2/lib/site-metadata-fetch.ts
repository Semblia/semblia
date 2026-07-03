import { lookup } from "node:dns/promises";
import {
  request as httpRequest,
  type IncomingHttpHeaders,
  type RequestOptions,
} from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";

const MAX_REDIRECTS = 3;
const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local"] as const;
const BLOCKED_IPV4_FIRST_OCTETS = new Set([0, 10, 127]);
const BLOCKED_IPV4_SECOND_OCTET_RANGES = [
  { first: 100, minSecond: 64, maxSecond: 127 },
  { first: 169, minSecond: 254, maxSecond: 254 },
  { first: 172, minSecond: 16, maxSecond: 31 },
  { first: 192, minSecond: 0, maxSecond: 0 },
  { first: 192, minSecond: 168, maxSecond: 168 },
  { first: 198, minSecond: 18, maxSecond: 19 },
  { first: 198, minSecond: 51, maxSecond: 51 },
  { first: 203, minSecond: 0, maxSecond: 0 },
] as const;
const BLOCKED_IPV6_EXACT = new Set(["::", "::1"]);
const BLOCKED_IPV6_PREFIXES = ["fc", "fd", "ff"] as const;

type ResolvedAddress = {
  address: string;
  family: 4 | 6;
};

type AllowedMetadataFetchTarget = {
  url: URL;
  address?: string;
  family?: 4 | 6;
};

type SafeMetadataRequest = (
  target: AllowedMetadataFetchTarget,
  init: RequestInit,
) => Promise<Response>;

export class BlockedMetadataFetchError extends Error {
  constructor(message = "That host isn't allowed.") {
    super(message);
    this.name = "BlockedMetadataFetchError";
  }
}

/** Reject hosts that could let this endpoint reach internal infrastructure. */
export function isBlockedHost(host: string): boolean {
  const normalized = normalizeHost(host);
  return isBlockedHostname(normalized) || isBlockedAddressLiteral(normalized);
}

function normalizeHost(host: string) {
  return host.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

function isBlockedHostname(host: string) {
  return BLOCKED_HOSTS.has(host) || hasBlockedHostnameSuffix(host);
}

function hasBlockedHostnameSuffix(host: string) {
  return BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function isBlockedAddressLiteral(host: string) {
  return isIP(host) !== 0 && isBlockedIpAddress(host);
}

function isBlockedIpAddress(address: string): boolean {
  const h = normalizeHost(address);
  const mappedIpv4 = parseMappedIpv6Address(h);
  if (mappedIpv4) return isBlockedIpv4Address(mappedIpv4);

  const ipVersion = isIP(h);
  if (ipVersion === 4) return isBlockedIpv4Address(h);
  if (ipVersion === 6) return isBlockedIpv6Address(h);
  return false;
}

function parseMappedIpv6Address(address: string) {
  const dotted = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted?.[1]) return dotted[1];

  const hex = address.match(/^::ffff:(?:0:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hex?.[1] || !hex[2]) return null;

  const high = Number.parseInt(hex[1], 16);
  const low = Number.parseInt(hex[2], 16);
  return [(high >> 8) & 255, high & 255, (low >> 8) & 255, low & 255].join(".");
}

function isBlockedIpv4Address(address: string) {
  const [a = 0, b = 0] = address.split(".").map((part) => Number(part));
  return isBlockedFirstIpv4Octet(a) || isBlockedSecondIpv4Octet(a, b);
}

function isBlockedFirstIpv4Octet(value: number) {
  return BLOCKED_IPV4_FIRST_OCTETS.has(value) || value >= 224;
}

function isBlockedSecondIpv4Octet(first: number, second: number) {
  return BLOCKED_IPV4_SECOND_OCTET_RANGES.some((range) =>
    matchesSecondOctetRange(first, second, range),
  );
}

function matchesSecondOctetRange(
  first: number,
  second: number,
  range: (typeof BLOCKED_IPV4_SECOND_OCTET_RANGES)[number],
) {
  return (
    first === range.first &&
    second >= range.minSecond &&
    second <= range.maxSecond
  );
}

function isBlockedIpv6Address(address: string) {
  return [isExactBlockedIpv6, isLinkLocalIpv6, hasBlockedIpv6Prefix].some(
    (rule) => rule(address),
  );
}

function isExactBlockedIpv6(address: string) {
  return BLOCKED_IPV6_EXACT.has(address);
}

function isLinkLocalIpv6(address: string) {
  return /^fe[89ab]/.test(address);
}

function hasBlockedIpv6Prefix(address: string) {
  return BLOCKED_IPV6_PREFIXES.some((prefix) => address.startsWith(prefix));
}

async function resolveFetchTarget(
  input: string,
): Promise<AllowedMetadataFetchTarget> {
  const parsed = new URL(input);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BlockedMetadataFetchError("Only HTTP(S) URLs are allowed.");
  }
  if (parsed.username || parsed.password) {
    throw new BlockedMetadataFetchError("URL credentials are not allowed.");
  }

  const hostname = normalizeHost(parsed.hostname);
  if (isBlockedHostname(hostname)) throw new BlockedMetadataFetchError();

  const addresses = await resolveAddresses(hostname);
  if (!allAddressesAllowed(addresses)) throw new BlockedMetadataFetchError();

  const address = addresses[0];
  if (!address) throw new BlockedMetadataFetchError();

  return {
    url: parsed,
    address: address.address,
    family: address.family,
  };
}

async function resolveAddresses(hostname: string): Promise<ResolvedAddress[]> {
  const ipVersion = isIP(hostname);
  if (ipVersion === 4 || ipVersion === 6) {
    return [{ address: hostname, family: ipVersion }];
  }

  return (await lookup(hostname, { all: true, verbatim: true })).map(
    ({ address, family }) => ({
      address,
      family: family === 6 ? 6 : 4,
    }),
  );
}

function allAddressesAllowed(addresses: ResolvedAddress[]) {
  return (
    addresses.length > 0 &&
    addresses.every(({ address }) => !isBlockedIpAddress(address))
  );
}

export async function fetchWithSafeRedirects(
  initialTarget: string,
  init: RequestInit,
  requestTarget: SafeMetadataRequest = requestPinnedTarget,
): Promise<{ response: Response; finalUrl: string }> {
  let target = await resolveFetchTarget(initialTarget);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await requestTarget(target, {
      ...init,
      redirect: "manual",
    });
    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: target.url.toString() };
    }

    const location = response.headers.get("location");
    if (!location) {
      return { response, finalUrl: target.url.toString() };
    }
    if (redirects === MAX_REDIRECTS) {
      await cancelResponseBody(response);
      throw new BlockedMetadataFetchError("Too many redirects.");
    }

    await cancelResponseBody(response);
    target = await resolveFetchTarget(new URL(location, target.url).toString());
  }

  throw new BlockedMetadataFetchError("Too many redirects.");
}

function requestPinnedTarget(
  target: AllowedMetadataFetchTarget,
  init: RequestInit,
) {
  return new Promise<Response>((resolve, reject) => {
    const request =
      target.url.protocol === "http:" ? httpRequest : httpsRequest;
    const req = request(
      target.url,
      buildRequestOptions(target, init),
      (res) => {
        resolve(
          new Response(Readable.toWeb(res) as ReadableStream<Uint8Array>, {
            status: res.statusCode ?? 502,
            statusText: res.statusMessage,
            headers: responseHeaders(res.headers),
          }),
        );
      },
    );

    req.on("error", reject);
    writeRequestBody(req, init.body);
  });
}

function buildRequestOptions(
  target: AllowedMetadataFetchTarget,
  init: RequestInit,
): RequestOptions {
  const options: RequestOptions = {
    method: init.method,
    headers: Object.fromEntries(new Headers(init.headers).entries()),
    signal: init.signal ?? undefined,
  };

  if (target.address && target.family) {
    options.lookup = (_hostname, _options, callback) => {
      callback(null, target.address as string, target.family as 4 | 6);
    };
  }

  return options;
}

function responseHeaders(headers: IncomingHttpHeaders) {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => result.append(name, entry));
    } else if (value !== undefined) {
      result.set(name, String(value));
    }
  }
  return result;
}

function writeRequestBody(
  request: import("node:http").ClientRequest,
  body: RequestInit["body"] | null | undefined,
) {
  if (body === undefined || body === null) {
    request.end();
    return;
  }

  if (typeof body === "string" || body instanceof Uint8Array) {
    request.end(body);
    return;
  }

  request.destroy(new Error("Unsupported metadata request body type"));
}

async function cancelResponseBody(response: Response) {
  await response.body?.cancel().catch(() => undefined);
}
