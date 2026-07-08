"use client";

/**
 * Publish section — the live/paused state, the publish action, and the way
 * this widget reaches the world: an embed snippet for site widgets, the
 * public link for walls.
 */

import * as React from "react";
import { ArrowSquareOut as OpenIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SnippetBlock } from "@/components/studio/snippet-block";
import { widgetEmbedSnippet, wallLink, wallPath } from "@/lib/semblia-urls";
import {
  findSlugForWidget,
  useWidgetStudioStore,
} from "@/lib/widgets/widget-studio-store";
import { Section } from "./studio-primitives";
import type { WidgetStudioContext } from "./widget-studio-controls";

export function PublishSection({
  widgetId,
  studio,
}: {
  widgetId: string;
  studio: WidgetStudioContext;
}) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const projectSlug =
    useWidgetStudioStore((s) => findSlugForWidget(s, widgetId)) ??
    "project-slug";

  if (!draft) return null;
  const isWall = draft.kind === "wall";
  const { status } = studio;
  const isLive = status.tone === "live";
  const hasChanges = status.tone === "changes";

  return (
    <section className="px-5 py-5">
      <div className="flex flex-col gap-7">
        <Section
          title={isLive ? "Your widget is live" : "Ready when you are"}
          description={
            isWall
              ? "Publishing updates the public wall page instantly."
              : "Publishing updates every page the snippet is on — no re-embedding."
          }
        >
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  isLive
                    ? "bg-success ring-4 ring-success/15"
                    : hasChanges
                      ? "bg-warning ring-4 ring-warning/15"
                      : "bg-muted-foreground/40 ring-4 ring-muted-foreground/10",
                )}
              />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {status.label}
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {isLive
                    ? isWall
                      ? "Anyone with the link can see your wall."
                      : "Your site is showing the latest published version."
                    : hasChanges
                      ? "You've edited since the last publish."
                      : "Publish to put this widget live."}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 text-xs"
              onClick={studio.onPublish}
              disabled={studio.publishing}
            >
              {studio.publishing
                ? "Publishing…"
                : hasChanges
                  ? "Publish changes"
                  : "Publish"}
            </Button>
          </div>
        </Section>

        {isWall ? (
          <Section title="Share your wall">
            <SnippetBlock
              title="Public wall link"
              hint="Share it anywhere — socials, email, your bio."
              code={wallLink(draft.wall.slug)}
              actions={
                <a
                  href={wallPath(draft.wall.slug)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[10.5px] font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                >
                  <OpenIcon className="size-3" weight="bold" aria-hidden />
                  Open
                </a>
              }
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              You can change the address in Setup.
            </p>
          </Section>
        ) : (
          <Section title="Add to your website">
            <SnippetBlock
              title="Embed snippet"
              hint="Paste once, anywhere on your site. Edits auto-deploy."
              code={widgetEmbedSnippet(projectSlug, widgetId)}
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              More options — React, install, QR — live in{" "}
              <span className="font-medium text-foreground">Share</span> in the
              top bar.
            </p>
          </Section>
        )}
      </div>
    </section>
  );
}
