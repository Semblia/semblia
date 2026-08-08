import { describe, expect, it } from "vitest";
import { renderStudioFragment } from "@/components/widgets/studio/widget-canvas";
import { buildDefaultWidgetConfig } from "@/lib/widgets/widget-presets";
import { FALLBACK_TESTIMONIALS } from "@/lib/widgets/widget-fallback-testimonials";

/**
 * Everything that previews a widget — the studio canvas, the preview route and
 * the list thumbnails — goes through `renderStudioFragment`, so this is the one
 * place that can guarantee a preview is the artifact and not a lookalike.
 *
 * The defect these cover: a wall previewed as a bare fragment, which drew
 * widgets-core's own centred masthead. The live `/wall/[slug]` route suppresses
 * that masthead and writes its own inside `WallShell`, so the studio showed a
 * page visitors never get.
 */
const items = FALLBACK_TESTIMONIALS.slice(0, 6);

function fragmentFor(kind: "wall" | "embed") {
  return renderStudioFragment({
    widgetId: `preview-${kind}`,
    draft: buildDefaultWidgetConfig({ kind, projectSlug: "acme" }),
    items,
  });
}

/** The fragment carries its own stylesheet; assertions are about the markup. */
function markup(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/g, "");
}

describe("renderStudioFragment", () => {
  it("leaves a wall's masthead to the page shell that wraps it", () => {
    const { html } = fragmentFor("wall");
    expect(html).toContain('data-sw-surface="wall"');
    // The shell owns the title, stats and rule; the fragment owns the entries.
    expect(markup(html)).not.toContain('<header class="sw-mast"');
    expect(html).toContain(items[0]!.authorName);
  });

  it("renders an embed as the host page will receive it", () => {
    const { html } = fragmentFor("embed");
    expect(html).toContain('data-sw-surface="embed"');
    // Embeds never shipped a heading; the host page owns its own.
    expect(markup(html)).not.toContain('<header class="sw-mast"');
  });

  it("returns the theme the wall shell has to match", () => {
    const { themeSnapshot } = fragmentFor("wall");
    expect(themeSnapshot.appearance).toBeDefined();
    expect(
      themeSnapshot.schemes.light ?? themeSnapshot.schemes.dark,
    ).toBeDefined();
  });
});
