import { describe, expect, it } from "vitest";
import {
  composePublishedWidgetDoc,
  defaultWidgetDefinition,
  publishWidgetDefinition,
  type WidgetDefinitionDoc,
} from "../schema/index.js";
import { widgetCss } from "./css.js";
import {
  renderPublishedWidgetFragment,
  renderWidgetStubFragmentHtml,
  WidgetNotImplementedError,
  type WidgetRenderItem,
  type WidgetRenderSurface,
} from "./index.js";

const TEMPLATE_IDS = [
  "marquee",
  "gallery",
  "mosaic",
  "column",
  "editorial",
] as const;

let seq = 0;
function makeItem(overrides: Partial<WidgetRenderItem> = {}): WidgetRenderItem {
  seq += 1;
  return {
    id: `sub_${seq}`,
    authorName: "Jane Doe",
    authorRole: "Founder",
    authorCompany: "Acme",
    content: "Semblia turned our customer proof into a real growth loop.",
    rating: 5,
    source: "manual",
    createdAt: "2026-06-14T12:00:00.000Z",
    ...overrides,
  };
}

function published(definition: WidgetDefinitionDoc = defaultWidgetDefinition()) {
  return composePublishedWidgetDoc(
    definition,
    publishWidgetDefinition(definition),
  );
}

function render(
  definition: WidgetDefinitionDoc,
  items: WidgetRenderItem[],
  surface?: WidgetRenderSurface,
): string {
  return renderPublishedWidgetFragment(published(definition), {
    items,
    surface,
  }).html;
}

/** Markup only — everything after the inline stylesheet, so CSS selectors
 * (`[data-dir="rtl"]`, `.sw-stars`, …) can never satisfy a markup assertion. */
