import { ConfigService } from "@nestjs/config";
import { Inject, Injectable } from "@nestjs/common";
import type { ApiV2Env } from "../../../config/env.js";
import type { ImportCandidate } from "../import-normalization.js";
import {
  ImportProviderError,
  ProviderHttpError,
  retryAfterMs,
} from "./official-import-providers.js";

const PROVIDER_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_PAGES = 20;
const MAX_ITEMS = 1_000;
const VIMEO_PAGE_SIZE = 100;

export type OfficialUrlImportHttpClient = {
  getJson(input: {
    url: string;
    headers: Record<string, string>;
    params?: Record<string, string | undefined>;
  }): Promise<unknown>;
};

@Injectable()
export class BoundedOfficialUrlImportHttpClient
  implements OfficialUrlImportHttpClient
{
  async getJson({
    url,
    headers,
    params = {},
  }: Parameters<OfficialUrlImportHttpClient["getJson"]>[0]) {
    const target = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) target.searchParams.set(key, value);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    try {
      const response = await fetch(target, {
        method: "GET",
        headers: { Accept: "application/json", ...headers },
        signal: controller.signal,
      });
      const responseHeaders = Object.fromEntries(response.headers.entries());
      if (!response.ok) {
        await discardResponse(response);
        throw new ProviderHttpError(
          response.status,
          undefined,
          responseHeaders,
        );
      }
      return await readBoundedJson(response);
    } catch (error) {
      throw classifyError(error);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export interface OfficialUrlImportProvider {
  supports(sourceKey: string): boolean;
  fetchCandidates(
    locatorUrl: string,
    maxItems: number,
  ): Promise<ImportCandidate[]>;
}

@Injectable()
export class OfficialUrlImportProviderRegistry {
  private readonly vimeo: VimeoUrlImportProvider;

  constructor(
    @Inject(BoundedOfficialUrlImportHttpClient)
    http: OfficialUrlImportHttpClient,
    @Inject(ConfigService)
    config: ConfigService<ApiV2Env>,
  ) {
    this.vimeo = new VimeoUrlImportProvider(
      http,
      config.get<string>("IMPORTS_VIMEO_ACCESS_TOKEN") ?? "",
    );
  }

  get(sourceKey: string): OfficialUrlImportProvider | null {
    if (this.vimeo.supports(sourceKey)) return this.vimeo;
    return null;
  }
}

export class VimeoUrlImportProvider implements OfficialUrlImportProvider {
  constructor(
    private readonly http: OfficialUrlImportHttpClient,
    private readonly accessToken: string,
  ) {}

  supports(sourceKey: string) {
    return sourceKey === "vimeo";
  }

  async fetchCandidates(locatorUrl: string, requestedMaxItems: number) {
    if (!this.accessToken.trim()) throw setupRequired("Vimeo");
    const maxItems = boundedItemLimit(requestedMaxItems);
    const { videoId, canonicalUrl } = parseVimeoLocator(locatorUrl);
    const candidates: ImportCandidate[] = [];
    let page = 1;
    for (; page <= MAX_PAGES && candidates.length < maxItems; page++) {
      const pageSize = Math.min(VIMEO_PAGE_SIZE, maxItems - candidates.length);
      const payload = await this.http.getJson({
        url: `https://api.vimeo.com/videos/${encodeURIComponent(videoId)}/comments`,
        headers: { Authorization: `Bearer ${this.accessToken}` },
        params: { per_page: String(pageSize), page: String(page) },
      });
      const body = requiredRecord(payload);
      const comments = requiredArray(body, "data", pageSize);
      for (const comment of comments) {
        if (candidates.length >= maxItems) break;
        const value = requiredRecord(comment);
        const id = requiredString(value, "uri");
        const text = requiredString(value, "text");
        const user = optionalRecord(value, "user");
        candidates.push({
          externalId: `vimeo:${id}`,
          sourceUrl: canonicalUrl,
          sourceCreatedAt: optionalDate(value, "created_on"),
          text,
          ratingValue: null,
          ratingScale: null,
          authorName: user ? optionalString(user, "name") : null,
          authorRole: null,
          authorCompany: null,
          tags: ["vimeo"],
        });
      }
      const next = optionalString(optionalRecord(body, "paging") ?? {}, "next");
      if (!next || comments.length === 0) break;
    }
    return candidates;
  }
}

function boundedItemLimit(value: number) {
  if (!Number.isInteger(value) || value < 1) throw invalidConfiguration();
  return Math.min(value, MAX_ITEMS);
}

export function parseVimeoLocator(value: string) {
  const url = parseLocator(value, [
    "vimeo.com",
    "www.vimeo.com",
    "player.vimeo.com",
  ]);
  const segments = url.pathname.split("/").filter(Boolean);
  const videoId = [...segments]
    .reverse()
    .find((segment) => /^\d{1,20}$/.test(segment));
  if (!videoId) throw invalidConfiguration();
  url.hash = "";
  return { videoId, canonicalUrl: url.toString() };
}

function parseLocator(value: string, allowedHosts: string[]) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalidConfiguration();
  }
  if (
    url.protocol !== "https:" ||
    !allowedHosts.includes(url.hostname.toLowerCase())
  )
    throw invalidConfiguration();
  return url;
}

