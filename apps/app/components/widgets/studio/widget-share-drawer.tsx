"use client";

/**
 * WidgetShareDrawer — right-side drawer over the studio editor.
 *
 * Walls get three tabs (Public URL + QR, Embed, Settings); embeds get two —
 * an embed has no hosted page, so there is no link tab to offer. Every URL
 * comes from the project's issued wall host (WS-A1); the drawer never mints
 * an address, and the embed snippet is the only integration surface until
 * `@semblia/react` actually ships (WS-J).
 *
 * Built on radix Dialog (Sheet) for portal/focus-trap; leaf pieces are the
 * shared share-drawer parts, which the forms drawer composes too.
 */

import * as React from "react";
import {
  X as XIcon,
  Code as CodeIcon,
  Globe as GlobeIcon,
  Sliders as SlidersIcon,
  ArrowSquareOut as OpenIcon,
  Sparkle as SparkleIcon,
} from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DrawerTabButton,
  ShareQrCard,
  SnippetBlock,
} from "@/components/shared";
import { useProjectHost } from "@/hooks/api";
import { wallLink } from "@/lib/public-hosts";
import { widgetEmbedSnippet } from "@/lib/semblia-urls";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";

interface WidgetShareDrawerProps {
  projectSlug: string;
  widgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "code" | "link" | "settings";

export function WidgetShareDrawer({
  projectSlug,
  widgetId,
  open,
  onOpenChange,
}: WidgetShareDrawerProps) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const wasFirstRun = useWidgetStudioStore(
    (s) => s.snapshots[widgetId]?.isFirstRun ?? false,
  );
  const setBehavior = useWidgetStudioStore((s) => s.setBehavior);

  const isWall = draft?.kind === "wall";
  const defaultTab: Tab = isWall ? "link" : "code";
  const [tab, setTab] = React.useState<Tab>(defaultTab);

  // Re-sync default tab whenever drawer opens for a different widget kind.
  React.useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  // Celebrate moment — sparkle when drawer opens directly after first save.
  const [celebrate, setCelebrate] = React.useState(false);
  React.useEffect(() => {
    if (open && wasFirstRun) {
      setCelebrate(true);
      const t = window.setTimeout(() => setCelebrate(false), 1800);
      return () => window.clearTimeout(t);
    }
  }, [open, wasFirstRun]);

