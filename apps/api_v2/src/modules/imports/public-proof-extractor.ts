import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

import {
  canonicalizePublicImportSourceUrl,
  publicImportSourceIdentityHash,
} from "./public-import-url-profile.js";

const MAX_ITEMS = 50;
const MAX_TEXT_LENGTH = 10_000;
const MAX_JSON_DEPTH = 10;
const MAX_JSON_NODES = 200;
const MAX_STRUCTURED_JSON_LENGTH = 64_000;

export type PublicProof = {
  externalId: string;
  sourceUrl: string;
  sourceCreatedAt: string | null;
  text: string;
  ratingValue: number | null;
  ratingScale: number | null;
  authorName: string | null;
  authorRole: string | null;
  authorCompany: string | null;
  tags: string[];
};
export type PublicProofSource = { sourceKey: string; sourceUrl: string };
export type PublicProofContentType = "html" | "json";

export function extractPublicProof(
  body: string,
  source: PublicProofSource,
  contentType: PublicProofContentType,
): PublicProof[] {
  if (contentType === "json") return directJsonProof(body, source);
  const $ = cheerio.load(body);
  const embedded = providerEmbeddedProof($, source);
  if (embedded.length) return embedded;
  const provider = providerCards($, source);
  if (provider.length) return provider;
  const structured = jsonLdProof($, source);
  if (structured.length) return structured;
  return credibleOpenGraph($, source);
}

function directJsonProof(body: string, source: PublicProofSource) {
  if (!body || body.length > MAX_STRUCTURED_JSON_LENGTH) return [];
  try {
    return proofsFromJson(JSON.parse(body), source);
  } catch {
    return [];
  }
}

function jsonLdProof($: cheerio.CheerioAPI, source: PublicProofSource) {
  const proofs: PublicProof[] = [];
  $("script[type='application/ld+json']").each((_index, node) => {
    if (proofs.length >= MAX_ITEMS) return false;
    const raw = $(node).text();
    if (raw.length > MAX_STRUCTURED_JSON_LENGTH) return;
    try {
      proofs.push(...proofsFromJson(JSON.parse(raw), source));
    } catch {
      /* malformed public JSON-LD is ignored */
    }
  });
  return proofs.slice(0, MAX_ITEMS);
}

function proofsFromJson(value: unknown, source: PublicProofSource) {
  const proofs: PublicProof[] = [];
  visitJson(value, 0, { seen: 0, source, proofs });
  return proofs.slice(0, MAX_ITEMS);
}

function visitJson(
  value: unknown,
  depth: number,
  state: { seen: number; source: PublicProofSource; proofs: PublicProof[] },
) {
  if (
    depth > MAX_JSON_DEPTH ||
    state.seen++ > MAX_JSON_NODES ||
    state.proofs.length >= MAX_ITEMS ||
    !value ||
    typeof value !== "object"
  )
    return;
  if (Array.isArray(value)) {
    for (const item of value) visitJson(item, depth + 1, state);
    return;
  }
  const record = value as Record<string, unknown>;
  const types = arrayOfStrings(record["@type"]);
  if (isCredibleStructuredProof(record, types)) {
    const proof = proofFromStructured(record, state.source);
    if (proof) state.proofs.push(proof);
  }
  for (const child of Object.values(record)) visitJson(child, depth + 1, state);
}

function proofFromStructured(
  record: Record<string, unknown>,
  source: PublicProofSource,
) {
  const text = safeText(record.reviewBody ?? record.articleBody ?? record.text);
  if (!text) return null;
  const author = record.author as Record<string, unknown> | string | undefined;
  const rating = record.reviewRating as Record<string, unknown> | undefined;
  const external =
    safeText(record["@id"] ?? record.url) ??
    stableId(source, text, {
      authorName: typeof author === "string" ? author : safeText(author?.name),
      sourceCreatedAt: safeDate(record.datePublished),
    });
  return makeProof(source, text, String(external), {
    authorName: typeof author === "string" ? author : safeText(author?.name),
    ratingValue: numberOrNull(rating?.ratingValue),
    ratingScale: numberOrNull(rating?.bestRating),
    sourceCreatedAt: safeDate(record.datePublished),
  });
}

function providerCards($: cheerio.CheerioAPI, source: PublicProofSource) {
  const profiles: Record<
    string,
    { card: string; text: string; author: string; rating?: string }
  > = {
    "testimonial-to": {
      card: ".testimonial-card.text-testimonial",
      text: ".tweet-text .show-more",
      author: ".font-bold.text-left",
    },
    senja: {
      card: ".sj-bubble-card",
      text: "p.content",
      author: "cite",
      rating: ".sj-star-rating svg",
    },
  };
  const profile = profiles[source.sourceKey];
  const selector = profile?.card ?? "[data-testimonial], [data-review-id]";
  const results: PublicProof[] = [];
  $(selector).each((_index, card) => {
    if (results.length >= MAX_ITEMS) return false;
    const item = $(card);
    const rawId =
      item.attr("data-testimonial") ?? item.attr("data-review-id") ?? null;
    const text = safeText(
      item
        .find(
          profile?.text ?? "blockquote, [data-testimonial-text], .review-text",
        )
        .first()
        .text(),
    );
    if (!text) return;
    const authorName = safeText(
      item
        .find(profile?.author ?? "[data-author-name], .review-author")
        .first()
        .text(),
    );
    const id = safeText(rawId) ?? stableId(source, text, { authorName });
    results.push(
      makeProof(source, text, id, {
        authorName,
        ratingValue: profile?.rating
          ? item.find(profile.rating).length
          : numberOrNull(
              item.find("[data-rating], .rating").first().attr("data-rating") ??
                item.find("[data-rating], .rating").first().text(),
            ),
        ratingScale: profile?.rating ? 5 : null,
      }),
    );
  });
  return results;
}

