"use client";

/**
 * WidgetStudioPreview — the live preview stage. Different chrome per kind:
 *   - Embed widgets render inside a faux marketing-page chrome.
 *   - Wall widgets render inside a faux browser chrome with the wall URL.
 *
 * Auto-theme: when theme === "system", we pulse the resolved theme between
 * light/dark every 5s so the user *sees* what auto means in practice.
 */

import * as React from "react";
import { Lightning as LightningIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { V2ProjectDTO } from "@workspace/types";
import {
  composePublishedWidgetDoc,
  publishWidgetDefinition,
} from "@workspace/widgets-core/schema";
import {
  renderPublishedWidgetFragment,
  type WidgetRenderItem,
} from "@workspace/widgets-core/render";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import type {
  WidgetDevice,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { BrowserChrome } from "../preview-renderers/browser-chrome";
import { HostPageChrome } from "../preview-renderers/host-page-chrome";

interface WidgetStudioPreviewProps {
  widgetId: string;
  items: WidgetTestimonial[];
  project: V2ProjectDTO;
}

const DEVICE_DIMS: Record<WidgetDevice, { w: number; h: number }> = {
  desktop: { w: 1280, h: 800 },
  tablet: { w: 768, h: 1024 },
  mobile: { w: 393, h: 852 },
};

function ScaledDeviceFrame({
  device,
  children,
}: {
  device: WidgetDevice;
  children: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const dims = DEVICE_DIMS[device];
  const rafRef = React.useRef(0);

  const applyScale = React.useCallback(
    (cw: number, ch: number) => {
      const pad = 24;
      const availW = Math.max(0, cw - pad * 2);
      const availH = Math.max(0, ch - pad * 2);
      if (availW === 0 || availH === 0) return;
      const s = Math.min(availW / dims.w, availH / dims.h) * 0.96;
      setScale(Math.max(0.2, Math.min(s, 1)));
    },
    [dims.w, dims.h],
  );

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    applyScale(width, height);
  }, [applyScale]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width: cw, height: ch } = entry.contentRect;
          applyScale(cw, ch);
        }
      });
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [applyScale]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div
        className="widget-stage-frame"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
          width: dims.w,
          height: dims.h,
          willChange: "transform",
        }}
      >
        <div
          className={cn(
            "relative h-full w-full overflow-hidden border shadow-xl shadow-black/8",
            device === "mobile"
              ? "rounded-[40px] border-zinc-700/50 bg-zinc-900 p-[10px]"
              : device === "tablet"
                ? "rounded-[28px] border-zinc-700/50 bg-zinc-900 p-[6px]"
                : "rounded-lg border-border bg-background",
          )}
        >
          {/* Mobile/tablet bezel notches */}
          {device === "mobile" && (
            <>
              <div className="pointer-events-none absolute left-1/2 top-[10px] z-20 -translate-x-1/2">
                <div className="relative h-[28px] w-[100px] rounded-full bg-black">
                  <div className="absolute right-[14px] top-1/2 size-[8px] -translate-y-1/2 rounded-full bg-zinc-800 ring-1 ring-zinc-700/60" />
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-[8px] left-1/2 z-20 -translate-x-1/2">
                <div className="h-[5px] w-[120px] rounded-full bg-foreground/20" />
              </div>
            </>
          )}
          <div
            className={cn(
              "relative h-full w-full overflow-hidden",
              device === "mobile"
                ? "rounded-[34px] pt-[38px] pb-[26px]"
                : device === "tablet"
                  ? "rounded-[22px] pt-[22px] pb-[18px]"
                  : "rounded-b-md",
            )}
            style={{ display: "flex", flexDirection: "column" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const STAGE_CSS = `
.widget-stage-frame {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  contain: style;
}
@media (prefers-reduced-motion: reduce) {
  .widget-stage-frame { transition: none; }
}
`;

let _stageCssInjected = false;
function ensureStageCss() {
  if (_stageCssInjected || typeof document === "undefined") return;
  _stageCssInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-widget-stage", "");
  style.textContent = STAGE_CSS;
  document.head.appendChild(style);
}

/**
 * Auto-theme pulse — when theme === "system", we cycle the resolved preview
 * between light and dark every 5s so the user sees what visitors will see.
 */
function useAutoThemePreview(active: boolean): boolean {
  const [preferDark, setPreferDark] = React.useState(false);

  React.useEffect(() => {
    if (!active) {
      setPreferDark(false);
      return;
    }
    setPreferDark(false);
    const id = window.setInterval(() => {
      setPreferDark((p) => !p);
    }, 5000);
    return () => window.clearInterval(id);
  }, [active]);

  return preferDark;
}

export const WidgetStudioPreview = React.memo(function WidgetStudioPreview({
  widgetId,
  items,
  project,
}: WidgetStudioPreviewProps) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const device = useWidgetStudioStore((s) => s.device);
  const setDevice = useWidgetStudioStore((s) => s.setDevice);

  React.useEffect(ensureStageCss, []);

  const autoActive = draft?.theme === "system";
  const preferDark = useAutoThemePreview(autoActive ?? false);

  const resolved = React.useMemo(() => {
    if (!draft) return "light";
    if (draft.theme === "dark") return "dark";
    if (draft.theme === "system" && preferDark) return "dark";
    return "light";
  }, [draft, preferDark]);

  // Handpicked content: filter by pickedIds order.
  // (Hook ordering: must run before any early return.)
  const contentMode = draft?.content.mode;
  const pickedIdsKey = draft?.content.pickedIds.join(",") ?? "";
  const renderedItems = React.useMemo(() => {
    if (!draft) return items;
    if (contentMode === "all") return items;
    if (draft.content.pickedIds.length === 0) return items;
    const map = new Map(items.map((t) => [t.id, t]));
    const ordered = draft.content.pickedIds
      .map((id) => map.get(id))
      .filter((t): t is WidgetTestimonial => Boolean(t));
    return ordered.length > 0 ? ordered : items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, contentMode, pickedIdsKey, draft]);

  if (!draft) return null;

  const isWall = draft.kind === "wall";
  const wallUrl = `semblia.com/wall/${draft.wall.slug}`;
  const fragmentHtml = renderStudioFragment({
    widgetId,
    draft,
    items: renderedItems,
  });

  return (
    <div className="widget-stage flex h-full min-h-0 flex-col bg-muted">
      {/* Stage chrome — top */}
      <div className="flex shrink-0 items-center justify-between px-5 py-2.5 font-mono text-[10px] tracking-tight text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-brand" aria-hidden />
          LIVE PREVIEW
          {autoActive && (
            <>
              <span aria-hidden>·</span>
              <span>{preferDark ? "DARK MODE" : "LIGHT MODE"}</span>
            </>
          )}
          {draft.behavior.autoRotate && draft.layout === "carousel" && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <LightningIcon className="size-3" weight="fill" aria-hidden />
                ROTATING
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DevicePills device={device} onChange={setDevice} />
          <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground/70 lg:inline">
            {DEVICE_DIMS[device].w}×{DEVICE_DIMS[device].h}
          </span>
        </div>
      </div>

      {/* Stage area */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ScaledDeviceFrame device={device}>
          {isWall ? (
            <BrowserChrome url={wallUrl} contentDark={resolved === "dark"}>
              <ShadowWidgetFragment html={fragmentHtml} />
            </BrowserChrome>
          ) : (
            <HostPageChrome
              hostName={project.name}
              contentDark={resolved === "dark"}
            >
              <ShadowWidgetFragment html={fragmentHtml} />
            </HostPageChrome>
          )}
        </ScaledDeviceFrame>
      </div>

      {/* Stage tip */}
      <div className="px-5 pb-2.5 pt-1 text-center font-mono text-[9.5px] tracking-tight text-muted-foreground/65">
        {isWall ? "Wall preview" : "Shown on a sample page"} · ⌘S to save ·
        changes auto-deploy
      </div>
    </div>
  );
});

function DevicePills({
  device,
  onChange,
}: {
  device: WidgetDevice;
  onChange: (d: WidgetDevice) => void;
}) {
  const opts: { id: WidgetDevice; label: string }[] = [
    { id: "desktop", label: "Desktop" },
    { id: "tablet", label: "Tablet" },
    { id: "mobile", label: "Mobile" },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-background/60 p-0.5 backdrop-blur-md">
      {opts.map((o) => {
        const on = device === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={on}
            className={cn(
              "inline-flex h-6 items-center justify-center rounded px-2 font-mono text-[9.5px] uppercase tracking-[0.14em]",
              "transition-[background,color] duration-150",
              on
                ? "bg-foreground/90 text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function renderStudioFragment({
  widgetId,
  draft,
  items,
}: {
  widgetId: string;
  draft: WidgetStudioConfig;
  items: WidgetTestimonial[];
}) {
  const snapshot = publishWidgetDefinition(draft.definition);
  const doc = composePublishedWidgetDoc(draft.definition, snapshot);
  return renderPublishedWidgetFragment(doc, {
    widgetId,
    items: items.map(toRenderItem),
  }).html;
}

function toRenderItem(item: WidgetTestimonial): WidgetRenderItem {
  return {
    id: item.id,
    authorName: item.authorName,
    authorRole: item.authorRole,
    authorCompany: item.authorCompany,
    authorAvatarUrl: item.authorAvatar?.url ?? null,
    content: item.content,
    rating: item.rating,
    source: item.source,
    sourceUrl: item.sourceUrl,
    createdAt: item.createdAt,
  };
}

function ShadowWidgetFragment({ html }: { html: string }) {
  const hostRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    root.innerHTML = html;
  }, [html]);

  return <div ref={hostRef} className="h-full w-full" />;
}
