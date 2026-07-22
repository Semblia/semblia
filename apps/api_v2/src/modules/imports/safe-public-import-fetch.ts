import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";

import {
  PublicImportUrlProfileError,
  canonicalizePublicImportSourceUrl,
} from "./public-import-url-profile.js";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const SEMBLIA_IMPORT_USER_AGENT = "SembliaImport/1.0 (+https://semblia.com)";
const BLOCKED_IP_RANGES = blockedIpRanges();

export type PublicImportHostPolicy = {
  sourceKey: string;
  exactHosts: readonly string[];
  suffixHosts: readonly string[];
};
type ResolvedAddress = { address: string; family: 4 | 6 };
type TransportResponse = {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: AsyncIterable<Uint8Array> | Iterable<Uint8Array>;
  cancel: () => void;
};
export type PublicImportFetchDependencies = {
  resolveDns: (
    hostname: string,
    signal: AbortSignal,
  ) => Promise<ResolvedAddress[]>;
  request: (input: {
    url: URL;
    address: string;
    family: 4 | 6;
    headers: Record<string, string>;
    signal: AbortSignal;
  }) => Promise<TransportResponse>;
  createTimeoutSignal?: () => AbortSignal;
};
export type PublicImportFetchResult = {
  url: string;
  contentType: "html" | "json";
  body: string;
};

export class SafePublicImportFetchError extends Error {
  constructor(message = "Public import URL is not allowed") {
    super(message);
    this.name = "SafePublicImportFetchError";
  }
}

export async function fetchPublicImport(
  url: string,
  policy: PublicImportHostPolicy,
  dependencies: PublicImportFetchDependencies = defaultDependencies(),
): Promise<PublicImportFetchResult> {
  const signal =
    dependencies.createTimeoutSignal?.() ??
    AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let target = validatePublicImportUrl(url, policy);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const address = await resolveAllowedAddress(
      target,
      dependencies.resolveDns,
      signal,
    );
    let response: TransportResponse;
    try {
      const pendingResponse = Promise.resolve(
        dependencies.request({
          url: target,
          address: address.address,
          family: address.family,
          signal,
          headers: safePublicImportRequestHeaders(),
        }),
      );
      void pendingResponse.then(
        (lateResponse) => {
          if (signal.aborted) safeCancel(lateResponse);
        },
        () => undefined,
      );
      response = await withinDeadline(pendingResponse, signal);
    } catch (error) {
      if (error instanceof SafePublicImportFetchError) throw error;
      throw new SafePublicImportFetchError("Public import request failed");
    }
    if (isRedirect(response.statusCode)) {
      safeCancel(response);
      if (redirects === MAX_REDIRECTS)
        throw new SafePublicImportFetchError(
          "Public import redirect limit exceeded",
        );
      const location = firstHeader(response.headers.location);
      if (!location)
        throw new SafePublicImportFetchError(
          "Public import redirect is invalid",
        );
      target = redirectTarget(location, target, policy);
      continue;
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      safeCancel(response);
      throw new SafePublicImportFetchError(
        "Public import remote response was not successful",
      );
    }
    const contentType = allowedContentType(
      firstHeader(response.headers["content-type"]),
    );
    if (!contentType) {
      safeCancel(response);
      throw new SafePublicImportFetchError(
        "Public import content type is not allowed",
      );
    }
    return {
      url: target.toString(),
      contentType,
      body: await readBoundedText(response, signal),
    };
  }
  throw new SafePublicImportFetchError();
}

export function validatePublicImportUrl(
  value: string,
  policy: PublicImportHostPolicy,
) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SafePublicImportFetchError();
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    isIP(url.hostname.replace(/^\[/, "").replace(/\]$/, "")) ||
    !isDefaultPort(url) ||
    !hostAllowed(url.hostname, policy)
  )
    throw new SafePublicImportFetchError();
  try {
    return canonicalizePublicImportSourceUrl(url, policy.sourceKey);
  } catch (error) {
    if (error instanceof PublicImportUrlProfileError)
      throw new SafePublicImportFetchError();
    throw error;
  }
}

function hostAllowed(hostname: string, policy: PublicImportHostPolicy) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return (
    policy.exactHosts.some((host) => normalized === host.toLowerCase()) ||
    policy.suffixHosts.some((host) =>
      normalized.endsWith(`.${host.toLowerCase()}`),
    )
  );
}

async function resolveAllowedAddress(
  target: URL,
  resolveDns: PublicImportFetchDependencies["resolveDns"],
  signal: AbortSignal,
) {
  let addresses: ResolvedAddress[];
  try {
    addresses = await withinDeadline(
      resolveDns(target.hostname, signal),
      signal,
    );
  } catch (error) {
    if (error instanceof SafePublicImportFetchError) throw error;
    throw new SafePublicImportFetchError("Public import DNS resolution failed");
  }
  if (!addresses.length || addresses.some(({ address }) => unsafeIp(address)))
    throw new SafePublicImportFetchError();
  return addresses[0]!;
}

