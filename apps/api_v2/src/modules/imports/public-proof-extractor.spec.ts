import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { publicImportSourceIdentityHash } from "./public-import-url-profile.js";
import { extractPublicProof } from "./public-proof-extractor.js";

const credibleArticle = `<meta property="og:type" content="article"><meta property="og:description" content="A considered, detailed account of how this product helped our small team deliver faster."><meta property="article:published_time" content="2026-01-01"><meta property="article:author" content="Ava">`;
const marketingNoProof = `<title>Best product ever</title>
<meta
  property="og:description"
  content="Start your free trial today and grow faster."
/>`;
const jsonLdReview = `<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Review",
    "reviewBody": "Worth every minute",
    "author": { "@type": "Person", "name": "Mira" },
    "reviewRating": { "ratingValue": "5", "bestRating": "5" },
    "url": "https://reviews.example.com/r/1"
  }
</script>
<script>
  globalThis.shouldNotRun = true;
</script>`;

describe("public proof extractor", () => {
  it("extracts bounded JSON-LD reviews without executing scripts", () => {
    const proof = extractPublicProof(
      jsonLdReview,
      {
        sourceKey: "trustpilot",
        sourceUrl: "https://reviews.example.com/product",
      },
      "html",
    );
    expect(proof).toEqual([
      expect.objectContaining({
        text: "Worth every minute",
        authorName: "Mira",
        ratingValue: 5,
        externalId: expect.any(String),
      }),
    ]);
  });

  it("enforces the item cap across all JSON-LD script blocks", () => {
    const reviews = (offset: number) =>
      JSON.stringify(
        Array.from({ length: 30 }, (_, index) => ({
          "@type": "Review",
          reviewBody: `Bounded proof ${offset + index}`,
          author: { name: "Reviewer" },
          url: `https://reviews.example.com/${offset + index}`,
        })),
      );
    const html = `<script type="application/ld+json">${reviews(0)}</script><script type="application/ld+json">${reviews(30)}</script>`;
    expect(
      extractPublicProof(
        html,
        {
          sourceKey: "trustpilot",
          sourceUrl: "https://reviews.example.com/product",
        },
        "html",
      ),
    ).toHaveLength(50);
    expect(
      extractPublicProof(
        `<script type="application/ld+json">${reviews(0)}</script><script type="application/ld+json">${reviews(30)}</script>`,
        {
          sourceKey: "trustpilot",
          sourceUrl: "https://reviews.example.com/product",
        },
        "html",
        2_000,
      ),
    ).toHaveLength(60);
  });

  it("extracts a bounded direct JSON Review body", () => {
    const source = {
      sourceKey: "google-play",
      sourceUrl:
        "https://play.google.com/store/apps/details?id=com.example.app",
    };
    expect(
      extractPublicProof(
        JSON.stringify({
          "@type": "Review",
          reviewBody: "The workflow is fast and dependable.",
          author: { name: "Sam" },
          reviewRating: { ratingValue: 5, bestRating: 5 },
        }),
        source,
        "json",
      ),
    ).toEqual([
      expect.objectContaining({
        text: "The workflow is fast and dependable.",
        authorName: "Sam",
      }),
    ]);
    expect(extractPublicProof("{malformed", source, "json")).toEqual([]);
    expect(
      extractPublicProof(
        JSON.stringify({
          "@type": "Review",
          reviewBody: "x".repeat(64_001),
          author: { name: "Sam" },
        }),
        source,
        "json",
      ),
    ).toEqual([]);
  });

  it("extracts documented WordPress and WooCommerce REST review shapes", () => {
    const source = {
      sourceKey: "wordpress",
      sourceUrl:
        "https://customer.wordpress.com/wp-json/wp/v2/comments?post=42&per_page=20",
    };
    const proof = extractPublicProof(
      JSON.stringify([
        {
          id: 7,
          date: "2026-01-02T03:04:05Z",
          content: { rendered: "<p>Thoughtful support and a clean setup.</p>" },
          author_name: "Ada",
        },
        {
          id: 8,
          date_created: "2026-01-03T03:04:05Z",
          review: "<strong>Dependable</strong> from the first day.",
          reviewer: "Grace",
          rating: 5,
        },
      ]),
      source,
      "json",
    );

    expect(proof).toEqual([
      expect.objectContaining({
        externalId: "wordpress:7",
        text: "Thoughtful support and a clean setup.",
        authorName: "Ada",
        sourceCreatedAt: "2026-01-02T03:04:05.000Z",
      }),
      expect.objectContaining({
        externalId: "wordpress:8",
        text: "Dependable from the first day.",
        authorName: "Grace",
        ratingValue: 5,
        sourceCreatedAt: "2026-01-03T03:04:05.000Z",
      }),
    ]);
  });

  it("uses a single credible Open Graph post but never marketing copy", () => {
    expect(
      extractPublicProof(
        credibleArticle,
        { sourceKey: "reddit", sourceUrl: "https://reviews.example.com/post" },
        "html",
      ),
    ).toHaveLength(1);
    expect(
      extractPublicProof(
        marketingNoProof,
        {
          sourceKey: "trustpilot",
          sourceUrl: "https://reviews.example.com/marketing",
        },
        "html",
      ),
    ).toEqual([]);
  });

  it.each([
    ["testimonial-to", "testimonial-to-wall.html", "Fast and thoughtful"],
    ["senja", "senja-wall.html", "Excellent support"],
    ["famewall", "famewall-wall.html", "A real wall review"],
  ])(
    "extracts sanitized official-demo structure for %s",
    (sourceKey, fixtureName, text) => {
      expect(
        extractPublicProof(
          fixture(fixtureName),
          { sourceKey, sourceUrl: "https://wall.example.com/wall" },
          "html",
        ),
      ).toEqual([
        expect.objectContaining({ text, externalId: expect.any(String) }),
      ]);
    },
  );

  it("does not infer proof from provider-shaped marketing or application state", () => {
    const appState = JSON.stringify({
      page: {
        items: [
          {
            id: "marketing-card",
            content: "A careful migration preserved every important detail.",
            author: { name: "Ada" },
            rating: 5,
            createdAt: "2026-07-20T10:00:00.000Z",
          },
        ],
      },
    });
    expect(
      extractPublicProof(
        appState,
        {
          sourceKey: "boast",
          sourceUrl: "https://widgets.boast.io/public-feed.json",
        },
        "json",
      ),
    ).toEqual([]);
    expect(
      extractPublicProof(
        `<script type="application/json">${appState}</script>`,
        {
          sourceKey: "trustmary",
          sourceUrl: "https://wall.example.com/landing",
        },
        "html",
      ),
    ).toEqual([]);
  });

  it("stops an oversized JSON-LD array before parsing later scripts", () => {
    const neutralNodes = Array.from({ length: 50_000 }, () => 1);
    const proof = JSON.stringify({
      "@type": "Review",
      reviewBody: "This must not be reached after the exhausted array.",
      author: { name: "Mira" },
      url: "https://reviews.example.com/late-proof",
    });
    expect(
      extractPublicProof(
        `<script type="application/ld+json">${JSON.stringify(neutralNodes)}</script><script type="application/ld+json">${proof}</script>`,
        {
          sourceKey: "trustpilot",
          sourceUrl: "https://reviews.example.com/product",
        },
        "html",
      ),
    ).toEqual([]);
  });

  it("limits JSON-LD script parsing across the entire response", () => {
    const emptyScripts = Array.from(
      { length: 50 },
      () => '<script type="application/ld+json">{}</script>',
    ).join("");
    const lateProof = JSON.stringify({
      "@type": "Review",
      reviewBody: "This must not be reached after the script budget.",
      author: { name: "Mira" },
      url: "https://reviews.example.com/late-proof",
    });
    expect(
      extractPublicProof(
        `${emptyScripts}<script type="application/ld+json">${lateProof}</script>`,
        {
          sourceKey: "trustpilot",
          sourceUrl: "https://reviews.example.com/product",
        },
        "html",
      ),
    ).toEqual([]);
  });

  it("does not treat arbitrary wall-like marketing cards as proof", () => {
    expect(
      extractPublicProof(
        "<section class=card><h2>Trusted by teams</h2><p>Build better relationships.</p></section>",
        {
          sourceKey: "trustmary",
          sourceUrl: "https://wall.example.com/landing",
        },
        "html",
      ),
    ).toEqual([]);
  });

  it("does not convert generic CreativeWork descriptions into testimonials", () => {
    expect(
      extractPublicProof(
        `<script type="application/ld+json">{"@type":"CreativeWork","description":"Our award-winning platform helps teams grow faster."}</script>`,
        {
          sourceKey: "trustpilot",
          sourceUrl: "https://reviews.example.com/marketing",
        },
        "html",
      ),
    ).toEqual([]);
  });

  it("keeps only source-profile identity parameters", () => {
    const first = googlePlayProof(
      "id=com.example.app&utm_source=one&hl=en&cache=1",
    );
    const trackingChanged = googlePlayProof(
      "cache=2&hl=fr&utm_source=two&id=com.example.app",
    );
    const differentApp = googlePlayProof("id=com.other.app&utm_source=one");
    expect(first?.sourceUrl).toBe(
      "https://play.google.com/store/apps/details?id=com.example.app",
    );
    expect(trackingChanged?.externalId).toBe(first?.externalId);
    expect(differentApp?.externalId).not.toBe(first?.externalId);
  });

  it("hashes canonical origin, pathname, and retained identity parameters", () => {
    const sourceKey = "google-play";
    const first = publicImportSourceIdentityHash(
      "https://play.google.com/store/apps/details?id=com.example.app&utm_source=one",
      sourceKey,
    );
    expect(
      publicImportSourceIdentityHash(
        "https://play.google.com/store/apps/details?utm_source=two&id=com.example.app",
        sourceKey,
      ),
    ).toBe(first);
    expect(
      publicImportSourceIdentityHash(
        "https://play.google.com/store/apps/other?id=com.example.app",
        sourceKey,
      ),
    ).not.toBe(first);
    expect(
      publicImportSourceIdentityHash(
        "https://other.example.com/store/apps/details?id=com.example.app",
        sourceKey,
      ),
    ).not.toBe(first);
  });

  it("retains a rating scale for zero-valued Famewall ratings", () => {
    const proof = extractPublicProof(
      `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
        props: {
          pageProps: {
            cardItems: [
              {
                uuid: "zero-rating",
                message_content: "The support was very responsive.",
                star_rating: 0,
              },
            ],
          },
        },
      })}</script>`,
      { sourceKey: "famewall", sourceUrl: "https://wall.example.com/wall" },
      "html",
    );
    expect(proof).toEqual([
      expect.objectContaining({ ratingValue: 0, ratingScale: 5 }),
    ]);
  });
});

function googlePlayProof(query: string) {
  return extractPublicProof(
    credibleArticle,
    {
      sourceKey: "google-play",
      sourceUrl: `https://play.google.com/store/apps/details?${query}`,
    },
    "html",
  )[0];
}

function fixture(name: string) {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}
