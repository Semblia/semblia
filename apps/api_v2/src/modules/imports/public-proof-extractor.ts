import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

import {
  canonicalizePublicImportSourceUrl,
  publicImportSourceIdentityHash,
} from "./public-import-url-profile.js";

const DEFAULT_MAX_ITEMS = 50;
const HARD_MAX_ITEMS = 2_000;
const MAX_TEXT_LENGTH = 10_000;
const MAX_JSON_DEPTH = 10;
const MAX_JSON_NODES = 50_000;
const MAX_STRUCTURED_JSON_LENGTH = 1_500_000;
const MAX_STRUCTURED_JSON_SCRIPTS = 50;

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
  maxItems = DEFAULT_MAX_ITEMS,
): PublicProof[] {
  const limit = Number.isFinite(maxItems)
    ? Math.max(1, Math.min(HARD_MAX_ITEMS, Math.trunc(maxItems)))
    : DEFAULT_MAX_ITEMS;
  if (contentType === "json") return directJsonProof(body, source, limit);
  const $ = cheerio.load(body);
  const embedded = providerEmbeddedProof($, source, limit);
  if (embedded.length) return embedded;
  const provider = providerCards($, source, limit);
  if (provider.length) return provider;
  const structured = jsonLdProof($, source, limit);
  if (structured.length) return structured;
  return credibleOpenGraph($, source);
}

function directJsonProof(
  body: string,
  source: PublicProofSource,
  maxItems: number,
) {
  if (!body || body.length > MAX_STRUCTURED_JSON_LENGTH) return [];
  try {
    const value = JSON.parse(body);
    const structured = proofsFromJson(value, source, maxItems);
    return structured.length
      ? structured
      : wordPressRestProof(value, source, maxItems);
  } catch {
    return [];
  }
}

function jsonLdProof(
  $: cheerio.CheerioAPI,
  source: PublicProofSource,
  maxItems: number,
) {
  const proofs: PublicProof[] = [];
  const budget = createJsonTraversalBudget();
  $("script[type='application/ld+json']").each((_index, node) => {
    if (
      proofs.length >= maxItems ||
      budget.nodes >= budget.maxNodes ||
      budget.scripts >= MAX_STRUCTURED_JSON_SCRIPTS
    )
      return false;
    budget.scripts += 1;
    const raw = $(node).text();
    if (raw.length > MAX_STRUCTURED_JSON_LENGTH) return;
    try {
      proofs.push(
        ...proofsFromJson(
          JSON.parse(raw),
          source,
          maxItems - proofs.length,
          budget,
        ),
      );
    } catch {
      /* malformed public JSON-LD is ignored */
    }
  });
  return proofs.slice(0, maxItems);
}

function proofsFromJson(
  value: unknown,
  source: PublicProofSource,
  maxItems: number,
  budget = createJsonTraversalBudget(),
) {
  const proofs: PublicProof[] = [];
  visitJson(value, 0, { budget, source, proofs, maxItems });
  return proofs.slice(0, maxItems);
}

function visitJson(
  value: unknown,
  depth: number,
  state: {
    budget: JsonTraversalBudget;
    source: PublicProofSource;
    proofs: PublicProof[];
    maxItems: number;
  },
) {
  if (depth > MAX_JSON_DEPTH || state.proofs.length >= state.maxItems) return;
  if (!consumeJsonNode(state.budget)) return;
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (jsonTraversalExhausted(state)) break;
      visitJson(item, depth + 1, state);
    }
    return;
  }
  const record = value as Record<string, unknown>;
  const types = arrayOfStrings(record["@type"]);
  if (isCredibleStructuredProof(record, types)) {
    const proof = proofFromStructured(record, state.source);
    if (proof) state.proofs.push(proof);
  }
  for (const child of Object.values(record)) {
    if (jsonTraversalExhausted(state)) break;
    visitJson(child, depth + 1, state);
  }
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

function providerCards(
  $: cheerio.CheerioAPI,
  source: PublicProofSource,
  maxItems: number,
) {
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
  const selector =
    profile?.card ??
    "[data-testimonial], [data-testimonial-id], [data-review-id], [data-response-id], [data-post-id]";
  const results: PublicProof[] = [];
  $(selector).each((_index, card) => {
    if (results.length >= maxItems) return false;
    const item = $(card);
    const rawId =
      item.attr("data-testimonial") ??
      item.attr("data-testimonial-id") ??
      item.attr("data-review-id") ??
      item.attr("data-response-id") ??
      item.attr("data-post-id") ??
      null;
    const text = safeText(
      item
        .find(
          profile?.text ??
            "blockquote, [data-testimonial-text], [data-review-text], .testimonial-text, .review-text, .review-content",
        )
        .first()
        .text(),
    );
    if (!text) return;
    const authorName = safeText(
      item
        .find(
          profile?.author ??
            "[data-author-name], [data-reviewer-name], .testimonial-author, .review-author, .reviewer-name",
        )
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

function wordPressRestProof(
  value: unknown,
  source: PublicProofSource,
  maxItems: number,
) {
  if (source.sourceKey !== "wordpress" || !Array.isArray(value)) return [];
  const proofs: PublicProof[] = [];
  for (const item of value) {
    if (proofs.length >= maxItems) break;
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const id = wordPressRestId(record.id);
    const content = recordField(record, "content");
    const text = htmlText(content?.rendered ?? record.review);
    const authorName = safeText(record.author_name ?? record.reviewer);
    const sourceCreatedAt = safeDate(record.date ?? record.date_created);
    const ratingValue = numberOrNull(record.rating);
    if (
      !id ||
      !text ||
      (!authorName && !sourceCreatedAt && ratingValue === null)
    )
      continue;
    proofs.push(
      makeProof(source, text, id, {
        authorName,
        ratingValue,
        ratingScale: ratingValue === null ? null : 5,
        sourceCreatedAt,
      }),
    );
  }
  return proofs;
}

function wordPressRestId(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? String(value)
    : safeText(value);
}

function htmlText(value: unknown) {
  if (typeof value !== "string") return null;
  return safeText(cheerio.load(value).text());
}

type JsonTraversalBudget = {
  nodes: number;
  maxNodes: number;
  scripts: number;
};

function createJsonTraversalBudget(): JsonTraversalBudget {
  return { nodes: 0, maxNodes: MAX_JSON_NODES, scripts: 0 };
}

function consumeJsonNode(budget: JsonTraversalBudget) {
  if (budget.nodes >= budget.maxNodes) return false;
  budget.nodes += 1;
  return true;
}

function jsonTraversalExhausted(state: {
  budget: JsonTraversalBudget;
  proofs: PublicProof[];
  maxItems: number;
}) {
  return (
    state.budget.nodes >= state.budget.maxNodes ||
    state.proofs.length >= state.maxItems
  );
}

function providerEmbeddedProof(
  $: cheerio.CheerioAPI,
  source: PublicProofSource,
  maxItems: number,
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
    return items.slice(0, maxItems).flatMap((value) => {
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
