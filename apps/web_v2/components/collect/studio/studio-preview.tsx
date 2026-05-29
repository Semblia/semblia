"use client";

/**
 * Studio preview stage — scaled device frame with device switcher.
 * Uses ResizeObserver to fit the device into available space.
 *
 * The framed content is a representative, non-interactive testimonial form
 * styled entirely by the live `--f-*` design tokens, so the owner sees how
 * their chosen style reads on a real form. It is decorative only (the actual
 * field/flow builder lives elsewhere) and is hidden from assistive tech.
 */

import * as React from "react";
import { DeviceFrame } from "@/components/collect/device-frame";
import { tokensToCssVars, textureBg } from "@/lib/collect/studio-token-css";
import type { FormConfig, StudioDevice } from "@/lib/collect/studio-types";
import { useStudioDraft } from "@/lib/collect/studio-draft-context";

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
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
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

/* ─── Preview-only CSS (card enter animation) ─────────────────────────────── */

const PREVIEW_CSS = `
.studio-stage {
  transition: background-color 0.3s ease;
  contain: style paint;
}
.studio-stage-frame {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  contain: style;
}
@keyframes step-fade-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
.studio-shell-card { animation: step-fade-in 240ms ease-out both; }
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

/* ─── Representative form field (visual sample, not a real input) ─────────── */

function SampleField({
  label,
  placeholder,
  multiline,
}: {
  label: string;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          marginBottom: "var(--f-label-gap)",
          fontSize: "var(--f-size-sm)",
          fontWeight: 600,
          color: "var(--f-ink)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          border: "1px solid var(--f-line-50)",
          borderRadius: "var(--f-field-radius)",
          background: "var(--f-bg)",
          padding: "var(--f-field-pad)",
          minHeight: multiline ? 88 : undefined,
          fontSize: "var(--f-size-base)",
          color: "var(--f-ink-soft)",
        }}
      >
        {placeholder}
      </div>
    </div>
  );
}

function TokenPreviewShell({ draft }: { draft: FormConfig }) {
  const { tokens } = draft;
  const cssVars = React.useMemo(
    () => tokensToCssVars(tokens) as React.CSSProperties,
    [tokens],
  );
  const textureImage = React.useMemo(
    () => textureBg(tokens.texture, tokens.ink),
    [tokens.texture, tokens.ink],
  );
  const shellStyle = React.useMemo(
    () =>
      ({
        ...cssVars,
        position: "relative",
        height: "100%",
        overflowY: "auto",
        background: tokens.bg,
        backgroundImage: textureImage,
        color: tokens.ink,
        fontFamily: tokens.fontBody,
      }) satisfies React.CSSProperties,
    [cssVars, textureImage, tokens.bg, tokens.fontBody, tokens.ink],
  );

  const brandName =
    draft.brandName.trim() || tokens.brandName.trim() || "Your brand";

  return (
    <div style={shellStyle} aria-hidden="true">
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minHeight: "100%",
          padding: "var(--f-container-pad-y) var(--f-container-pad-x)",
        }}
      >
        <div
          className="studio-shell-card"
          style={{
            width: "100%",
            maxWidth: "min(100%, var(--f-container-max-w))",
            margin: "0 auto",
            border: "1px solid var(--f-line-50)",
            background: "var(--f-surface)",
            boxShadow: "var(--f-shadow)",
            borderRadius: "calc(var(--f-radius) * 1px)",
            padding: "var(--f-container-pad-y) var(--f-container-pad-x)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--f-gap)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--f-font-mono)",
              fontSize: "var(--f-size-xs)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--f-accent)",
            }}
          >
            {brandName}
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: "var(--f-font-head)",
              fontSize: "calc(var(--f-size-head) * 0.78)",
              fontWeight: "var(--f-weight-head)",
              letterSpacing: "var(--f-tracking-head)",
              lineHeight: 1.08,
              color: "var(--f-ink)",
            }}
          >
            Share your experience
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "var(--f-size-base)",
              lineHeight: 1.55,
              color: "var(--f-ink-soft)",
              maxWidth: 460,
            }}
          >
            A few words about working with us go a long way. Thank you for
            taking the time.
          </p>

          {/* Rating row */}
          <div
            style={{
              display: "flex",
              gap: 6,
              fontSize: "calc(var(--f-size-head) * 0.5)",
              lineHeight: 1,
              color: "var(--f-accent)",
            }}
          >
            {"★★★★★".split("").map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>

          <SampleField label="Your name" placeholder="Jordan Rivera" />
          <SampleField
            label="Your testimonial"
            placeholder="What stood out about working together?"
            multiline
          />

          <div
            role="presentation"
            style={{
              alignSelf:
                tokens.buttonStyle === "block" ? "stretch" : "flex-start",
              width: "var(--f-btn-width)",
              textAlign: "center",
              borderRadius: "var(--f-btn-radius)",
              borderWidth: "var(--f-btn-border-w)",
              borderStyle: "var(--f-btn-border-s)",
              borderColor: "var(--f-btn-border-c)",
              background: "var(--f-btn-bg)",
              color: "var(--f-btn-color)",
              boxShadow: "var(--f-btn-shadow)",
              padding: "var(--f-btn-pad-y) var(--f-btn-pad-x)",
              fontSize: "var(--f-size-sm)",
              fontWeight: 600,
              textTransform:
                "var(--f-btn-uppercase)" as React.CSSProperties["textTransform"],
              letterSpacing: "var(--f-btn-tracking)",
            }}
          >
            Send testimonial
          </div>
        </div>
      </div>
    </div>
  );
}

export const StudioPreview = React.memo(function StudioPreview() {
  const { draft, device } = useStudioDraft();

  React.useEffect(ensurePreviewCss, []);

  if (!draft) return null;

  return (
    <div className="studio-stage flex h-full flex-col bg-muted">
      {/* Stage chrome — quiet label + device dimensions */}
      <div className="flex items-center justify-between px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
        <span>Preview</span>
        <span>
          {device.toUpperCase()} · {DEVICE_DIMS[device].w}×
          {DEVICE_DIMS[device].h}
        </span>
      </div>

      {/* Stage area */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ScaledDeviceFrame device={device}>
          <TokenPreviewShell draft={draft} />
        </ScaledDeviceFrame>
      </div>

      {/* Stage tip */}
      <div className="py-2.5 text-center font-mono text-[10px] tracking-[0.04em] text-muted-foreground/70">
        Changes apply live · ⌘S to save
      </div>
    </div>
  );
});
