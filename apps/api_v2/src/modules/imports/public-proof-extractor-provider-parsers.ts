import * as cheerio from "cheerio";

import type {
  PublicProof,
  PublicProofSource,
} from "./public-proof-extractor.js";

type ProofDependencies = {
  htmlText(value: unknown): string | null;
  makeProof(
    source: PublicProofSource,
    text: string,
    id: string,
    values?: Partial<PublicProof>,
  ): PublicProof;
  numberOrNull(value: unknown): number | null;
  safeDate(value: unknown): string | null;
  safeText(value: unknown): string | null;
  stableId(
    source: PublicProofSource,
    text: string,
    values?: Pick<Partial<PublicProof>, "authorName" | "sourceCreatedAt">,
  ): string;
};

type ProviderCardProfile = {
  card: string;
  text: string;
  author: string;
  rating?: string;
};

type CheerioItem = ReturnType<cheerio.CheerioAPI>;

const PROVIDER_CARD_PROFILES: Record<string, ProviderCardProfile> = {
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

const GENERIC_CARD_SELECTOR =
  "[data-testimonial], [data-testimonial-id], [data-review-id], [data-response-id], [data-post-id]";
const GENERIC_CARD_TEXT_SELECTOR =
  "blockquote, [data-testimonial-text], [data-review-text], .testimonial-text, .review-text, .review-content";
const GENERIC_CARD_AUTHOR_SELECTOR =
  "[data-author-name], [data-reviewer-name], .testimonial-author, .review-author, .reviewer-name";

export function providerCards(
  $: cheerio.CheerioAPI,
  source: PublicProofSource,
  maxItems: number,
  dependencies: ProofDependencies,
) {
  const profile = PROVIDER_CARD_PROFILES[source.sourceKey];
  const results: PublicProof[] = [];
  $(profile?.card ?? GENERIC_CARD_SELECTOR).each((_index, card) => {
    if (results.length >= maxItems) return false;
    const proof = providerCardProof($(card), profile, source, dependencies);
    if (proof) results.push(proof);
  });
  return results;
}

function providerCardProof(
  item: CheerioItem,
  profile: ProviderCardProfile | undefined,
  source: PublicProofSource,
  dependencies: ProofDependencies,
) {
  const text = dependencies.safeText(
    item
      .find(profile?.text ?? GENERIC_CARD_TEXT_SELECTOR)
      .first()
      .text(),
  );
  if (!text) return null;
  const authorName = dependencies.safeText(
    item
      .find(profile?.author ?? GENERIC_CARD_AUTHOR_SELECTOR)
      .first()
      .text(),
  );
  const id =
    dependencies.safeText(cardId(item)) ??
    dependencies.stableId(source, text, { authorName });
  return dependencies.makeProof(source, text, id, {
    authorName,
    ...cardRating(item, profile, dependencies),
  });
}

function cardId(item: CheerioItem) {
  return [
    "data-testimonial",
    "data-testimonial-id",
    "data-review-id",
    "data-response-id",
    "data-post-id",
  ]
    .map((attribute) => item.attr(attribute))
    .find((value): value is string => Boolean(value));
}

function cardRating(
  item: CheerioItem,
  profile: ProviderCardProfile | undefined,
  dependencies: ProofDependencies,
) {
  if (profile?.rating) {
    return { ratingValue: item.find(profile.rating).length, ratingScale: 5 };
  }
  const rating = item.find("[data-rating], .rating").first();
  return {
    ratingValue: dependencies.numberOrNull(
      rating.attr("data-rating") ?? rating.text(),
    ),
    ratingScale: null,
  };
}

export function wordPressRestProof(
  value: unknown,
  source: PublicProofSource,
  maxItems: number,
  dependencies: ProofDependencies,
) {
  if (!isWordPressRestResponse(value, source)) return [];
  const proofs: PublicProof[] = [];
  for (const item of value) {
    if (proofs.length >= maxItems) break;
    const proof = wordPressRestItemProof(item, source, dependencies);
    if (proof) proofs.push(proof);
  }
  return proofs;
}

function isWordPressRestResponse(
  value: unknown,
  source: PublicProofSource,
): value is unknown[] {
  return source.sourceKey === "wordpress" && Array.isArray(value);
}

function wordPressRestItemProof(
  value: unknown,
  source: PublicProofSource,
  dependencies: ProofDependencies,
) {
  if (!isJsonRecord(value)) return null;
  const id = wordPressRestId(value.id, dependencies);
  const content = recordField(value, "content");
  const text = dependencies.htmlText(content?.rendered ?? value.review);
  const authorName = dependencies.safeText(value.author_name ?? value.reviewer);
  const sourceCreatedAt = dependencies.safeDate(
    value.date ?? value.date_created,
  );
  const ratingValue = dependencies.numberOrNull(value.rating);
  if (!id || !text) return null;
  if (!hasWordPressProofEvidence(authorName, sourceCreatedAt, ratingValue)) {
    return null;
  }
  return dependencies.makeProof(source, text, id, {
    authorName,
    ratingValue,
    ratingScale: ratingValue === null ? null : 5,
    sourceCreatedAt,
  });
}

function hasWordPressProofEvidence(
  authorName: string | null,
  sourceCreatedAt: string | null,
  ratingValue: number | null,
): boolean {
  return Boolean(authorName || sourceCreatedAt || ratingValue !== null);
}

function wordPressRestId(value: unknown, dependencies: ProofDependencies) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? String(value)
    : dependencies.safeText(value);
}