  if (!draft) return null;
  const activeTab: Tab = !isWall && tab === "link" ? "code" : tab;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <ShareDrawerHeader
          isWall={isWall}
          celebrate={celebrate}
          onClose={() => onOpenChange(false)}
        />
        <ShareDrawerTabs isWall={isWall} activeTab={activeTab} onTab={setTab} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "code" && (
            <EmbedTab
              projectSlug={projectSlug}
              widgetId={widgetId}
              celebrate={celebrate}
            />
          )}
          {activeTab === "link" && isWall && (
            <WallLinkTab
              projectSlug={projectSlug}
              name={draft.name}
              wallSlug={draft.wall.slug}
            />
          )}
          {activeTab === "settings" && (
            <SettingsTab
              showBranding={draft.behavior.showBranding}
              onToggleBranding={(v) =>
                setBehavior(widgetId, { showBranding: v })
              }
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ShareDrawerHeader({
  isWall,
  celebrate,
  onClose,
}: {
  isWall: boolean;
  celebrate: boolean;
  onClose: () => void;
}) {
  return (
    <SheetHeader className="flex-row items-start justify-between gap-2 border-b border-border/60 p-4">
      <div className="min-w-0 flex-1">
        <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
          Share &amp; embed
          {celebrate && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
              <SparkleIcon className="size-2.5" weight="fill" aria-hidden />
              Live
            </span>
          )}
        </SheetTitle>
        <SheetDescription className="mt-0.5 text-[11px] leading-snug">
          {isWall
            ? "Share the public URL anywhere — socials, email, your bio."
            : "Drop the snippet anywhere on your site. Edits auto-deploy."}
        </SheetDescription>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Close share drawer"
      >
        <XIcon className="size-3.5" weight="bold" aria-hidden />
      </button>
    </SheetHeader>
  );
}

/** The tab strip — a link tab exists only where a public page does. */
function ShareDrawerTabs({
  isWall,
  activeTab,
  onTab,
}: {
  isWall: boolean;
  activeTab: Tab;
  onTab: (tab: Tab) => void;
}) {
  return (
    <div className="flex shrink-0 border-b border-border/60 bg-muted/25">
      {isWall && (
        <DrawerTabButton
          active={activeTab === "link"}
          onClick={() => onTab("link")}
          Icon={GlobeIcon}
          label="Public URL"
        />
      )}
      <DrawerTabButton
        active={activeTab === "code"}
        onClick={() => onTab("code")}
        Icon={CodeIcon}
        label="Embed"
      />
      <DrawerTabButton
        active={activeTab === "settings"}
        onClick={() => onTab("settings")}
        Icon={SlidersIcon}
        label="Settings"
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Embed tab                                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

function EmbedTab({
  projectSlug,
  widgetId,
  celebrate,
}: {
  projectSlug: string;
  widgetId: string;
  celebrate: boolean;
}) {
  const scriptSnippet = widgetEmbedSnippet(projectSlug, widgetId);

  return (
    <div className="space-y-4">
      {celebrate && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-300/30 bg-emerald-50/60 px-3 py-2.5 text-[11.5px] leading-snug text-emerald-800 dark:border-emerald-300/15 dark:bg-emerald-950/30 dark:text-emerald-300">
          <SparkleIcon
            className="mt-0.5 size-3.5 shrink-0"
            weight="fill"
            aria-hidden
          />
          <div>
            <strong className="font-semibold">Your widget is live.</strong> Copy
            the snippet below and paste it into your site to ship it.
          </div>
        </div>
      )}

      <SnippetBlock
        title="HTML snippet"
        hint="Works on any site — plain HTML, React, or any framework."
        code={scriptSnippet}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Wall link tab                                                             */
/* ──────────────────────────────────────────────────────────────────────── */

function WallLinkTab({
  projectSlug,
  name,
  wallSlug,
}: {
  projectSlug: string;
  name: string;
  wallSlug: string;
}) {
  const wallHost = useProjectHost(projectSlug, "WALL");
  const url = wallLink(wallHost.hostname, wallSlug);

  // No live wall host means there is no URL — say so instead of minting one.
  if (!url) {
    return (
      <div className="rounded-lg bg-warning/10 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
        {wallHost.isLoading
          ? "Checking this project's wall address…"
          : "This project's wall address is not live yet, so there is no public URL to share. Check Settings → Domains."}
      </div>
    );
  }

  const social = `Loved by people who use ${name}. See the wall → ${url}`;

  return (
    <div className="space-y-4">
      <SnippetBlock
        title="Public wall URL"
        hint="Share this link anywhere — social, email, footer."
        code={url}
        actions={
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[10.5px] font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          >
            <OpenIcon className="size-3" weight="bold" aria-hidden />
            Open
          </a>
        }
      />

      <ShareQrCard
        url={url}
        filename={`semblia-wall-${wallSlug || "qr"}.png`}
        qrTitle="QR code linking to the public testimonial wall"
        description="Scan to open the wall. Drop the PNG into print, packaging, slide decks, or event signage for offline sharing."
      />

      <SnippetBlock
        title="Suggested social copy"
        hint="One-liner you can paste."
        code={social}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Settings tab                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

function SettingsTab({
  showBranding,
  onToggleBranding,
}: {
  showBranding: boolean;
  onToggleBranding: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-foreground">
            Show Semblia footer
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            A subtle &ldquo;Powered by Semblia&rdquo; line. Removable on Pro.
          </p>
        </div>
        <Switch checked={showBranding} onCheckedChange={onToggleBranding} />
      </label>

      <div className="rounded-lg border border-emerald-300/30 bg-emerald-50/40 px-3 py-3 dark:border-emerald-300/15 dark:bg-emerald-950/30">
        <div className="flex items-start gap-2">
          <SparkleIcon
            className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            weight="fill"
            aria-hidden
          />
          <div className="text-[11.5px] leading-snug text-emerald-800 dark:text-emerald-300">
            <strong className="font-semibold">Edits auto-deploy.</strong> You
            never have to re-embed. Save once, and every page using this widget
            updates instantly.
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card px-3 py-3">
        <div className="text-[12.5px] font-semibold text-foreground">
          Performance
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Embed is async + deferred. Doesn&apos;t block your page load. Average
          TTI impact under 60ms on 4G.
        </p>
      </div>
    </div>
  );
}
