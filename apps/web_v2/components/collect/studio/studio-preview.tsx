"use client";

/**
 * Studio preview stage — scaled device frame with device switcher.
 * Uses ResizeObserver to fit the device into available space.
 */

import * as React from "react";
import { DeviceFrame } from "@/components/collect/device-frame";
import type { StudioDevice } from "@/lib/collect/studio-types";
import { useStudioStore } from "@/lib/collect/studio-store";
import { TestimonialForm } from "@/components/collect/form";
import { DesignHealthBanner } from "./design-health-banner";

/* ─── Device size map ─────────────────────────────────────────────────────── */

const DEVICE_DIMS: Record<StudioDevice, { w: number; h: number }> = {
  desktop: { w: 1280, h: 800 },
  tablet: { w: 768, h: 1024 },
  mobile: { w: 393, h: 852 },
};

/* ─── Scaled device frame wrapper ─────────────────────────────────────────── */

const ScaledDeviceFrame = React.memo(function ScaledDeviceFrame({
  device,
  children,
}: {
  device: StudioDevice;
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
      const s = Math.min(availW / dims.w, availH / dims.h) * 0.95;
      setScale(Math.max(0.2, Math.min(s, 1)));
    },
    [dims.w, dims.h],
  );

  // Compute scale synchronously before first paint to avoid flash at scale=1.
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

  // The scaled frame is positioned absolutely so its intrinsic dims.h never
  // influences the parent's flex height — ResizeObserver on containerRef now
  // reads the true available stage slot, not the frame's own height.
  return (
    <div
      ref={containerRef}
      style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}
    >
      <div
        className="studio-stage-frame"
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
        <DeviceFrame device={device} showChrome>
          {children}
        </DeviceFrame>
      </div>
    </div>
  );
});

/* ─── Main preview stage ────────────────────────────────────────────── */

const PREVIEW_CSS = `
.studio-stage {
  --stage-bg: #eae7df;
  --stage-chrome: #8d8b83;
  --stage-tip: #b8b7b1;
  transition: background-color 0.3s ease;
  contain: style paint;
}
:is(.dark, [data-theme="dark"]) .studio-stage {
  --stage-bg: #1a1814;
  --stage-chrome: #6b6963;
  --stage-tip: #4a4840;
}
.studio-stage-frame {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  contain: style;
}
@keyframes stage-pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
.stage-live-dot { animation: stage-pulse 2s ease-in-out infinite; }
@keyframes step-fade-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
`;

/* Inject preview CSS once at module level to avoid re-creating <style> on every render */
let _previewCssInjected = false;
function ensurePreviewCss() {
  if (_previewCssInjected || typeof document === "undefined") return;
  _previewCssInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-studio-preview", "");
  style.textContent = PREVIEW_CSS;
  document.head.appendChild(style);
}

export const StudioPreview = React.memo(function StudioPreview({
  formId,
}: {
  formId: string;
}) {
  const draft = useStudioStore((s) => s.snapshots[formId]?.draft);
  const device = useStudioStore((s) => s.device);

  React.useEffect(ensurePreviewCss, []);

  if (!draft) return null;

  return (
    <div
      className="studio-stage flex h-full flex-col"
      style={{ background: "var(--stage-bg, #eae7df)" }}
    >
      {/* Design health — non-blocking warnings above the stage */}
      <DesignHealthBanner formId={formId} />

      {/* Stage chrome — live indicator + label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          fontFamily: '"Geist Mono", ui-monospace, monospace',
          fontSize: 10.5,
          letterSpacing: "0.06em",
          color: "var(--stage-chrome, #8d8b83)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            className="stage-live-dot"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#4ade80",
              boxShadow: "0 0 6px #4ade8060",
            }}
          />
          LIVE PREVIEW
        </div>
        <span style={{ transition: "opacity 0.2s" }}>
          {device.toUpperCase()} · {DEVICE_DIMS[device].w}×
          {DEVICE_DIMS[device].h}
        </span>
      </div>

      {/* Stage area — warm paper background */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ScaledDeviceFrame device={device}>
          <TestimonialForm config={draft} mode="preview" />
        </ScaledDeviceFrame>
      </div>

      {/* Stage tip */}
      <div
        style={{
          textAlign: "center" as const,
          padding: "8px 0 12px",
          fontFamily: '"Geist Mono", ui-monospace, monospace',
          fontSize: 10,
          color: "var(--stage-tip, #b8b7b1)",
          letterSpacing: "0.04em",
        }}
      >
        Changes apply instantly · Cmd+S to save
      </div>
    </div>
  );
});
