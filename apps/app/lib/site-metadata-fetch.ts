import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import {
  type AllowedMetadataFetchTarget,
  requestPinnedMetadataTarget,
} from "./site-metadata-http-transport";

const MAX_REDIRECTS = 3;
const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local"] as const;
const BLOCKED_IP_RANGES = buildBlockedIpRanges();

type SiteUrlInput = {
  url: string;
};

type HostInput = {
  host: string;
};

type IpAddressInput = {
  address: string;
};

type ResolvedAddress = {
  address: string;
  family: 4 | 6;
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
export function isBlockedHost(input: HostInput): boolean {
  const host = normalizeHost(input);
  return isBlockedHostname({ host }) || isBlockedAddressLiteral({ host });
}

function normalizeHost(input: HostInput) {
  return input.host.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

function isBlockedHostname(input: HostInput) {
  return (
    BLOCKED_HOSTS.has(input.host) ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => input.host.endsWith(suffix))
  );
}

function isBlockedAddressLiteral(input: HostInput) {
  return isIP(input.host) !== 0 && isBlockedIpAddress({ address: input.host });
}

function isBlockedIpAddress(input: IpAddressInput): boolean {
  const address = normalizeHost({ host: input.address });
  const mappedIpv4 = parseMappedIpv6Address({ address });
  if (mappedIpv4) return isBlockedIpAddress({ address: mappedIpv4 });

  const ipVersion = isIP(address);
  if (ipVersion === 4) return BLOCKED_IP_RANGES.check(address, "ipv4");
  if (ipVersion === 6) return BLOCKED_IP_RANGES.check(address, "ipv6");
  return false;
}

function parseMappedIpv6Address(input: IpAddressInput) {
  const dotted = input.address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted?.[1]) return dotted[1];

  const hex = input.address.match(
    /^::ffff:(?:0:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/,
  );
  if (!hex?.[1] || !hex[2]) return null;

  return hexWordsToIpv4({ highWord: hex[1], lowWord: hex[2] });
}

function hexWordsToIpv4(input: { highWord: string; lowWord: string }) {
  const high = Number.parseInt(input.highWord, 16);
  const low = Number.parseInt(input.lowWord, 16);
  return [(high >> 8) & 255, high & 255, (low >> 8) & 255, low & 255].join(".");
}

async function resolveFetchTarget(
  input: SiteUrlInput,
): Promise<AllowedMetadataFetchTarget> {
  const parsed = new URL(input.url);
  assertHttpProtocol({ url: parsed });
  assertNoUrlCredentials({ url: parsed });

  const host = normalizeHost({ host: parsed.hostname });
  assertAllowedFetchHost({ host });

  const addresses = await resolveAddresses({ host });
  const address = firstAllowedAddress({ addresses });
  return {
    url: parsed,
    address: address.address,
    family: address.family,
  };
}

function assertHttpProtocol(input: { url: URL }) {
  if (input.url.protocol === "http:" || input.url.protocol === "https:") return;
  throw new BlockedMetadataFetchError("Only HTTP(S) URLs are allowed.");
}

function assertNoUrlCredentials(input: { url: URL }) {
  if (!input.url.username && !input.url.password) return;
  throw new BlockedMetadataFetchError("URL credentials are not allowed.");
}

function assertAllowedFetchHost(input: HostInput) {
  if (!isBlockedHostname(input)) return;
  throw new BlockedMetadataFetchError();
}

async function resolveAddresses(input: HostInput): Promise<ResolvedAddress[]> {
  const ipVersion = isIP(input.host);
  if (ipVersion === 4 || ipVersion === 6) {
    return [{ address: input.host, family: ipVersion }];
  }

  return (await lookup(input.host, { all: true, verbatim: true })).map(
    ({ address, family }) => ({
      address,
      family: family === 6 ? 6 : 4,
    }),
  );
}

function firstAllowedAddress(input: { addresses: ResolvedAddress[] }) {
  const address = input.addresses[0];
  if (!address || input.addresses.some(isBlockedResolvedAddress)) {
    throw new BlockedMetadataFetchError();
  }
  return address;
}

function isBlockedResolvedAddress(input: ResolvedAddress) {
  return isBlockedIpAddress({ address: input.address });
}

export async function fetchWithSafeRedirects(
  initialTarget: string,
  init: RequestInit,
  requestTarget: SafeMetadataRequest = requestPinnedMetadataTarget,
): Promise<{ response: Response; finalUrl: string }> {
  let target = await resolveFetchTarget({ url: initialTarget });

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
      await cancelResponseBody({ response });
      throw new BlockedMetadataFetchError("Too many redirects.");
    }

    await cancelResponseBody({ response });
    target = await resolveFetchTarget({
      url: new URL(location, target.url).toString(),
    });
  }

  throw new BlockedMetadataFetchError("Too many redirects.");
}

async function cancelResponseBody(input: { response: Response }) {
  await input.response.body?.cancel().catch(() => undefined);
}

function buildBlockedIpRanges() {
  const blockList = new BlockList();
  blockIpv4Ranges({ blockList });
  blockIpv6Ranges({ blockList });
  return blockList;
}

function blockIpv4Ranges(input: { blockList: BlockList }) {
  input.blockList.addSubnet("0.0.0.0", 8, "ipv4");
  input.blockList.addSubnet("10.0.0.0", 8, "ipv4");
  input.blockList.addSubnet("100.64.0.0", 10, "ipv4");
  input.blockList.addSubnet("127.0.0.0", 8, "ipv4");
  input.blockList.addSubnet("169.254.0.0", 16, "ipv4");
  input.blockList.addSubnet("172.16.0.0", 12, "ipv4");
  input.blockList.addSubnet("192.0.0.0", 24, "ipv4");
  input.blockList.addSubnet("192.168.0.0", 16, "ipv4");
  input.blockList.addSubnet("198.18.0.0", 15, "ipv4");
  input.blockList.addSubnet("198.51.100.0", 24, "ipv4");
  input.blockList.addSubnet("203.0.113.0", 24, "ipv4");
  input.blockList.addSubnet("224.0.0.0", 4, "ipv4");
}

function blockIpv6Ranges(input: { blockList: BlockList }) {
  input.blockList.addSubnet("::", 128, "ipv6");
  input.blockList.addSubnet("::1", 128, "ipv6");
  input.blockList.addSubnet("fc00::", 7, "ipv6");
  input.blockList.addSubnet("fe80::", 10, "ipv6");
  input.blockList.addSubnet("ff00::", 8, "ipv6");
}