export function providerEmbeddedProof(
  $: cheerio.CheerioAPI,
  source: PublicProofSource,
  maxItems: number,
  dependencies: ProofDependencies,
) {
  if (source.sourceKey !== "famewall") return [];
  const items = famewallCardItems($);
  return items
    .slice(0, maxItems)
    .flatMap((item) => famewallCardProof(item, source, dependencies));
}

function famewallCardItems($: cheerio.CheerioAPI) {
  const raw = $("script#__NEXT_DATA__[type='application/json']").first().text();
  if (!raw || raw.length > 1_500_000) return [];
  try {
    const root = JSON.parse(raw) as Record<string, unknown>;
    const items = recordField(
      recordField(root, "props"),
      "pageProps",
    )?.cardItems;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function famewallCardProof(
  value: unknown,
  source: PublicProofSource,
  dependencies: ProofDependencies,
) {
  if (!isJsonRecord(value)) return [];
  const rawText = dependencies.safeText(
    value.message_content ?? value.video_summary,
  );
  const text = rawText ? dependencies.htmlText(rawText) : null;
  const id = dependencies.safeText(value.uuid);
  if (!text || !id) return [];
  const ratingValue = dependencies.numberOrNull(value.star_rating);
  return [
    dependencies.makeProof(source, text, id, {
      authorName: dependencies.safeText(value.author_name),
      authorRole: dependencies.safeText(value.work_title),
      ratingValue,
      ratingScale: ratingValue === null ? null : 5,
      sourceCreatedAt: dependencies.safeDate(value.message_time),
    }),
  ];
}

export function credibleOpenGraph(
  $: cheerio.CheerioAPI,
  source: PublicProofSource,
  dependencies: ProofDependencies,
) {
  const article = openGraphArticle($, dependencies);
  if (!article) return [];
  return [
    dependencies.makeProof(
      source,
      article.text,
      dependencies.stableId(source, article.text, article),
      article,
    ),
  ];
}

function openGraphArticle(
  $: cheerio.CheerioAPI,
  dependencies: ProofDependencies,
) {
  const type = meta($, "og:type");
  const text = dependencies.safeText(meta($, "og:description"));
  const authorName = dependencies.safeText(meta($, "article:author"));
  const sourceCreatedAt = dependencies.safeDate(
    meta($, "article:published_time"),
  );
  return isCredibleOpenGraphArticle(type, text, authorName, sourceCreatedAt)
    ? { text, authorName, sourceCreatedAt }
    : null;
}

function isCredibleOpenGraphArticle(
  type: string | null,
  text: string | null,
  authorName: string | null,
  sourceCreatedAt: string | null,
): text is string {
  return Boolean(
    type === "article" &&
      text &&
      text.length >= 40 &&
      (authorName || sourceCreatedAt),
  );
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

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function recordField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return isJsonRecord(value) ? value : null;
}
