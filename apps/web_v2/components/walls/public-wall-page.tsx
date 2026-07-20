import { renderPublishedWidgetFragment } from "@workspace/widgets-core/render";
import type { PublicWallPayload } from "@/lib/walls/public-wall";
import {
  composeWallDoc,
  toRenderItems,
  wallRatingStats,
  wallShellTheme,
} from "@/lib/walls/public-wall";
import { buildWallJsonLd } from "@/lib/walls/wall-metadata";

function HeroStars({ average, accent }: { average: number; accent: string }) {
  const rounded = Math.round(average);
  return (
    <span
      aria-hidden
      style={{ color: accent, letterSpacing: "0.08em" }}
      className="text-[0.95rem] leading-none"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} style={{ opacity: index < rounded ? 1 : 0.25 }}>
          ★
        </span>
      ))}
    </span>
  );
}

/** Shared server-rendered shell for legacy and host-routed public walls. */
export function PublicWallPage({ payload }: { payload: PublicWallPayload }) {
  const wall = payload.widget.wall;
  if (!wall) return null;
  const shell = wallShellTheme(payload);
  const stats = wallRatingStats(payload.testimonials);
  const fragment = renderPublishedWidgetFragment(composeWallDoc(payload), {
    items: toRenderItems(payload.testimonials),
    widgetId: payload.widget.id,
    surface: "wall",
    omitWallHead: true,
  });
  return (
    <main
      style={{
        background: shell.background,
        color: shell.text,
        fontFamily: shell.fontFamily,
      }}
      className="min-h-svh"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildWallJsonLd(payload) }}
      />
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <header className="max-w-3xl">
          {payload.project?.name ? (
            <p
              className="text-[0.8rem] font-medium"
              style={{ color: shell.mutedText }}
            >
              {payload.project.name}
            </p>
          ) : null}
          <h1
            className="mt-2 text-balance font-semibold tracking-tight"
            style={{ fontSize: "clamp(1.9rem, 5vw, 3.1rem)", lineHeight: 1.06 }}
          >
            {wall.title}
          </h1>
          {wall.subhead ? (
            <p
              className="mt-4 max-w-2xl text-pretty text-[1.02rem] leading-relaxed"
              style={{ color: shell.mutedText }}
            >
              {wall.subhead}
            </p>
          ) : null}
          {stats.average && stats.ratedCount > 0 ? (
            <p className="mt-5 flex items-center gap-2.5 text-[0.85rem]">
              <HeroStars average={stats.average} accent={shell.accent} />
              <span style={{ color: shell.mutedText }}>
                <strong style={{ color: shell.text, fontWeight: 600 }}>
                  {stats.average}
                </strong>{" "}
                from {stats.ratedCount}{" "}
                {stats.ratedCount === 1 ? "customer" : "customers"}
              </span>
            </p>
          ) : null}
        </header>
        <hr
          aria-hidden
          className="my-10 border-0"
          style={{ height: 1, background: shell.border }}
        />
        <section
          aria-label="Customer testimonials"
          dangerouslySetInnerHTML={{ __html: fragment.html }}
        />
      </div>
    </main>
  );
}
