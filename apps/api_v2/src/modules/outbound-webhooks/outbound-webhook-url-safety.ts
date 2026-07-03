import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const LOCALHOST_HTTP_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);
const BLOCKED_HOSTNAME_SUFFIXES = [".localhost", ".local"] as const;
const BLOCKED_IP_RANGES = buildBlockedIpRanges();

type WebhookUrlInput = {
  url: string;
};

type HostnameInput = {
  hostname: string;
};

type IpAddressInput = {
  address: string;
};

type WebhookTargetContext = {
  target: URL;
  hostname: string;
  protocol: string;
};

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
  input: WebhookUrlInput,
): Promise<URL> {
  return (await resolveOutboundWebhookTarget(input)).url;
}

export async function resolveOutboundWebhookTarget(
  input: WebhookUrlInput,
): Promise<AllowedOutboundWebhookTarget> {
  const target = parseWebhookUrl(input);
  assertWebhookUrlHasNoCredentials({ target });

  const context = webhookTargetContext({ target });
  assertAllowedWebhookProtocol(context);

  if (allowsLocalHttpWebhook(context)) {
    return { url: target };
  }

  assertAllowedWebhookHostname(context);
  return resolvedPinnedTarget(context);
}

function parseWebhookUrl(input: WebhookUrlInput) {
  try {
    return new URL(input.url);
  } catch {
    throw new BlockedOutboundWebhookUrlError("Webhook URL must be absolute");
  }
}

function assertWebhookUrlHasNoCredentials(input: { target: URL }) {
  if (!input.target.username && !input.target.password) return;
  throw new BlockedOutboundWebhookUrlError(
    "Webhook URL must not include credentials",
  );
}

function webhookTargetContext(input: { target: URL }): WebhookTargetContext {
  return {
    target: input.target,
    hostname: normalizeHostname({ hostname: input.target.hostname }),
    protocol: input.target.protocol.toLowerCase(),
  };
}

function assertAllowedWebhookProtocol(context: WebhookTargetContext) {
  if (context.protocol === "https:" || allowsLocalHttpWebhook(context)) return;
  throw new BlockedOutboundWebhookUrlError(
    "Webhook URL must use https://, except localhost HTTP outside production",
  );
}

function allowsLocalHttpWebhook(context: WebhookTargetContext) {
  return (
    context.protocol === "http:" &&
    process.env.NODE_ENV !== "production" &&
    LOCALHOST_HTTP_HOSTS.has(context.hostname)
  );
}

function assertAllowedWebhookHostname(context: WebhookTargetContext) {
  if (!isBlockedHostname({ hostname: context.hostname })) return;
  throw new BlockedOutboundWebhookUrlError();
}

async function resolvedPinnedTarget(
  context: WebhookTargetContext,
): Promise<AllowedOutboundWebhookTarget> {
  const addresses = await resolveTargetAddresses({
    hostname: context.hostname,
  });
  const address = firstAllowedAddress({ addresses });

  return {
    url: context.target,
    address: address.address,
    family: address.family,
  };
}

function normalizeHostname(input: HostnameInput) {
  return input.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

export function isBlockedHostname(input: HostnameInput) {
  const hostname = normalizeHostname(input);
  return (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  );
}

async function resolveTargetAddresses(
  input: HostnameInput,
): Promise<ResolvedAddress[]> {
  const ipVersion = isIP(input.hostname);
  if (ipVersion === 4 || ipVersion === 6) {
    return [{ address: input.hostname, family: ipVersion }];
  }

  return (await lookup(input.hostname, { all: true, verbatim: true })).map(
    ({ address, family }) => ({
      address,
      family: family === 6 ? 6 : 4,
    }),
  );
}

function firstAllowedAddress(input: { addresses: ResolvedAddress[] }) {
  const address = input.addresses[0];
  if (!address || input.addresses.some(isBlockedResolvedAddress)) {
    throw new BlockedOutboundWebhookUrlError();
  }
  return address;
}

function isBlockedResolvedAddress(input: ResolvedAddress) {
  return isBlockedIpAddress({ address: input.address });
}

export function isBlockedIpAddress(input: IpAddressInput) {
  const normalized = normalizeHostname({ hostname: input.address });
  const mappedIpv4 = parseMappedIpv6Address({ address: normalized });
  if (mappedIpv4) return isBlockedIpAddress({ address: mappedIpv4 });

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) return BLOCKED_IP_RANGES.check(normalized, "ipv4");
  if (ipVersion === 6) return BLOCKED_IP_RANGES.check(normalized, "ipv6");
  return true;
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
