import { ConfigService } from "@nestjs/config";
import { Inject, Injectable } from "@nestjs/common";
import type { ApiV2Env } from "../../../config/env.js";
import type { ImportCandidate } from "../import-normalization.js";
import {
  ImportProviderError,
  ProviderHttpError,
  retryAfterMs,
} from "./official-import-providers.js";
import {
  discardResponse,
  readBoundedJson,
} from "./official-import-provider-json.js";

const PROVIDER_TIMEOUT_MS = 10_000;
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

  isConfigured(sourceKey: string): boolean {
    return this.vimeo.supports(sourceKey) && this.vimeo.isConfigured();
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

  isConfigured() {
    return Boolean(this.accessToken.trim());
  }

  async fetchCandidates(locatorUrl: string, requestedMaxItems: number) {
    if (!this.isConfigured()) throw setupRequired({ provider: "Vimeo" });
    return this.fetchPages(
      this.createFetchContext(locatorUrl, requestedMaxItems),
    );
  }

  private createFetchContext(locatorUrl: string, requestedMaxItems: number) {
    const { videoId, canonicalUrl } = parseVimeoLocator(locatorUrl);
    const maxItems = boundedItemLimit({ requestedMaxItems });
    return {
      videoId,
      canonicalUrl,
      maxItems,
      pageSize: Math.min(VIMEO_PAGE_SIZE, maxItems),
    };
  }

  private async fetchPages(context: VimeoFetchContext) {
    const candidates: ImportCandidate[] = [];
    let page = 1;
    while (this.canFetchNextPage(page, candidates, context)) {
      const payload = await this.fetchPage(context, page);
      const body = requiredRecord(payload);
      const comments = requiredArray({
        record: body,
        key: "data",
        max: context.pageSize,
      });
      this.appendCandidates(candidates, comments, context);
      if (!hasNextVimeoPage(body, comments)) break;
      page += 1;
    }
    return candidates;
  }

  private canFetchNextPage(
    page: number,
    candidates: ImportCandidate[],
    context: VimeoFetchContext,
  ) {
    return page <= MAX_PAGES && candidates.length < context.maxItems;
  }

  private fetchPage(context: VimeoFetchContext, page: number) {
    return this.http.getJson({
      url: `https://api.vimeo.com/videos/${encodeURIComponent(context.videoId)}/comments`,
      headers: { Authorization: `Bearer ${this.accessToken}` },
      params: { per_page: String(context.pageSize), page: String(page) },
    });
  }

  private appendCandidates(
    candidates: ImportCandidate[],
    comments: unknown[],
    context: VimeoFetchContext,
  ) {
    for (const comment of comments) {
      if (candidates.length >= context.maxItems) break;
      candidates.push(vimeoCandidate(requiredRecord(comment), context));
    }
  }
}

type VimeoFetchContext = {
  videoId: string;
  canonicalUrl: string;
  maxItems: number;
  pageSize: number;
};

function boundedItemLimit(input: { requestedMaxItems: number }) {
  if (
    !Number.isInteger(input.requestedMaxItems) ||
    input.requestedMaxItems < 1
  ) {
    throw invalidConfiguration();
  }
  return Math.min(input.requestedMaxItems, MAX_ITEMS);
}

function hasNextVimeoPage(body: Record<string, unknown>, comments: unknown[]) {
  return comments.length > 0 && Boolean(vimeoNextPage(body));
}

function vimeoNextPage(body: Record<string, unknown>) {
  return optionalString({
    record: optionalRecord({ record: body, key: "paging" }) ?? {},
    key: "next",
  });
}

function vimeoCandidate(
  value: Record<string, unknown>,
  context: VimeoFetchContext,
): ImportCandidate {
  const user = optionalRecord({ record: value, key: "user" });
  return {
    externalId: `vimeo:${requiredString({ record: value, key: "uri" })}`,
    sourceUrl: context.canonicalUrl,
    sourceCreatedAt: optionalDate({ record: value, key: "created_on" }),
    text: requiredString({ record: value, key: "text" }),
    ratingValue: null,
    ratingScale: null,
    authorName: user ? optionalString({ record: user, key: "name" }) : null,
    authorRole: null,
    authorCompany: null,
    tags: ["vimeo"],
  };
}

export function parseVimeoLocator(value: string) {
  const url = parseLocator({
    value,
    allowedHosts: ["vimeo.com", "www.vimeo.com", "player.vimeo.com"],
  });
  const segments = url.pathname.split("/").filter(Boolean);
  const videoId = [...segments]
    .reverse()
    .find((segment) => /^\d{1,20}$/.test(segment));
  if (!videoId) throw invalidConfiguration();
  url.search = "";
  url.hash = "";
  return { videoId, canonicalUrl: url.toString() };
}

function parseLocator(input: { value: string; allowedHosts: string[] }) {
  let url: URL;
  try {
    url = new URL(input.value);
  } catch {
    throw invalidConfiguration();
  }
  if (
    url.protocol !== "https:" ||
    !input.allowedHosts.includes(url.hostname.toLowerCase())
  )
    throw invalidConfiguration();
  return url;
}

function setupRequired(input: { provider: string }) {
  return new ImportProviderError(
    "PROVIDER_SETUP_REQUIRED",
    `${input.provider} imports need administrator setup.`,
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

function requiredRecord(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  throw invalidResponse();
}

type RecordFieldInput = { record: Record<string, unknown>; key: string };

function optionalRecord(input: RecordFieldInput) {
  const candidate = input.record[input.key];
  return isRecord(candidate) ? candidate : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requiredArray(input: RecordFieldInput & { max: number }) {
  const candidate = input.record[input.key];
  if (!Array.isArray(candidate) || candidate.length > input.max)
    throw invalidResponse();
  return candidate;
}

function optionalString(input: RecordFieldInput) {
  const candidate = input.record[input.key];
  return typeof candidate === "string" &&
    candidate.trim() &&
    candidate.length <= 10_000
    ? candidate.trim()
    : null;
}

function requiredString(input: RecordFieldInput) {
  const candidate = optionalString(input);
  if (!candidate) throw invalidResponse();
  return candidate;
}

function optionalDate(input: RecordFieldInput) {
  const candidate = optionalString(input);
  if (!candidate || Number.isNaN(Date.parse(candidate))) return null;
  return candidate;
}
