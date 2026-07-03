import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const LOCALHOST_HTTP_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);
const BLOCKED_HOSTNAME_SUFFIXES = [".localhost", ".local"] as const;
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

export type AllowedOutboundWebhookTarget = {
  url: URL;
  address?: string;
  family?: 4 | 6;
};

export class BlockedOutboundWebhookUrlError extends Error {
  constructor(message = "Outbound webhook URL is not allowed") {
    super(message);
    this.name = "BlockedOutboundWebhookUrlError";
  }
}

export async function assertOutboundWebhookTargetAllowed(
  input: string,
): Promise<URL> {
  return (await resolveOutboundWebhookTarget(input)).url;
}

export async function resolveOutboundWebhookTarget(
  input: string,
): Promise<AllowedOutboundWebhookTarget> {
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
    return { url: target };
  }

  if (isBlockedHostname(hostname)) {
    throw new BlockedOutboundWebhookUrlError();
  }

  const addresses = await resolveTargetAddresses(hostname);
  if (!allAddressesAllowed(addresses)) {
    throw new BlockedOutboundWebhookUrlError();
  }

  const address = addresses[0];
  if (!address) {
    throw new BlockedOutboundWebhookUrlError();
  }

  return {
    url: target,
    address: address.address,
    family: address.family,
  };
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

export function isBlockedHostname(hostname: string) {
  const h = normalizeHostname(hostname);
  return BLOCKED_HOSTNAMES.has(h) || hasBlockedHostnameSuffix(h);
}

function hasBlockedHostnameSuffix(hostname: string) {
  return BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

async function resolveTargetAddresses(
  hostname: string,
): Promise<ResolvedAddress[]> {
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

export function isBlockedIpAddress(address: string) {
  const normalized = normalizeHostname(address);
  const mappedIpv4 = parseMappedIpv6Address(normalized);
  if (mappedIpv4) return isBlockedIpv4Address(mappedIpv4);

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) return isBlockedIpv4Address(normalized);
  if (ipVersion === 6) return isBlockedIpv6Address(normalized);
  return true;
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