function setupRequired(provider: string) {
  return new ImportProviderError(
    "PROVIDER_SETUP_REQUIRED",
    `${provider} imports need administrator setup.`,
  );
}

function invalidConfiguration() {
  return new ImportProviderError(
    "PROVIDER_INVALID_CONFIGURATION",
    "The import URL is invalid.",
  );
}

function invalidResponse() {
  return new ImportProviderError(
    "PROVIDER_INVALID_RESPONSE",
    "Provider returned an invalid response.",
  );
}

function classifyError(error: unknown) {
  if (error instanceof ImportProviderError) return error;
  if (error instanceof ProviderHttpError) {
    if (error.status === 429)
      return new ImportProviderError(
        "PROVIDER_RATE_LIMITED",
        "Provider rate limit reached.",
        retryAfterMs(error.headers),
      );
    if (error.status === 401 || error.status === 403)
      return new ImportProviderError(
        "PROVIDER_REQUEST_FAILED",
        "Provider request was not authorized.",
      );
  }
  if (error instanceof DOMException && error.name === "AbortError")
    return new ImportProviderError(
      "PROVIDER_TIMEOUT",
      "Provider request timed out.",
    );
  return new ImportProviderError(
    "PROVIDER_REQUEST_FAILED",
    "Provider request failed.",
  );
}

async function discardResponse(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // The status alone is enough for error classification.
  }
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    await discardResponse(response);
    throw invalidResponse();
  }
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw invalidResponse();
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(
      new TextDecoder().decode(concat(chunks, size)),
    ) as unknown;
  } catch {
    throw invalidResponse();
  }
}

function concat(chunks: Uint8Array[], size: number) {
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}

function requiredRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value))
    return value as Record<string, unknown>;
  throw invalidResponse();
}

function optionalRecord(value: Record<string, unknown>, key: string) {
  const candidate = value[key];
  return typeof candidate === "object" &&
    candidate !== null &&
    !Array.isArray(candidate)
    ? (candidate as Record<string, unknown>)
    : null;
}

function requiredArray(
  value: Record<string, unknown>,
  key: string,
  max: number,
) {
  const candidate = value[key];
  if (!Array.isArray(candidate) || candidate.length > max)
    throw invalidResponse();
  return candidate;
}

function optionalString(value: Record<string, unknown>, key: string) {
  const candidate = value[key];
  return typeof candidate === "string" &&
    candidate.trim() &&
    candidate.length <= 10_000
    ? candidate.trim()
    : null;
}

function requiredString(value: Record<string, unknown>, key: string) {
  const candidate = optionalString(value, key);
  if (!candidate) throw invalidResponse();
  return candidate;
}

function optionalDate(value: Record<string, unknown>, key: string) {
  const candidate = optionalString(value, key);
  if (!candidate || Number.isNaN(Date.parse(candidate))) return null;
  return candidate;
}
