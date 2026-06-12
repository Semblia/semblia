"use client";

/**
 * WidgetShareDrawer — right-side drawer over the studio editor.
 *
 * Three tabs:
 *   - Embed (default for embed widgets): <script>, React, npm
 *   - Public link (default for wall widgets): URL + open + scannable QR
 *   - Settings: branding toggle + auto-deploy reassurance
 *
 * Built on radix Dialog (Sheet) for portal/focus-trap. The drawer slides
 * from the right with a soft backdrop. Uses `vaul`-style enter motion via
 * Tailwind data-* keyframes.
 */

import * as React from "react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import {
  X as XIcon,
  Code as CodeIcon,
  Globe as GlobeIcon,
  Sliders as SlidersIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
  ArrowSquareOut as OpenIcon,
  CircleNotch as SpinnerIcon,
  Sparkle as SparkleIcon,
  DownloadSimple as DownloadIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";

interface WidgetShareDrawerProps {
  widgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "code" | "link" | "settings";

export function WidgetShareDrawer({
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        {/* Custom header (replaces default) */}
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
            onClick={() => onOpenChange(false)}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close share drawer"
          >
            <XIcon className="size-3.5" weight="bold" aria-hidden />
          </button>
        </SheetHeader>

        {/* Tab strip */}
        <div className="flex shrink-0 border-b border-border/60 bg-muted/25">
          <DrawerTabButton
            active={tab === "link"}
            onClick={() => setTab("link")}
            Icon={GlobeIcon}
            label={isWall ? "Public URL" : "Hosted link"}
          />
          <DrawerTabButton
            active={tab === "code"}
            onClick={() => setTab("code")}
            Icon={CodeIcon}
            label="Embed"
          />
          <DrawerTabButton
            active={tab === "settings"}
            onClick={() => setTab("settings")}
            Icon={SlidersIcon}
            label="Settings"
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "code" && (
            <EmbedTab widgetId={widgetId} celebrate={celebrate} />
          )}
          {tab === "link" && <LinkTab widgetId={widgetId} isWall={isWall} />}
          {tab === "settings" && (
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

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

function DrawerTabButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: PhosphorIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-[11.5px] font-medium",
        "transition-colors duration-150",
        active
          ? "border-b-2 border-foreground text-foreground"
          : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" weight="bold" aria-hidden />
      <span>{label}</span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Embed tab                                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

function EmbedTab({
  widgetId,
  celebrate,
}: {
  widgetId: string;
  celebrate: boolean;
}) {
  const scriptSnippet = `<script src="https://cdn.semblia.com/embed.js" data-widget="${widgetId}" defer></script>`;
  const reactSnippet = `import { SembliaWidget } from "@semblia/react";

<SembliaWidget id="${widgetId}" />`;
  const npmSnippet = `npm install @semblia/react`;

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
        title="HTML / Vanilla"
        hint="Drop into any website."
        code={scriptSnippet}
      />
      <SnippetBlock
        title="React / Next.js"
        hint="Component-style integration."
        code={reactSnippet}
      />
      <SnippetBlock
        title="Install"
        hint="Run once in your project."
        code={npmSnippet}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Link tab                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

function LinkTab({ widgetId, isWall }: { widgetId: string; isWall: boolean }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  if (!draft) return null;

  const url = isWall
    ? `https://semblia.com/wall/${draft.wall.slug}`
    : `https://embed.semblia.com/preview/${widgetId}`;

  const social = isWall
    ? `Loved by people who use ${draft.name}. See the wall → ${url}`
    : `Real testimonials, live now. ${url}`;

  return (
    <div className="space-y-4">
      <SnippetBlock
        title={isWall ? "Public wall URL" : "Hosted preview URL"}
        hint={
          isWall
            ? "Share this link anywhere — social, email, footer."
            : "A standalone preview of this widget. Useful for QA."
        }
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

      {isWall && (
        <>
          <WallQrCard url={url} slug={draft.wall.slug} />

          <SnippetBlock
            title="Suggested social copy"
            hint="One-liner you can paste."
            code={social}
          />
        </>
      )}
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

/* ──────────────────────────────────────────────────────────────────────── */
/*  Snippet block (copy + feedback)                                            */
/* ──────────────────────────────────────────────────────────────────────── */

function SnippetBlock({
  title,
  hint,
  code,
  actions,
}: {
  title: string;
  hint?: string;
  code: string;
  actions?: React.ReactNode;
}) {
  const [state, setState] = React.useState<"idle" | "copying" | "copied">(
    "idle",
  );

  const onCopy = async () => {
    setState("copying");
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
      toast.success("Copied to clipboard");
      window.setTimeout(() => setState("idle"), 1400);
    } catch {
      setState("idle");
      toast.error("Couldn't copy. Try again.");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-foreground">
            {title}
          </div>
          {hint && (
            <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {actions}
          <button
            type="button"
            onClick={onCopy}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10.5px] font-medium",
              "transition-[border-color,background,color] duration-150",
              state === "copied"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {state === "copying" ? (
              <SpinnerIcon
                className="size-3 animate-spin"
                weight="bold"
                aria-hidden
              />
            ) : state === "copied" ? (
              <CheckIcon className="size-3" weight="bold" aria-hidden />
            ) : (
              <CopyIcon className="size-3" weight="bold" aria-hidden />
            )}
            {state === "copied" ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre
        className={cn(
          "max-h-48 overflow-auto p-3 font-mono text-[11px] leading-relaxed",
          "text-foreground/90",
        )}
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Wall QR card — real, scannable QR with PNG download                       */
/* ──────────────────────────────────────────────────────────────────────── */

function WallQrCard({ url, slug }: { url: string; slug: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Fixed black-on-white for maximum scan reliability across themes and print.
  const handleDownload = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("QR not ready yet — try again in a moment.");
      return;
    }
    try {
      const href = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = href;
      link.download = `semblia-wall-${slug || "qr"}.png`;
      link.click();
      toast.success("QR downloaded");
    } catch {
      toast.error("Couldn't export the QR. Try again.");
    }
  }, [slug]);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          QR code
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[10.5px] font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground"
        >
          <DownloadIcon className="size-3" weight="bold" aria-hidden />
          PNG
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="shrink-0 rounded-md border border-border bg-white p-2">
          <QRCodeCanvas
            ref={canvasRef}
            value={url}
            size={88}
            level="M"
            marginSize={0}
            fgColor="#000000"
            bgColor="#ffffff"
            title="QR code linking to the public testimonial wall"
          />
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Scan to open the wall. Drop the PNG into print, packaging, slide
          decks, or event signage for offline sharing.
        </p>
      </div>
    </div>
  );
}
