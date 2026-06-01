"use client";

/**
 * Studio preview stage — scaled device frame with device + screen switchers.
 *
 * The framed content is the live, interactive form runtime
 * (`FormPreviewRuntime`): owners flip between the Loader, Form, and Success
 * screens, toggle single-page vs stepped flow, and actually fill the form in.
 * Everything is styled by the live `--f-*` design tokens.
 */

import * as React from "react";
import { DeviceFrame } from "@/components/collect/device-frame";
import { cn } from "@/lib/utils";
import type { StudioDevice } from "@/lib/collect/studio-types";
import {
  useStudioDraft,
  type StudioScreen,
} from "@/lib/collect/studio-draft-context";
import { FormPreviewRuntime } from "./form-preview-runtime";

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

let _previewCssInjected = false;
function ensurePreviewCss() {
  if (_previewCssInjected || typeof document === "undefined") return;
  _previewCssInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-studio-preview", "");
  style.textContent = PREVIEW_CSS;
  document.head.appendChild(style);
}

/* ─── Screen switcher (Loader · Form · Success) ───────────────────────────── */

const SCREENS: { key: StudioScreen; label: string }[] = [
  { key: "loader", label: "Loader" },
  { key: "form", label: "Form" },
  { key: "success", label: "Success" },
];

function SegBar<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5"
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.key)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              on
                ? "bg-background text-foreground shadow-sm"
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

export const StudioPreview = React.memo(function StudioPreview() {
  const { draft, device, screen, setScreen, previewFlow, setPreviewFlow } =
    useStudioDraft();

  React.useEffect(ensurePreviewCss, []);

  if (!draft) return null;

  return (
    <div className="studio-stage flex h-full flex-col bg-muted">
      {/* Stage chrome — screen switcher + device dimensions */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
        <SegBar
          options={SCREENS}
          value={screen}
          onChange={setScreen}
          ariaLabel="Preview screen"
        />
        <div className="flex items-center gap-2">
          {screen === "form" && (
            <SegBar
              options={[
                { key: "all", label: "Single" },
                { key: "stepped", label: "Stepped" },
              ]}
              value={previewFlow}
              onChange={setPreviewFlow}
              ariaLabel="Form flow"
            />
          )}
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
            {device.toUpperCase()} · {DEVICE_DIMS[device].w}×
            {DEVICE_DIMS[device].h}
          </span>
        </div>
      </div>

      {/* Stage area */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ScaledDeviceFrame device={device}>
          <FormPreviewRuntime
            draft={draft}
            screen={screen}
            flow={previewFlow}
            onSubmit={() => setScreen("success")}
          />
        </ScaledDeviceFrame>
      </div>

      {/* Stage tip */}
      <div className="py-2.5 text-center font-mono text-[10px] tracking-[0.04em] text-muted-foreground/70">
        Interactive preview · changes apply live · ⌘S to save
      </div>
    </div>
  );
});
