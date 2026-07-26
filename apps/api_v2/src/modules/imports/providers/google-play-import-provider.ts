import type { ImportCandidate } from "../import-normalization.js";
import {
  googlePlayTimestamp,
  invalidProviderResponse,
  MAX_PAGE_SIZE,
  optionalArrayField,
  optionalEnvelopeString,
  optionalInteger,
  optionalRecordField,
  optionalString,
  record,
  requiredArrayField,
  requiredConfigString,
  requiredRecord,
  type ImportProviderCandidatePage,
  type ImportProviderHttpClient,
  type ImportProviderHttpResponse,
  type ImportProviderResourcePage,
} from "./official-import-providers.js";

type Request = (
  input: Parameters<ImportProviderHttpClient["getJson"]>[0],
) => Promise<ImportProviderHttpResponse>;

export class GooglePlayImportProviderOperations {
  constructor(private readonly request: Request) {}

  async listResources(
    token: string,
    cursor?: string,
  ): Promise<ImportProviderResourcePage> {
    const response = await this.request({
      url: "https://playdeveloperreporting.googleapis.com/v1beta1/apps:search",
      token,
      params: { pageSize: String(MAX_PAGE_SIZE), pageToken: cursor },
    });
    return googlePlayResourcePage(requiredRecord(response.body));
  }

  async fetchCandidates(
    token: string,
    config: Record<string, unknown>,
    cursor?: string,
  ): Promise<ImportProviderCandidatePage> {
    const packageName = requiredConfigString(config, "packageName");
    const response = await this.request({
      url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/reviews`,
      token,
      params: { maxResults: String(MAX_PAGE_SIZE), token: cursor },
    });
    return googlePlayCandidatePage({
      body: requiredRecord(response.body),
      packageName,
    });
  }
}

function googlePlayResourcePage(
  body: Record<string, unknown>,
): ImportProviderResourcePage {
  return {
    items: requiredArrayField(body, "apps", MAX_PAGE_SIZE)
      .map(record)
      .flatMap(googlePlayAppResource),
    nextCursor: optionalEnvelopeString(body, "nextPageToken"),
  };
}

function googlePlayAppResource(app: Record<string, unknown>) {
  const packageName = optionalString(app, "packageName");
  if (!packageName) return [];
  return [
    {
      id: packageName,
      label:
        optionalString(app, "displayName") ??
        optionalString(app, "title") ??
        packageName,
      config: { packageName },
    },
  ];
}

function googlePlayCandidatePage({
  body,
  packageName,
}: {
  body: Record<string, unknown>;
  packageName: string;
}): ImportProviderCandidatePage {
  const pagination = optionalRecordField(body, "tokenPagination");
  return {
    candidates: requiredArrayField(body, "reviews", MAX_PAGE_SIZE)
      .map(record)
      .flatMap((review) => googlePlayCandidate({ review, packageName })),
    nextCursor: pagination
      ? optionalEnvelopeString(pagination, "nextPageToken")
      : null,
  };
}

function googlePlayCandidate({
  review,
  packageName,
}: {
  review: Record<string, unknown>;
  packageName: string;
}): ImportCandidate[] {
  const id = optionalString(review, "reviewId");
  if (!id) return [];
  const comment = googlePlayUserComment(review);
  if (!comment) return [];
  const text = optionalString(comment, "text");
  if (!text) return [];
  const rating = googlePlayRating(comment);
  return [
    {
      externalId: id,
      sourceUrl: `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}&reviewId=${encodeURIComponent(id)}`,
      sourceCreatedAt: googlePlayTimestamp(comment, invalidProviderResponse),
      text,
      ratingValue: rating,
      ratingScale: rating === null ? null : 5,
      authorName: optionalString(review, "authorName"),
      authorRole: null,
      authorCompany: null,
      tags: [],
    },
  ];
}

function googlePlayRating(comment: Record<string, unknown>) {
  const rating = optionalInteger(comment, "starRating");
  if (rating === null) return null;
  if (rating < 1) throw invalidProviderResponse();
  if (rating > 5) throw invalidProviderResponse();
  return rating;
}

function googlePlayUserComment(review: Record<string, unknown>) {
  return optionalArrayField(review, "comments", MAX_PAGE_SIZE)
    .map(record)
    .map((value) => optionalRecordField(value, "userComment"))
    .find((value): value is Record<string, unknown> => value !== null);
}
