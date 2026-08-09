import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

import {
  credibleOpenGraph,
  providerCards,
  providerEmbeddedProof,
  wordPressRestProof,
} from "./public-proof-extractor-provider-parsers.js";
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

const PROOF_DEPENDENCIES = {
  htmlText,
  makeProof,
  numberOrNull,
  safeDate,
  safeText,
  stableId,
};

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
  const embedded = providerEmbeddedProof($, source, limit, PROOF_DEPENDENCIES);
  if (embedded.length) return embedded;
  const provider = providerCards($, source, limit, PROOF_DEPENDENCIES);
  if (provider.length) return provider;
  const structured = jsonLdProof($, source, limit);
  if (structured.length) return structured;
  return credibleOpenGraph($, source, PROOF_DEPENDENCIES);
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
      : wordPressRestProof(value, source, maxItems, PROOF_DEPENDENCIES);
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
    if (shouldStopJsonLdParsing(proofs, maxItems, budget)) return false;
    budget.scripts += 1;
    const raw = $(node).text();
    if (!isStructuredJsonScript(raw)) return;
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

function shouldStopJsonLdParsing(
  proofs: PublicProof[],
  maxItems: number,
  budget: JsonTraversalBudget,
) {
  return (
    proofs.length >= maxItems ||
    budget.nodes >= budget.maxNodes ||
    budget.scripts >= MAX_STRUCTURED_JSON_SCRIPTS
  );
}

function isStructuredJsonScript(raw: string) {
  return raw.length <= MAX_STRUCTURED_JSON_LENGTH;
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

type JsonTraversalState = {
  budget: JsonTraversalBudget;
  source: PublicProofSource;
  proofs: PublicProof[];
  maxItems: number;
};

function visitJson(value: unknown, depth: number, state: JsonTraversalState) {
  if (!canVisitJson(value, depth, state)) return;
  if (Array.isArray(value)) return visitJsonArray(value, depth, state);
  visitJsonRecord(value as Record<string, unknown>, depth, state);
}

function canVisitJson(
  value: unknown,
  depth: number,
  state: JsonTraversalState,
) {
  if (depth > MAX_JSON_DEPTH || jsonTraversalExhausted(state)) return false;
  if (!consumeJsonNode(state.budget)) return false;
  return Boolean(value && typeof value === "object");
}

function visitJsonArray(
  values: unknown[],
  depth: number,
  state: JsonTraversalState,
) {
  visitJsonValues(values, depth, state);
}

function visitJsonRecord(
  record: Record<string, unknown>,
  depth: number,
  state: JsonTraversalState,
) {
  addStructuredProof(record, state);
  visitJsonChildren(record, depth, state);
}

function addStructuredProof(
  record: Record<string, unknown>,
  state: JsonTraversalState,
) {
  if (!isCredibleStructuredProof(record, arrayOfStrings(record["@type"])))
    return;
  const proof = proofFromStructured(record, state.source);
  if (proof) state.proofs.push(proof);
}

function visitJsonChildren(
  record: Record<string, unknown>,
  depth: number,
  state: JsonTraversalState,
) {
  visitJsonValues(Object.values(record), depth, state);
}

function visitJsonValues(
  values: unknown[],
  depth: number,
  state: JsonTraversalState,
) {
  for (const value of values) {
    if (jsonTraversalExhausted(state)) break;
    visitJson(value, depth + 1, state);
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
  const signals = structuredProofSignals(record);
  return (
    (types.includes("Review") && isCredibleReview(record, signals)) ||
    (types.includes("SocialMediaPosting") &&
      isCredibleSocialPost(record, signals)) ||
    (types.includes("CreativeWork") && isCredibleCreativeWork(record, signals))
  );
}

type StructuredProofSignals = {
  hasAuthor: boolean;
  hasPermalink: boolean;
  hasDate: boolean;
  hasRating: boolean;
};

function structuredProofSignals(
  record: Record<string, unknown>,
): StructuredProofSignals {
  return {
    hasAuthor: Boolean(safeText(structuredAuthor(record))),
    hasPermalink: Boolean(safeText(record.url ?? record["@id"])),
    hasDate: Boolean(safeDate(record.datePublished)),
    hasRating: Boolean(
      numberOrNull(recordField(record, "reviewRating")?.ratingValue),
    ),
  };
}

function structuredAuthor(record: Record<string, unknown>) {
  return typeof record.author === "string"
    ? record.author
    : recordField(record, "author")?.name;
}

function isCredibleReview(
  record: Record<string, unknown>,
  signals: StructuredProofSignals,
) {
  return (
    Boolean(safeText(record.reviewBody)) &&
    (signals.hasAuthor || signals.hasPermalink || signals.hasRating)
  );
}

function isCredibleSocialPost(
  record: Record<string, unknown>,
  signals: StructuredProofSignals,
) {
  return (
    Boolean(safeText(record.text ?? record.articleBody)) &&
    signals.hasAuthor &&
    (signals.hasPermalink || signals.hasDate)
  );
}

function isCredibleCreativeWork(
  record: Record<string, unknown>,
  signals: StructuredProofSignals,
) {
  return (
    Boolean(safeText(record.text ?? record.reviewBody)) &&
    signals.hasAuthor &&
    signals.hasPermalink
  );
}

function recordField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
