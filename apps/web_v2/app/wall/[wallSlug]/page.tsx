import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderPublishedWidgetFragment } from "@workspace/widgets-core/render";
import {
  composeWallDoc,
  fetchPublicWall,
  toRenderItems,
  wallRatingStats,
  wallShellTheme,
} from "@/lib/walls/public-wall";
import { wallLink } from "@/lib/semblia-urls";

/**
 * Hosted Wall of Love — the public, SEO-first face of a wall widget.
 *
 * Server-rendered against the public walls API (Redis-cached, 60s ISR), it
 * reuses the exact widgets-core fragment embeds use — one renderer, three
 * surfaces — and wraps it in a hero + metadata the embed can't carry:
 * canonical URL, OpenGraph/Twitter, and Organization/Review JSON-LD. The
 * page shell borrows the widget's published theme, so a Noir wall is a dark
 * page, not a dark box on white.
 */

export const revalidate = 60;

interface WallPageProps {
  params: Promise<{ wallSlug: string }>;
}

export async function generateMetadata({
  params,
}: WallPageProps): Promise<Metadata> {
  const { wallSlug } = await params;
  const payload = await fetchPublicWall(wallSlug);
  if (!payload?.widget.wall) return { title: "Wall not found" };

  const { wall } = payload.widget;
  const projectName = payload.project?.name;
  const stats = wallRatingStats(payload.testimonials);
  const description =
    wall.subhead ||
    (stats.average
      ? `Rated ${stats.average}/5 by ${stats.ratedCount} customers${projectName ? ` of ${projectName}` : ""}.`
      : `Real customer stories${projectName ? ` about ${projectName}` : ""}.`);
  const canonical = wallLink(wall.slug);

  return {
    title: projectName ? `${wall.title} — ${projectName}` : wall.title,
    description,
    alternates: { canonical },
    // Overrides the app-wide noindex: walls are the one public, indexable
    // surface web_v2 serves.
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url: canonical,
      title: wall.title,
      description,
      siteName: projectName ?? "Semblia",
    },
    twitter: {
      card: "summary",
      title: wall.title,
      description,
    },
  };
}

function buildJsonLd(
  payload: NonNullable<Awaited<ReturnType<typeof fetchPublicWall>>>,
) {
  const stats = wallRatingStats(payload.testimonials);
  const name = payload.project?.name ?? payload.widget.name;
  const url = payload.project?.websiteUrl ?? undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    ...(url ? { url } : {}),
    ...(stats.average && stats.ratedCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: stats.average,
            reviewCount: stats.ratedCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    review: payload.testimonials.map((t) => ({
      "@type": "Review",
      reviewBody: t.content,
      datePublished: t.createdAt.slice(0, 10),
      author: { "@type": "Person", name: t.authorName },
      ...(t.rating
        ? {
            reviewRating: {
              "@type": "Rating",
              ratingValue: t.rating,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
    })),
  };
}

export default async function WallPage({ params }: WallPageProps) {
  const { wallSlug } = await params;
  const payload = await fetchPublicWall(wallSlug);
  if (!payload?.widget.wall) notFound();

  const shell = wallShellTheme(payload);
  const projectName = payload.project?.name;

  // The template owns the wall's masthead (h1, subhead, proof stats) so an
  // Editorial wall reads like a front page and a Marquee wall like a rail —
  // the page contributes only what an embed can't: metadata, JSON-LD, shell.
  const fragment = renderPublishedWidgetFragment(composeWallDoc(payload), {
    items: toRenderItems(payload.testimonials),
    widgetId: payload.widget.id,
    surface: "wall",
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
        // Structured data for search engines — the whole point of the page.
        dangerouslySetInnerHTML={{
          // `<` is escaped so testimonial text containing `</script>` cannot
          // break out of the JSON-LD block on this public page.
          __html: JSON.stringify(buildJsonLd(payload)).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        {projectName ? (
          <p
            className="mb-6 text-center text-[0.8rem] font-medium"
            style={{ color: shell.mutedText }}
          >
            {projectName}
          </p>
        ) : null}

        {/* The exact fragment embeds render — one renderer, every surface. */}
        <section
          aria-label="Customer testimonials"
          dangerouslySetInnerHTML={{ __html: fragment.html }}
        />
      </div>
    </main>
  );
}
