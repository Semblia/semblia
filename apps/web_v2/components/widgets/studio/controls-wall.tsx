"use client";

/**
 * Wall section — only rendered for `kind === "wall"`. Handles slug, title,
 * and subhead.
 *
 * Slug normalization: typing dashes/spaces gets cleaned, displayed live.
 */

import * as React from "react";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import { isValidWallSlug, normalizeWallSlug } from "@/lib/widgets/widget-types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Row, SectionCollapsible, StudioTextInput } from "./studio-primitives";

export function WallSection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setWall = useWidgetStudioStore((s) => s.setWall);

  if (!draft) return null;
  if (draft.kind !== "wall") return null;

  const slug = draft.wall.slug;
  const slugValid = isValidWallSlug(slug);

  return (
    <SectionCollapsible title="Wall page" tag="WALL">
      <Row label="URL slug" hint={slugValid ? undefined : "Invalid"}>
        <div className="flex items-stretch overflow-hidden rounded-md border border-border bg-background focus-within:border-foreground/40">
          <span className="flex select-none items-center bg-muted/40 px-2 font-mono text-[10.5px] text-muted-foreground">
            tresta.io/wall/
          </span>
          <Input
            value={slug}
            onChange={(e) =>
              setWall(widgetId, { slug: normalizeWallSlug(e.target.value) })
            }
            className="h-8 rounded-none border-0 font-mono text-xs focus-visible:ring-0"
            spellCheck={false}
            placeholder="your-slug"
          />
        </div>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
          Lowercase, hyphens. Min 3, max 64 characters.
        </p>
      </Row>

      <Row label="Hero title">
        <StudioTextInput
          value={draft.wall.title}
          onChange={(v) => setWall(widgetId, { title: v })}
          placeholder="Loved by people who ship"
          className="h-9 font-sans text-sm"
        />
      </Row>

      <Row label="Subhead">
        <Textarea
          value={draft.wall.subhead}
          onChange={(e) => setWall(widgetId, { subhead: e.target.value })}
          rows={3}
          className="resize-none text-xs"
          placeholder="Real stories from real customers."
        />
      </Row>
    </SectionCollapsible>
  );
}
