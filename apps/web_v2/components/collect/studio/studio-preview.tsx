"use client";

/**
 * Studio preview stage — scaled device frame with device switcher.
 * Uses ResizeObserver to fit the device into available space.
 */

import * as React from "react";
import { DeviceFrame } from "@/components/collect/device-frame";
import { tokensToCssVars, textureBg } from "@/lib/collect/studio-token-css";
import type { StudioConfig, StudioDevice } from "@/lib/collect/studio-types";
import { useStudioStore } from "@/lib/collect/studio-store";

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

function TokenChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        flex: "1 1 132px",
        border: "1px solid var(--f-line-50)",
        background: "var(--f-surface-60)",
        borderRadius: "calc(var(--f-radius) * 1px)",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--f-font-mono)",
          fontSize: "var(--f-size-xs)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--f-ink-soft)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: "var(--f-size-sm)",
          fontWeight: 600,
          color: "var(--f-ink)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TokenPreviewShell({ draft }: { draft: StudioConfig }) {
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
        overflow: "hidden",
        background: tokens.bg,
        backgroundImage: textureImage,
        color: tokens.ink,
        fontFamily: tokens.fontBody,
      }) satisfies React.CSSProperties,
    [cssVars, textureImage, tokens.bg, tokens.fontBody, tokens.ink],
  );

  const brandName = draft.brandName.trim() || tokens.brandName.trim() || "Your brand";

  return (
    <div style={shellStyle}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, var(--f-accent-08), transparent 48%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "var(--f-container-pad-y) var(--f-container-pad-x)",
          gap: "var(--f-section-gap)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                border: "1px solid var(--f-line-50)",
                background: "var(--f-surface-60)",
                color: "var(--f-ink-soft)",
                borderRadius: 999,
                padding: "7px 12px",
                fontFamily: "var(--f-font-mono)",
                fontSize: "var(--f-size-xs)",
                letterSpacing: "0.09em",
                textTransform: "uppercase",
              }}
            >
              Token preview
            </div>
            <div
              style={{
                fontSize: "var(--f-size-sm)",
                color: "var(--f-ink-soft)",
              }}
            >
              {brandName}
            </div>
          </div>

          <div
            style={{
              fontFamily: "var(--f-font-mono)",
              fontSize: "var(--f-size-xs)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--f-ink-soft)",
            }}
          >
            {tokens.dark ? "Dark palette" : "Light palette"}
          </div>
        </div>

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
          }}
        >
          <div
            style={{
              fontFamily: "var(--f-font-mono)",
              fontSize: "var(--f-size-xs)",
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: "var(--f-accent)",
            }}
          >
            Static studio shell
          </div>

          <h1
            style={{
              margin: "16px 0 0",
              fontFamily: "var(--f-font-head)",
              fontSize: "calc(var(--f-size-head) * 0.78)",
              fontWeight: "var(--f-weight-head)",
              letterSpacing: "var(--f-tracking-head)",
              lineHeight: 1.04,
              color: "var(--f-ink)",
            }}
          >
            Tune the visual tokens now. Templates and fields return in the next pass.
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              fontSize: "var(--f-size-base)",
              lineHeight: 1.6,
              color: "var(--f-ink-soft)",
              maxWidth: 520,
            }}
          >
            This preview is intentionally static. Colors, type, texture, spacing,
            and button treatment update live so presets can stay polished without
            exposing raw layout controls.
          </p>

          <div
            style={{
              display: "grid",
              gap: "var(--f-gap)",
              marginTop: "calc(var(--f-section-gap) * 0.9)",
            }}
          >
            <div
              style={{
                border: "1px solid var(--f-line-50)",
                borderRadius: "var(--f-field-radius)",
                background: "var(--f-bg)",
                padding: "var(--f-field-pad)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--f-font-mono)",
                  fontSize: "var(--f-size-xs)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--f-ink-soft)",
                }}
              >
                Template hero slot
              </div>
              <div
                style={{
                  marginTop: "var(--f-label-gap)",
                  fontSize: "var(--f-size-sm)",
                  color: "var(--f-ink)",
                }}
              >
                Placeholder content only. No live fields or branching logic here.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: "var(--f-gap)",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              }}
            >
              <div
                style={{
                  border: "1px dashed var(--f-line)",
                  borderRadius: "var(--f-field-radius)",
                  background: "var(--f-bg)",
                  minHeight: 84,
                  padding: "var(--f-field-pad)",
                }}
              >
                <div
                  style={{
                    width: "52%",
                    height: 10,
                    borderRadius: 999,
                    background: "var(--f-line-30)",
                  }}
                />
                <div
                  style={{
                    marginTop: 14,
                    width: "100%",
                    height: 34,
                    borderRadius: "var(--f-field-radius)",
                    background: "var(--f-surface-60)",
                  }}
                />
              </div>

              <div
                style={{
                  border: "1px dashed var(--f-line)",
                  borderRadius: "var(--f-field-radius)",
                  background: "var(--f-bg)",
                  minHeight: 84,
                  padding: "var(--f-field-pad)",
                }}
              >
                <div
                  style={{
                    width: "44%",
                    height: 10,
                    borderRadius: 999,
                    background: "var(--f-line-30)",
                  }}
                />
                <div
                  style={{
                    marginTop: 14,
                    width: "100%",
                    height: 34,
                    borderRadius: "var(--f-field-radius)",
                    background: "var(--f-surface-60)",
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              disabled
              style={{
                alignSelf: "flex-start",
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
                  tokens.buttonStyle === "block" ? "uppercase" : "none",
                letterSpacing: "var(--f-btn-tracking)",
                opacity: 0.92,
                cursor: "default",
              }}
            >
              Primary action preview
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            width: "100%",
            maxWidth: "min(100%, 760px)",
            margin: "0 auto",
          }}
        >
          <TokenChip label="Field shape" value={tokens.fieldShape} />
          <TokenChip label="Density" value={tokens.density} />
          <TokenChip label="Button" value={tokens.buttonStyle} />
          <TokenChip label="Texture" value={tokens.texture} />
        </div>
      </div>
    </div>
  );
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
      {/* Stage chrome — live indicator + reset + device label */}
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
              background: "#f59e0b",
              boxShadow: "0 0 6px #f59e0b60",
            }}
          />
          TOKEN PREVIEW
        </div>
        <span style={{ transition: "opacity 0.2s" }}>
          {device.toUpperCase()} · {DEVICE_DIMS[device].w}×{DEVICE_DIMS[device].h}
        </span>
      </div>

      {/* Stage area — static shell only, no live form implementation */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ScaledDeviceFrame device={device}>
          <TokenPreviewShell draft={draft} />
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
        Static shell · token changes apply instantly · Cmd+S to save
      </div>
    </div>
  );
});
