"use client";

/**
 * WidgetEmptyState — the first run of the Social Proof Studio.
 *
 * The first decision here is genuinely a fork — a wall and an embed are
 * different products with different setup — so this composes the shared
 * `EmptyKindPicker`. What makes it this app's own: each pick target carries a
 * live mini render of what choosing it creates, built by the same renderer
 * the studio and the public embeds use, from the same sample testimonials the
 * studio previews with. The studio demonstrates itself before anything exists.
 *
 * Reached only through `DataState`'s `empty-first-run` branch — a failed
 * widgets fetch renders the error surface, never this.
 */

import * as React from "react";
import { CodeIcon, GlobeIcon } from "@phosphor-icons/react";
import { EmptyKindPicker, type EmptyKindOption } from "@/components/shared";
import { HOSTED_WALL_BASE } from "@/lib/semblia-urls";
import { buildDefaultWidgetConfig } from "@/lib/widgets/widget-presets";
import { FALLBACK_TESTIMONIALS } from "@/lib/widgets/widget-fallback-testimonials";
import type { WidgetKind } from "@/lib/widgets/widget-types";
import { WidgetCardMiniPreview } from "./widget-card-mini-preview";

interface WidgetEmptyStateProps {
  slug: string;
  onPick: (kind: WidgetKind) => void;
}

export function WidgetEmptyState({ slug, onPick }: WidgetEmptyStateProps) {
  const kinds = React.useMemo<EmptyKindOption<WidgetKind>[]>(() => {
    const sample = FALLBACK_TESTIMONIALS.slice(0, 6);
    const wallConfig = buildDefaultWidgetConfig({ kind: "wall", projectSlug: slug });
    const embedConfig = buildDefaultWidgetConfig({ kind: "embed", projectSlug: slug });

    return [
      {
        id: "wall",
        title: "Wall of Love",
        pitch: `A standalone page hosted at ${HOSTED_WALL_BASE}/your-slug. No code, just a link to share.`,
        bullets: [
          "Public URL, indexable by search engines",
          "Hero title and subhead you control",
          "Full-page layout, mobile-friendly",
        ],
        icon: GlobeIcon,
        accentClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        preview: (
          <WidgetCardMiniPreview
            config={wallConfig}
            items={sample}
            className="absolute inset-0"
          />
        ),
      },
      {
        id: "embed",
        title: "Embed widget",
        pitch:
          "Paste a single script tag on your site. Lives inside your page like it was always there.",
        bullets: [
          "Carousel, grid, masonry, list, or wall layout",
          "Works in any framework, or vanilla HTML",
          "Design edits go live without re-embedding",
        ],
        icon: CodeIcon,
        accentClass: "bg-foreground/10 text-foreground",
        preview: (
          <WidgetCardMiniPreview
            config={embedConfig}
            items={sample}
            className="absolute inset-0"
          />
        ),
      },
    ];
  }, [slug]);

  return (
    <EmptyKindPicker<WidgetKind>
      heading="Social Proof Studio"
      subheading="Turn approved testimonials into proof people can see"
      footnote="Walls and embeds both pull from the responses you approve — collect once, show it anywhere."
      kinds={kinds}
      onPick={onPick}
    />
  );
}
