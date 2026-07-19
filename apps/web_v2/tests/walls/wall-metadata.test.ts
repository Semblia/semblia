import { describe, expect, it } from "vitest";
import { buildWallJsonLd, buildWallMetadata } from "@/lib/walls/wall-metadata";
import type { PublicWallPayload } from "@/lib/walls/public-wall";

const payload = (
  seo: Partial<PublicWallPayload["seo"]> = {},
  project: PublicWallPayload["project"] = {
    name: 'Acme </script> "quoted"',
    websiteUrl: "https://acme.test/about?from=wall",
  },
) =>
  ({
    widget: {
      name: "Proof",
      wall: {
        slug: "proof",
        title: "Proof",
        subhead: "Customer stories",
      },
    },
    project,
    testimonials: [
      {
        id: "t1",
        authorName: "A testimonial author",
        authorRole: null,
        authorCompany: null,
        authorAvatar: null,
        content: "A testimonial that must not become a structured claim",
        rating: 5,
        source: null,
        sourceUrl: null,
        createdAt: "2026-01-01",
      },
    ],
    seo: {
      canonicalUrl: "https://acme.walls.semblia.com",
      indexable: true,
      reason: "INDEXABLE",
      ...seo,
    },
  }) as PublicWallPayload;

describe("wall metadata", () => {
  it("uses the API canonical URL for canonical and Open Graph metadata", () => {
    const metadata = buildWallMetadata(
      payload({ canonicalUrl: "https://canonical.walls.semblia.com" }),
    );

    expect(metadata.alternates?.canonical).toBe(
      "https://canonical.walls.semblia.com",
    );
    expect(metadata.openGraph?.url).toBe("https://canonical.walls.semblia.com");
    expect(metadata.twitter).toMatchObject({
      card: "summary",
      title: 'Proof — Acme </script> "quoted"',
    });
    expect(metadata.twitter).not.toHaveProperty("url");
  });

  it.each(["EMPTY", "PRIVATE", "UNPUBLISHED"])(
    "keeps %s walls out of the index when the API marks them ineligible",
    (reason) => {
      expect(
        buildWallMetadata(payload({ indexable: false, reason })).robots,
      ).toMatchObject({ index: false, follow: false });
    },
  );

  it("indexes only when the API SEO flag is eligible", () => {
    expect(buildWallMetadata(payload()).robots).toMatchObject({
      index: true,
      follow: true,
    });
  });

  it("serializes only safe Organization and WebSite claims", () => {
    const json = buildWallJsonLd(payload());
    const nodes = JSON.parse(json) as Array<Record<string, unknown>>;

    expect(json).toContain("\\u003c/script>");
    expect(json).toContain('\\"quoted\\"');
    expect(nodes.map((node) => node["@type"])).toEqual([
      "Organization",
      "WebSite",
    ]);
    expect(nodes[0]).toMatchObject({
      name: 'Acme </script> "quoted"',
      url: "https://acme.test/about?from=wall",
    });
    expect(nodes[1]).toMatchObject({
      name: 'Acme </script> "quoted"',
      url: "https://acme.walls.semblia.com",
    });
    expect(json).not.toContain("AggregateRating");
    expect(json).not.toContain("Review");
    expect(json).not.toContain("testimonial author");
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "ftp://acme.test/file",
    "not a url",
  ])("omits a non-HTTP project website: %s", (websiteUrl) => {
    const nodes = JSON.parse(
      buildWallJsonLd(payload({}, { name: "Acme", websiteUrl })),
    ) as Array<Record<string, unknown>>;

    expect(nodes[0]).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Acme",
    });
  });

  it.each([
    "https://user@acme.test/about",
    "http://user:secret@acme.test/about",
  ])("omits a credential-bearing project website: %s", (websiteUrl) => {
    const nodes = JSON.parse(
      buildWallJsonLd(payload({}, { name: "Acme", websiteUrl })),
    ) as Array<Record<string, unknown>>;

    expect(nodes[0]).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Acme",
    });
  });
});