function bodyOf(html: string): string {
  return html.slice(html.indexOf("</style>"));
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("template worlds render on both surfaces", () => {
  const WORLD_MARKUP: Record<(typeof TEMPLATE_IDS)[number], string> = {
    marquee: 'class="sw-chip"',
    gallery: 'class="sw-work"',
    mosaic: 'class="sw-post"',
    column: 'class="sw-entry"',
    editorial: 'class="sw-lead"',
  };
  const WORLD_CSS: Record<(typeof TEMPLATE_IDS)[number], string> = {
    marquee: "@keyframes sw-glide",
    gallery: ".sw-frame::before",
    mosaic: ".sw-mosaic{columns",
    column: ".sw-entry-mark",
    editorial: ".sw-front-rule",
  };

  it.each(TEMPLATE_IDS)("renders %s as an embed with its own world", (id) => {
    const html = render(defaultWidgetDefinition({ templateId: id }), [
      makeItem(),
    ]);

    expect(html).toContain(`data-sw-template="${id}"`);
    expect(html).toContain('data-sw-surface="embed"');
    expect(html).toContain('data-widget-kind="embed"');
    expect(html).toContain('part="root"');
    expect(bodyOf(html)).toContain(WORLD_MARKUP[id]);
    expect(html).toContain(WORLD_CSS[id]);
    // Embeds never ship a heading of any kind.
    expect(bodyOf(html)).not.toContain("<h1");
  });

  it.each(TEMPLATE_IDS)("renders %s on the wall surface with masthead", (id) => {
    const html = render(
      defaultWidgetDefinition({ kind: "wall", templateId: id }),
      [makeItem()],
      "wall",
    );

    expect(html).toContain(`data-sw-template="${id}"`);
    expect(html).toContain('data-sw-surface="wall"');
    expect(html).toContain('data-widget-kind="wall"');
    expect(bodyOf(html)).toContain(WORLD_MARKUP[id]);
    expect(bodyOf(html)).toContain('<h1 class="sw-mast-title">');
  });

  it.each(TEMPLATE_IDS)("%s stylesheet excludes the other worlds", (id) => {
    const css = widgetCss(published(defaultWidgetDefinition({ templateId: id })));

    expect(css).toContain(WORLD_CSS[id]);
    // Shared base always ships (avatar + star atoms, empty state).
    expect(css).toContain(".sw-stars");
    expect(css).toContain(".sw-avatar");
    expect(css).toContain(".sw-empty");
    for (const other of TEMPLATE_IDS) {
      if (other !== id) expect(css).not.toContain(WORLD_CSS[other]);
    }
  });

  it.each(TEMPLATE_IDS)("%s clamps quotes via CSS, never truncates HTML", (id) => {
    const tail = "THE-VERY-LAST-SENTENCE-OF-A-LONG-QUOTE.";
    const long = `${"An extremely long customer story. ".repeat(40)}${tail}`;
    const html = render(defaultWidgetDefinition({ templateId: id }), [
      makeItem({ content: long }),
    ]);

    expect(html).toContain("-webkit-line-clamp");
    expect(bodyOf(html)).toContain(tail);
  });

  it.each(TEMPLATE_IDS)("%s renders the empty state without items", (id) => {
    const body = bodyOf(render(defaultWidgetDefinition({ templateId: id }), []));

    expect(body).toContain('class="sw-empty"');
    expect(body).toContain('role="status"');
    expect(body).toContain("No published responses");
    expect(body).not.toContain("data-sw-item");
  });
});

describe("star slot", () => {
  const gallery = () => defaultWidgetDefinition({ templateId: "gallery" });

  it("omits the star row entirely for unrated entries", () => {
    const body = bodyOf(render(gallery(), [makeItem({ rating: null })]));

    expect(body).not.toContain('class="sw-stars');
    expect(body).not.toContain("<svg");
  });

  it("renders five glyphs and dims the remainder for a mid rating", () => {
    const body = bodyOf(render(gallery(), [makeItem({ rating: 3 })]));

    expect(count(body, 'viewBox="0 0 16 16"')).toBe(5);
    expect(count(body, 'class="sw-star-off"')).toBe(2);
    expect(body).toContain('aria-label="3 out of 5 stars"');
    expect(body).toContain('role="img"');
  });

  it("clamps out-of-range ratings into 0..5", () => {
    const high = bodyOf(render(gallery(), [makeItem({ rating: 9 })]));
    expect(high).toContain('aria-label="5 out of 5 stars"');
    expect(count(high, 'class="sw-star-off"')).toBe(0);

    const low = bodyOf(render(gallery(), [makeItem({ rating: -3 })]));
    expect(low).toContain('aria-label="0 out of 5 stars"');
    expect(count(low, 'class="sw-star-off"')).toBe(5);
  });

  it("renders a zero rating as an all-dim row, distinct from unrated", () => {
    const body = bodyOf(render(gallery(), [makeItem({ rating: 0 })]));

    expect(body).toContain('class="sw-stars');
    expect(body).toContain('aria-label="0 out of 5 stars"');
    expect(count(body, 'class="sw-star-off"')).toBe(5);
  });

  it("rounds fractional ratings to the nearest glyph", () => {
    const body = bodyOf(render(gallery(), [makeItem({ rating: 4.4 })]));

    expect(body).toContain('aria-label="4 out of 5 stars"');
    expect(count(body, 'class="sw-star-off"')).toBe(1);
  });

  it("hides stars when showRating is off, even for rated entries", () => {
    const definition = gallery();
    definition.display.showRating = false;
    const body = bodyOf(render(definition, [makeItem({ rating: 5 })]));

    expect(body).not.toContain('class="sw-stars');
  });

  it("mosaic keeps stars in the footer, below the words", () => {
    const body = bodyOf(
      render(defaultWidgetDefinition({ templateId: "mosaic" }), [
        makeItem({ rating: 4 }),
      ]),
    );

    const textAt = body.indexOf('class="sw-post-text"');
    const starsAt = body.indexOf('class="sw-stars sw-post-stars"');
    expect(textAt).toBeGreaterThan(-1);
    expect(starsAt).toBeGreaterThan(textAt);
  });

  it("mosaic drops the footer entirely when unrated with no provenance", () => {
    const body = bodyOf(
      render(defaultWidgetDefinition({ templateId: "mosaic" }), [
        makeItem({ rating: null }),
      ]),
    );

    expect(body).not.toContain('class="sw-post-foot"');
  });
});

describe("avatars", () => {
  const mosaic = () => defaultWidgetDefinition({ templateId: "mosaic" });

  it("renders an img for http(s) avatar urls", () => {
    const body = bodyOf(
      render(mosaic(), [
        makeItem({ authorAvatarUrl: "https://cdn.example.com/a.png" }),
      ]),
    );

    expect(body).toContain('<img src="https://cdn.example.com/a.png"');
    expect(body).not.toContain("sw-avatar-fb");
  });

  it("accepts data:image avatar urls", () => {
    const body = bodyOf(
      render(mosaic(), [
        makeItem({ authorAvatarUrl: "data:image/png;base64,AAAA" }),
      ]),
    );

    expect(body).toContain('<img src="data:image/png;base64,AAAA"');
  });

  it("rejects unsafe avatar urls and falls back to initials", () => {
    const body = bodyOf(
      render(mosaic(), [
        makeItem({
          authorName: "Jane Doe",
          authorAvatarUrl: "javascript:alert(1)",
        }),
      ]),
    );

    expect(body).not.toContain("<img");
    expect(body).not.toContain("javascript:alert");
    expect(body).toContain("sw-avatar-fb");
    expect(body).toContain(">JD</span>");
  });

  it("builds initials from the first two words, uppercased", () => {
    const markup = (authorName: string) =>
      bodyOf(render(mosaic(), [makeItem({ authorName })]));

    expect(markup("Cher")).toContain(">C</span>");
    expect(markup("ada byron lovelace")).toContain(">AB</span>");
  });

  it("falls back to Anonymous with an A monogram for empty names", () => {
    const body = bodyOf(render(mosaic(), [makeItem({ authorName: "" })]));

    expect(body).toContain("Anonymous");
    expect(body).toContain(">A</span>");
  });

  it("derives the same hue for the same name every time", () => {
    const body = bodyOf(
      render(mosaic(), [
        makeItem({ authorName: "Jane Doe" }),
        makeItem({ authorName: "Jane Doe" }),
      ]),
    );

    const hues = [...body.matchAll(/--sw-avatar-h:(\d+)/g)].map((m) => m[1]);
    expect(hues).toHaveLength(2);
    expect(hues[0]).toBe(hues[1]);
  });

  it("omits avatars entirely when showAvatar is off", () => {
    const definition = mosaic();
    definition.display.showAvatar = false;
    const body = bodyOf(render(definition, [makeItem()]));

    expect(body).not.toContain('class="sw-avatar');
  });
});

describe("wall masthead", () => {
  const wallDefinition = () =>
    defaultWidgetDefinition({ kind: "wall", templateId: "editorial" });

  it("pairs the numeral, stars, and volume — in that order", () => {
    const body = bodyOf(
      render(
        wallDefinition(),
        [
          makeItem({ rating: 5 }),
          makeItem({ rating: 4 }),
          makeItem({ rating: null }),
        ],
        "wall",
      ),
    );

    // Unrated items are excluded from the average: (5+4)/2 = 4.5.
    expect(body).toContain('<span class="sw-mast-avg">4.5</span>');
    const avgAt = body.indexOf('class="sw-mast-avg"');
    const starsAt = body.indexOf('class="sw-stars sw-mast-stars"');
    const countAt = body.indexOf('class="sw-mast-count"');
    expect(avgAt).toBeGreaterThan(-1);
    expect(starsAt).toBeGreaterThan(avgAt);
    expect(countAt).toBeGreaterThan(starsAt);
    expect(body).toContain("3 stories");
  });

  it("uses the singular for one story", () => {
    const body = bodyOf(render(wallDefinition(), [makeItem()], "wall"));

    expect(body).toContain("1 story");
    expect(body).not.toContain("1 stories");
  });

  it("drops the average when nothing is rated, keeps the volume", () => {
    const body = bodyOf(
      render(
        wallDefinition(),
        [makeItem({ rating: null }), makeItem({ rating: null })],
        "wall",
      ),
    );

    expect(body).not.toContain('class="sw-mast-avg"');
    expect(body).toContain("2 stories");
  });

  it("keeps the masthead but no stats over an empty wall", () => {
    const body = bodyOf(render(wallDefinition(), [], "wall"));

    expect(body).toContain('<h1 class="sw-mast-title">');
    expect(body).not.toContain('class="sw-mast-stats"');
    expect(body).toContain('class="sw-empty"');
  });

  it("renders the subhead only when the wall config has one", () => {
    const withSubhead = bodyOf(render(wallDefinition(), [makeItem()], "wall"));
    expect(withSubhead).toContain('class="sw-mast-subhead"');
    expect(withSubhead).toContain("Real stories from real customers.");

    const definition = wallDefinition();
    if (definition.wall) definition.wall.subhead = "";
    const without = bodyOf(render(definition, [makeItem()], "wall"));
    expect(without).not.toContain('class="sw-mast-subhead"');
  });

  it("escapes owner-authored wall copy", () => {
    const definition = wallDefinition();
    if (definition.wall) definition.wall.title = 'Loved <b>&</b> "trusted"';
    const body = bodyOf(render(definition, [makeItem()], "wall"));

    expect(body).not.toContain("<b>");
    expect(body).toContain("Loved &lt;b&gt;&amp;&lt;/b&gt; &quot;trusted&quot;");
  });

  it("never renders a masthead for an embed-kind doc, even on the wall surface", () => {
    const body = bodyOf(
      render(defaultWidgetDefinition({ templateId: "gallery" }), [makeItem()], "wall"),
    );

    expect(body).not.toContain('class="sw-mast"');
    expect(body).not.toContain("<h1");
  });
});

describe("compositions", () => {
  it("marquee keeps a single forward rail under four items", () => {
    const body = bodyOf(
      render(defaultWidgetDefinition({ templateId: "marquee" }), [
        makeItem(),
        makeItem(),
        makeItem(),
      ]),
    );

    expect(count(body, 'data-dir="ltr"')).toBe(1);
    expect(body).not.toContain('data-dir="rtl"');
  });

  it("marquee splits four-plus items across counter-scrolling rails, alternating", () => {
    const names = ["Ada A", "Ben B", "Cara C", "Dan D", "Eve E"];
    const body = bodyOf(
      render(
        defaultWidgetDefinition({ templateId: "marquee" }),
        names.map((authorName) => makeItem({ authorName })),
      ),
    );

    const [forward, reverse] = body.split('data-dir="rtl"');
    expect(reverse).toBeDefined();
    for (const evenName of ["Ada A", "Cara C", "Eve E"]) {
      expect(forward).toContain(evenName);
      expect(reverse).not.toContain(evenName);
    }
    for (const oddName of ["Ben B", "Dan D"]) {
      expect(reverse).toContain(oddName);
      expect(forward).not.toContain(oddName);
    }
  });

  it("marquee scales glide duration with rail length, floored for short rails", () => {
    const definition = defaultWidgetDefinition({ templateId: "marquee" });

    // One chip → floor at 28s.
    expect(bodyOf(render(definition, [makeItem()]))).toContain(
      "--sw-glide-dur:28s",
    );

    // Ten items → five chips per rail → 35s on both rails.
    const ten = Array.from({ length: 10 }, () => makeItem());
    const body = bodyOf(render(definition, ten));
    expect(count(body, "--sw-glide-dur:35s")).toBe(2);
  });

  it("marquee duplicates each rail segment for the loop, hidden from AT", () => {
    const body = bodyOf(
      render(defaultWidgetDefinition({ templateId: "marquee" }), [
        makeItem({ authorName: "Loop Once" }),
      ]),
    );

    expect(count(body, "Loop Once")).toBe(2);
    expect(count(body, '<div class="sw-rail-seg" aria-hidden="true">')).toBe(1);
  });

  it("stamps rotation off so the rail degrades to hand-scroll", () => {
    const definition = defaultWidgetDefinition({ templateId: "marquee" });
    definition.behavior.autoRotate = false;
    const html = render(definition, [makeItem()]);

    expect(html).toContain('data-sw-rotate="off"');
    expect(html).toContain('[data-sw-rotate="off"] .sw-rail-track{animation:none');
  });

  it("editorial leads with the first story and decks the rest under the fold", () => {
    const body = bodyOf(
      render(
        defaultWidgetDefinition({ kind: "wall", templateId: "editorial" }),
        [
          makeItem({ content: "Lead quote wins the front page." }),
          makeItem({ content: "Second voice supports." }),
          makeItem({ content: "Third voice supports." }),
        ],
      ),
    );

    const leadAt = body.indexOf('class="sw-lead"');
    const ruleAt = body.indexOf('class="sw-front-rule"');
    const deckAt = body.indexOf('class="sw-deck"');
    expect(leadAt).toBeGreaterThan(-1);
    expect(ruleAt).toBeGreaterThan(leadAt);
    expect(deckAt).toBeGreaterThan(ruleAt);
    expect(body.slice(leadAt, ruleAt)).toContain(
      "Lead quote wins the front page.",
    );
    expect(count(body, 'class="sw-deck-item"')).toBe(2);
    expect(body.slice(deckAt)).toContain("Second voice supports.");
    expect(body.slice(deckAt)).toContain("Third voice supports.");
  });

  it("editorial with a single story renders no rule and no deck", () => {
    const body = bodyOf(
      render(defaultWidgetDefinition({ kind: "wall", templateId: "editorial" }), [
        makeItem(),
      ]),
    );

    expect(body).toContain('class="sw-lead"');
    expect(body).not.toContain('class="sw-front-rule"');
    expect(body).not.toContain('class="sw-deck"');
  });

  it("gallery renders one framed work per item", () => {
    const body = bodyOf(
      render(defaultWidgetDefinition({ templateId: "gallery" }), [
        makeItem(),
        makeItem(),
        makeItem(),
      ]),
    );

    expect(count(body, 'class="sw-work"')).toBe(3);
    expect(count(body, 'class="sw-frame"')).toBe(3);
    expect(count(body, 'class="sw-plaque"')).toBe(3);
  });

  it("column signs each entry with an em-dash signature and hanging mark", () => {
    const body = bodyOf(
      render(defaultWidgetDefinition({ templateId: "column" }), [makeItem()]),
    );

    expect(body).toContain('class="sw-entry-mark"');
    expect(body).toContain("— Jane Doe, Founder · Acme");
  });
});

describe("meta, provenance, and branding", () => {
  it("drops the company from the meta line when showCompany is off", () => {
    const definition = defaultWidgetDefinition({ templateId: "gallery" });
    definition.display.showCompany = false;
    const body = bodyOf(render(definition, [makeItem()]));

    expect(body).toContain("Founder");
    expect(body).not.toContain("Acme");
  });

  it("renders date and source in the plaque foot when enabled", () => {
    const definition = defaultWidgetDefinition({ templateId: "gallery" });
    definition.display.showDate = true;
    definition.display.showSource = true;
    const body = bodyOf(render(definition, [makeItem()]));

    expect(body).toContain('class="sw-plaque-foot"');
    expect(body).toContain("Jun 14 · manual");
  });

  it("omits the plaque foot for defaults and for unparseable dates", () => {
    const defaults = bodyOf(
      render(defaultWidgetDefinition({ templateId: "gallery" }), [makeItem()]),
    );
    expect(defaults).not.toContain('class="sw-plaque-foot"');

    const definition = defaultWidgetDefinition({ templateId: "gallery" });
    definition.display.showDate = true;
    const invalid = bodyOf(
      render(definition, [makeItem({ createdAt: "not-a-date" })]),
    );
    expect(invalid).not.toContain('class="sw-plaque-foot"');
  });

  it("renders the watermark only when branding asks for it", () => {
    const on = bodyOf(render(defaultWidgetDefinition(), [makeItem()]));
    expect(on).toContain('class="sw-powered"');
    expect(on).toContain('href="https://semblia.com"');
    expect(on).toContain('rel="noopener noreferrer"');

    const definition = defaultWidgetDefinition();
    definition.branding.watermark = false;
    const off = bodyOf(render(definition, [makeItem()]));
    expect(off).not.toContain('class="sw-powered"');
  });

  it("escapes the widget id and customer identity fields", () => {
    const html = renderPublishedWidgetFragment(published(), {
      items: [
        makeItem({ authorName: `Jane "JJ" O'Doe`, authorRole: "<Founder>" }),
      ],
      widgetId: 'wid"1',
    }).html;

    expect(html).toContain('data-widget-id="wid&quot;1"');
    expect(html).toContain("Jane &quot;JJ&quot; O&#39;Doe");
    expect(html).toContain("&lt;Founder&gt;");
    expect(html).not.toContain("<Founder>");
  });
});

describe("widgetCss builders", () => {
  const cssFor = (definition: WidgetDefinitionDoc) =>
    widgetCss(published(definition));

  it("pins the color scheme for an explicit dark appearance", () => {
    const definition = defaultWidgetDefinition();
    definition.brand.appearance = "dark";
    const css = cssFor(definition);

    expect(css).toContain("color-scheme:dark;");
    expect(css).not.toContain("@media (prefers-color-scheme:dark)");
  });

  it("pins the color scheme for an explicit light appearance", () => {
    const definition = defaultWidgetDefinition();
    definition.brand.appearance = "light";
    const css = cssFor(definition);

    expect(css).toContain("color-scheme:light;");
    expect(css).not.toContain("@media (prefers-color-scheme:dark)");
  });

  it("ships both schemes behind a media query for system appearance", () => {
    const css = cssFor(defaultWidgetDefinition());

    expect(css).toContain("color-scheme:light dark;");
    expect(css).toContain("@media (prefers-color-scheme:dark){.sw-scope{");
  });

  it("mosaic dense weave tightens the derived spacing", () => {
    const space = (css: string) =>
      Number(/--semblia-widget-space:(\d+(?:\.\d+)?)px/.exec(css)?.[1]);

    const airy = defaultWidgetDefinition({ templateId: "mosaic" });
    const dense = defaultWidgetDefinition({ templateId: "mosaic" });
    dense.accents = { weave: "dense" };

    expect(space(cssFor(dense))).toBeLessThan(space(cssFor(airy)));
  });

  it("editorial classic edition swaps in the serif pairing", () => {
    const classic = defaultWidgetDefinition({ templateId: "editorial" });
    classic.accents = { edition: "classic" };
    expect(cssFor(classic)).toContain("Fraunces");

    const modern = defaultWidgetDefinition({ templateId: "editorial" });
    modern.accents = { edition: "modern" };
    expect(cssFor(modern)).not.toContain("Fraunces");
  });

  it("column always reads in the editorial serif", () => {
    expect(cssFor(defaultWidgetDefinition({ templateId: "column" }))).toContain(
      "Fraunces",
    );
  });

  it("falls back to the marquee world for a retired template id", () => {
    const definition = defaultWidgetDefinition();
    definition.templateId = "retired-template";
    const css = cssFor(definition);

    expect(css).toContain("@keyframes sw-glide");
  });

  it("stamps accent picks the worlds select on", () => {
    const featured = defaultWidgetDefinition({ templateId: "gallery" });
    featured.accents = { lead: "featured" };
    expect(render(featured, [makeItem()])).toContain(
      'data-sw-a-lead="featured"',
    );

    const plain = defaultWidgetDefinition({ templateId: "column" });
    plain.accents = { flourish: "plain" };
    expect(render(plain, [makeItem()])).toContain(
      'data-sw-a-flourish="plain"',
    );

    const dense = defaultWidgetDefinition({ templateId: "mosaic" });
    dense.accents = { weave: "dense" };
    expect(render(dense, [makeItem()])).toContain('data-sw-a-weave="dense"');
  });
});

describe("stub and errors", () => {
  it("renders the self-contained unavailable stub", () => {
    const html = renderWidgetStubFragmentHtml();

    expect(html).toContain('data-semblia-widget-stub="true"');
    expect(html).toContain('part="root"');
    expect(html).toContain("This widget is unavailable");
  });

  it("WidgetNotImplementedError names the missing template", () => {
    const error = new WidgetNotImplementedError("holo");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("WidgetNotImplementedError");
    expect(error.templateId).toBe("holo");
    expect(error.message).toContain('"holo"');
  });
});
