import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { extractPublicProof } from "./public-proof-extractor.js";

const credibleArticle = `<meta property="og:type" content="article"><meta property="og:description" content="A considered, detailed account of how this product helped our small team deliver faster."><meta property="article:published_time" content="2026-01-01"><meta property="article:author" content="Ava">`;

describe("public proof extractor", () => {
  it("extracts bounded JSON-LD reviews without executing scripts", () => {
    const proof = extractPublicProof(
      fixture("json-ld-review.html"),
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
        fixture("marketing-no-proof.html"),
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
