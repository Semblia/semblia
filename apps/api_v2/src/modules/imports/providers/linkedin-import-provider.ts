import type { ImportCandidate } from "../import-normalization.js";
import {
  invalidCursor,
  invalidProviderResponse,
  linkedInHeaders,
  MAX_PAGE_SIZE,
  optionalArrayField,
  optionalConfigString,
  optionalString,
  providerTimestamp,
  record,
  requiredArrayField,
  requiredConfigString,
  requiredRecord,
  requiredRecordField,
  requiredString,
  type ImportProviderCandidatePage,
  type ImportProviderHttpClient,
  type ImportProviderHttpResponse,
  type ImportProviderResourcePage,
} from "./official-import-provider-shared.js";

type Request = (
  input: Parameters<ImportProviderHttpClient["getJson"]>[0],
) => Promise<ImportProviderHttpResponse>;

export class LinkedInImportProviderOperations {
  constructor(private readonly request: Request) {}

  async listResources(token: string): Promise<ImportProviderResourcePage> {
    const response = await this.request({
      url: "https://api.linkedin.com/v2/userinfo",
      token,
      headers: linkedInHeaders(),
    });
    return linkedInResources(requiredRecord(response.body));
  }

  async fetchCandidates(
    token: string,
    config: Record<string, unknown>,
    cursor?: string,
  ): Promise<ImportProviderCandidatePage> {
    const response = await this.request({
      url: "https://api.linkedin.com/rest/posts",
      token,
      headers: { ...linkedInHeaders(), "X-RestLi-Method": "FINDER" },
      params: {
        q: "author",
        author: requiredConfigString(config, "authorUrn"),
        start: linkedInStartCursor(cursor),
        count: String(MAX_PAGE_SIZE),
      },
    });
    return linkedInCandidatePage({
      body: requiredRecord(response.body),
      authorName: optionalConfigString(config, "authorName"),
    });
  }
}

function linkedInResources(
  body: Record<string, unknown>,
): ImportProviderResourcePage {
  const id = requiredString(body, "sub");
  return {
    items: [
      {
        id: `urn:li:person:${id}`,
        label: optionalString(body, "name") ?? id,
        config: {
          authorUrn: `urn:li:person:${id}`,
          authorName: optionalString(body, "name") ?? "",
        },
      },
    ],
    nextCursor: null,
  };
}

function linkedInCandidatePage({
  body,
  authorName,
}: {
  body: Record<string, unknown>;
  authorName: string | null;
}): ImportProviderCandidatePage {
  const elements = requiredArrayField(body, "elements", MAX_PAGE_SIZE).map(
    record,
  );
  return {
    candidates: elements.flatMap((post) => linkedInCandidate(post, authorName)),
    nextCursor: linkedInNextStartCursor({
      paging: requiredRecordField(body, "paging"),
    }),
  };
}

function linkedInCandidate(
  post: Record<string, unknown>,
  authorName: string | null,
): ImportCandidate[] {
  const id = optionalString(post, "id");
  const commentary =
    optionalString(record(post.commentary), "text") ??
    optionalString(post, "commentary");
  if (!id || !commentary) return [];
  return [
    {
      externalId: id,
      sourceUrl:
        optionalString(post, "permalink") ??
        `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}`,
      sourceCreatedAt: providerTimestamp(
        post,
        "createdAt",
        invalidProviderResponse,
      ),
      text: commentary,
      ratingValue: null,
      ratingScale: null,
      authorName,
      authorRole: null,
      authorCompany: null,
      tags: [],
    },
  ];
}

function linkedInStartCursor(cursor?: string) {
  if (cursor === undefined) return "0";
  if (!/^\d+$/.test(cursor)) throw invalidCursor();
  const value = Number(cursor);
  if (!Number.isSafeInteger(value) || value < 0) throw invalidCursor();
  return String(value);
}

function linkedInNextStartCursor({
  paging,
}: {
  paging: Record<string, unknown>;
}) {
  const links = optionalArrayField(paging, "links", 10).map(record);
  const next = links.find((link) => optionalString(link, "rel") === "next");
  if (!next) return null;
  return linkedInNextStart(requiredString(next, "href"));
}

function linkedInNextStart(href: string) {
  let target: URL;
  try {
    target = new URL(href, "https://api.linkedin.com");
  } catch {
    throw invalidProviderResponse();
  }
  if (
    target.origin !== "https://api.linkedin.com" ||
    target.pathname !== "/rest/posts"
  ) {
    throw invalidProviderResponse();
  }
  const start = target.searchParams.get("start");
  if (start === null) throw invalidProviderResponse();
  try {
    return linkedInStartCursor(start);
  } catch {
    throw invalidProviderResponse();
  }
}
