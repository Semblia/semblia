"use client";

import * as React from "react";
import { Globe as GlobeIcon, Code as CodeIcon } from "@phosphor-icons/react";
import { EmptyKindPicker, type EmptyKindOption } from "@/components/shared";

type WidgetKind = "embed" | "wall";

const KINDS: EmptyKindOption<WidgetKind>[] = [
  {
    id: "wall",
    title: "Wall of Love",
    pitch:
      "A standalone page hosted at semblia.com/wall/your-slug. No code, just a link to share.",
    bullets: [
      "Public URL, indexable by search engines",
      "Hero title + subhead you control",
      "Full-page layout, mobile-friendly",
    ],
    icon: GlobeIcon,
    accentClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "embed",
    title: "Embed widget",
    pitch:
      "Paste a single <script> on your site. Lives inside your page like it was always there.",
    bullets: [
      "Carousel, grid, masonry, list, or wall layout",
      "Works in any framework (or vanilla HTML)",
      "Auto-updates when you tweak the design",
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
      subheading="Showcase your social proof."
      footnote="You can have as many widgets as you want. Both kinds live in the same project."
      kinds={KINDS}
      onPick={onPick}
    />
  );
}