function providerEmbeddedProof(
  $: cheerio.CheerioAPI,
  source: PublicProofSource,
) {
  if (source.sourceKey !== "famewall") return [];
  const raw = $("script#__NEXT_DATA__[type='application/json']").first().text();
  if (!raw || raw.length > MAX_STRUCTURED_JSON_LENGTH) return [];
  try {
    const root = JSON.parse(raw) as Record<string, unknown>;
    const props = recordField(root, "props");
    const pageProps = recordField(props, "pageProps");
    const items = pageProps?.cardItems;
    if (!Array.isArray(items)) return [];
    return items.slice(0, MAX_ITEMS).flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const item = value as Record<string, unknown>;
      const rawText = safeText(item.message_content ?? item.video_summary);
      const text = rawText
        ? safeText(cheerio.load(rawText).root().text())
        : null;
      const id = safeText(item.uuid);
      if (!text || !id) return [];
      return [
        makeProof(source, text, id, {
          authorName: safeText(item.author_name),
          authorRole: safeText(item.work_title),
          ratingValue: numberOrNull(item.star_rating),
          ratingScale: numberOrNull(item.star_rating) ? 5 : null,
          sourceCreatedAt: safeDate(item.message_time),
        }),
      ];
    });
  } catch {
    return [];
  }
}

function credibleOpenGraph($: cheerio.CheerioAPI, source: PublicProofSource) {
  const type = meta($, "og:type");
  const text = safeText(meta($, "og:description"));
  const author = safeText(meta($, "article:author"));
  const published = safeDate(meta($, "article:published_time"));
  if (
    type !== "article" ||
    !text ||
    text.length < 40 ||
    (!author && !published)
  )
    return [];
  return [
    makeProof(
      source,
      text,
      stableId(source, text, {
        authorName: author,
        sourceCreatedAt: published,
      }),
      {
        authorName: author,
        sourceCreatedAt: published,
      },
    ),
  ];
}

function makeProof(
  source: PublicProofSource,
  text: string,
  id: string,
  values: Partial<PublicProof> = {},
): PublicProof {
  return {
    externalId: `${source.sourceKey}:${id}`,
    sourceUrl: canonicalSourceUrl(source),
    sourceCreatedAt: values.sourceCreatedAt ?? null,
    text,
    ratingValue: values.ratingValue ?? null,
    ratingScale: values.ratingScale ?? null,
    authorName: values.authorName ?? null,
    authorRole: values.authorRole ?? null,
    authorCompany: values.authorCompany ?? null,
    tags: [],
  };
}
function meta($: cheerio.CheerioAPI, property: string) {
  return (
    $("meta")
      .filter(
        (_i, node) =>
          $(node).attr("property") === property ||
          $(node).attr("name") === property,
      )
      .first()
      .attr("content")
      ?.trim() ?? null
  );
}
function safeText(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text && text.length <= MAX_TEXT_LENGTH ? text : null;
}
function safeDate(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}
function numberOrNull(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;
  return Number.isFinite(number) && number >= 0 && number <= 100
    ? number
    : null;
}
function arrayOfStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string"
      ? [value]
      : [];
}
function stableId(
  source: PublicProofSource,
  text: string,
  values: Pick<Partial<PublicProof>, "authorName" | "sourceCreatedAt"> = {},
) {
  return createHash("sha256")
    .update(
      `${source.sourceKey}\0${canonicalSourceUrl(source)}\0${publicImportSourceIdentityHash(source.sourceUrl, source.sourceKey)}\0${text}\0${values.authorName ?? ""}\0${values.sourceCreatedAt ?? ""}`,
    )
    .digest("hex")
    .slice(0, 32);
}
function canonicalSourceUrl(source: PublicProofSource) {
  return canonicalizePublicImportSourceUrl(
    source.sourceUrl,
    source.sourceKey,
  ).toString();
}
function isCredibleStructuredProof(
  record: Record<string, unknown>,
  types: string[],
) {
  const hasAuthor = Boolean(
    safeText(
      typeof record.author === "string"
        ? record.author
        : (record.author as Record<string, unknown> | undefined)?.name,
    ),
  );
  const hasPermalink = Boolean(safeText(record.url ?? record["@id"]));
  const hasDate = Boolean(safeDate(record.datePublished));
  const hasRating = Boolean(
    numberOrNull(
      (record.reviewRating as Record<string, unknown> | undefined)?.ratingValue,
    ),
  );
  if (types.includes("Review"))
    return (
      Boolean(safeText(record.reviewBody)) &&
      (hasAuthor || hasPermalink || hasRating)
    );
  if (types.includes("SocialMediaPosting"))
    return (
      Boolean(safeText(record.text ?? record.articleBody)) &&
      hasAuthor &&
      (hasPermalink || hasDate)
    );
  return (
    types.includes("CreativeWork") &&
    Boolean(safeText(record.text ?? record.reviewBody)) &&
    hasAuthor &&
    hasPermalink
  );
}

function recordField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
