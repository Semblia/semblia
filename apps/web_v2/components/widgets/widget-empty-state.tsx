"use client";

/**
 * WidgetEmptyState — the first-run surface for a project with no widgets.
 *
 * Composed from the shared `EmptyKindPicker` rather than an `EmptyState` with
 * one CTA, because the first decision here is genuinely a fork: a wall and an
 * embed are different products with different setup, and picking wrong costs a
 * round trip. This is the same primitive the forms surface uses for the same
 * reason, so the two first runs read as one app.
 *
 * Reached only through `DataState`'s `empty-first-run` branch — a failed widgets
 * fetch renders the error surface, never this.
 */

import * as React from "react";
import { CodeIcon, GlobeIcon } from "@phosphor-icons/react";
import { EmptyKindPicker, type EmptyKindOption } from "@/components/shared";
import { HOSTED_WALL_BASE } from "@/lib/semblia-urls";
import type { WidgetKind } from "@/lib/widgets/widget-types";

const KINDS: EmptyKindOption<WidgetKind>[] = [
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
  },
];

interface WidgetEmptyStateProps {
  onPick: (kind: WidgetKind) => void;
}

export function WidgetEmptyState({ onPick }: WidgetEmptyStateProps) {
  return (
    <EmptyKindPicker<WidgetKind>
      heading="New widget"
      subheading="Put your proof where people can see it"
      footnote="Widgets show the testimonials you collect with forms — both live in this project."
      kinds={KINDS}
      onPick={onPick}
    />
  );
}