function unsafeIp(address: string): boolean {
  const mapped = mappedIpv4(address.toLowerCase());
  if (mapped) return unsafeIp(mapped);
  const version = isIP(address);
  return version === 4
    ? BLOCKED_IP_RANGES.check(address, "ipv4")
    : version === 6
      ? BLOCKED_IP_RANGES.check(address, "ipv6")
      : true;
}

function mappedIpv4(address: string) {
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(address)?.[1];
  if (dotted) return dotted;
  const hex = /^::ffff:(?:0:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(address);
  if (!hex) return null;
  const high = Number.parseInt(hex[1]!, 16);
  const low = Number.parseInt(hex[2]!, 16);
  return `${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`;
}

function blockedIpRanges() {
  const list = new BlockList();
  for (const [address, prefix] of [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ] as const)
    list.addSubnet(address, prefix, "ipv4");
  for (const [address, prefix] of [
    ["::", 128],
    ["::1", 128],
    ["fc00::", 7],
    ["fec0::", 10],
    ["fe80::", 10],
    ["ff00::", 8],
    ["2001:db8::", 32],
  ] as const)
    list.addSubnet(address, prefix, "ipv6");
  return list;
}

function isRedirect(status: number) {
  return (
    status === 301 ||
    status === 302 ||
    status === 303 ||
    status === 307 ||
    status === 308
  );
}
function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function allowedContentType(value: string | undefined): "html" | "json" | null {
  const mime = value?.split(";", 1)[0]?.trim().toLowerCase();
  return mime === "text/html" || mime === "application/xhtml+xml"
    ? "html"
    : mime === "application/json" || mime?.endsWith("+json")
      ? "json"
      : null;
}
async function readBoundedText(
  response: TransportResponse,
  signal: AbortSignal,
) {
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    const iterator = bodyIterator(response.body);
    while (true) {
      const result = await withinDeadline(iterator.next(), signal);
      if (result.done) break;
      const chunk = result.value;
      total += chunk.byteLength;
      if (total > MAX_BODY_BYTES)
        throw new SafePublicImportFetchError("Public import body is too large");
      chunks.push(chunk);
    }
  } catch (error) {
    safeCancel(response);
    if (error instanceof SafePublicImportFetchError) throw error;
    throw new SafePublicImportFetchError(
      "Public import response stream failed",
    );
  }
  return Buffer.concat(chunks).toString("utf8");
}

function defaultDependencies(): PublicImportFetchDependencies {
  return {
    resolveDns: async (hostname) =>
      (await lookup(hostname, { all: true, verbatim: true })).map(
        ({ address, family }) => ({ address, family: family === 6 ? 6 : 4 }),
      ),
    request: requestPinnedPublicImport,
  };
}

export function safePublicImportRequestHeaders() {
  return {
    "user-agent": SEMBLIA_IMPORT_USER_AGENT,
    accept: "text/html,application/json;q=0.9",
  };
}

export function requestPinnedPublicImport(input: {
  url: URL;
  address: string;
  family: 4 | 6;
  headers: Record<string, string>;
  signal: AbortSignal;
}): Promise<TransportResponse> {
  return new Promise((resolve, reject) => {
    const request = (
      input.url.protocol === "https:" ? httpsRequest : httpRequest
    )(
      input.url,
      {
        headers: input.headers,
        signal: input.signal,
        family: input.family,
        agent: false,
        lookup: (_host, _options, callback) =>
          callback(null, input.address, input.family),
      },
      (response) =>
        resolve({
          statusCode: response.statusCode ?? 0,
          headers: response.headers,
          body: response,
          cancel: () => response.destroy(),
        }),
    );
    request.once("error", reject);
    request.end();
  });
}

function isDefaultPort(url: URL) {
  return (
    !url.port ||
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  );
}

function redirectTarget(
  location: string,
  current: URL,
  policy: PublicImportHostPolicy,
) {
  try {
    return validatePublicImportUrl(
      new URL(location, current).toString(),
      policy,
    );
  } catch (error) {
    if (error instanceof SafePublicImportFetchError) throw error;
    throw new SafePublicImportFetchError("Public import redirect is invalid");
  }
}

function timeoutError() {
  return new SafePublicImportFetchError("Public import request timed out");
}

function withinDeadline<T>(work: PromiseLike<T>, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(timeoutError());
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(timeoutError());
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(work).then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function safeCancel(response: TransportResponse) {
  try {
    response.cancel();
  } catch {
    /* cancellation errors must not replace the bounded public error */
  }
}

function bodyIterator(
  body: AsyncIterable<Uint8Array> | Iterable<Uint8Array>,
): AsyncIterator<Uint8Array> {
  const asyncIterator = (body as AsyncIterable<Uint8Array>)[
    Symbol.asyncIterator
  ]?.();
  if (asyncIterator) return asyncIterator;
  const iterator = (body as Iterable<Uint8Array>)[Symbol.iterator]();
  return { next: async () => iterator.next() };
}
