import { renderPublishedWidgetFragment } from "@workspace/widgets-core/render";
import type { PublicWallPayload } from "@/lib/walls/public-wall";
import {
  composeWallDoc,
  toRenderItems,
  wallRatingStats,
} from "@/lib/walls/public-wall";
import { buildWallJsonLd } from "@/lib/walls/wall-metadata";
import { WallShell, wallToneFromTheme } from "./wall-shell";

/** Shared server-rendered shell for legacy and host-routed public walls. */
export function PublicWallPage({ payload }: { payload: PublicWallPayload }) {
  const wall = payload.widget.wall;
  if (!wall) return null;
  const tone = wallToneFromTheme(payload.widget.publishedSnapshot.derivedTheme);
  const fragment = renderPublishedWidgetFragment(composeWallDoc(payload), {
    items: toRenderItems(payload.testimonials),
    widgetId: payload.widget.id,
    surface: "wall",
    // The page writes the masthead — see WallShell, which the studio preview
    // renders too so the two can't tell different stories.
    omitWallHead: true,
  });
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildWallJsonLd(payload) }}
      />
      <WallShell
        tone={tone}
        eyebrow={payload.project?.name}
        title={wall.title}
        subhead={wall.subhead}
        stats={wallRatingStats(payload.testimonials)}
      >
        <section
          aria-label="Customer testimonials"
          dangerouslySetInnerHTML={{ __html: fragment.html }}
        />
      </WallShell>
    </main>
  );
}
