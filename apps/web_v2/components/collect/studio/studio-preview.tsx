"use client";

/**
 * Studio preview stage — scaled device frame with device switcher.
 * Uses ResizeObserver to fit the device into available space.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { DeviceFrame } from "@/components/collect/device-frame";
import type { StudioDevice } from "@/lib/collect/studio-types";
import { useStudioStore } from "@/lib/collect/studio-store";
import { LayoutRenderer } from "./studio-layout-renderer";
import { MonitorIcon, TabletIcon, SmartphoneIcon } from "lucide-react";

/* ─── Device size map ─────────────────────────────────────────────────────── */

const DEVICE_DIMS: Record<StudioDevice, { w: number; h: number }> = {
  desktop: { w: 1280, h: 800 },
  tablet: { w: 768, h: 1024 },
  mobile: { w: 393, h: 852 },
};

/* ─── Device switcher ─────────────────────────────────────────────────────── */

function DeviceSwitcher({
  device,
  onChange,
}: {
  device: StudioDevice;
  onChange: (d: StudioDevice) => void;
}) {
  const buttons: { id: StudioDevice; icon: React.ReactNode; label: string }[] = [
    { id: "desktop", icon: <MonitorIcon className="size-4" aria-hidden="true" />, label: "Desktop" },
    { id: "tablet", icon: <TabletIcon className="size-4" aria-hidden="true" />, label: "Tablet" },
    { id: "mobile", icon: <SmartphoneIcon className="size-4" aria-hidden="true" />, label: "Mobile" },
  ];

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/40 p-0.5"
      role="group"
      aria-label="Preview device"
    >
      {buttons.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => onChange(b.id)}
          aria-label={b.label}
          aria-pressed={device === b.id}
          className={cn(
            "flex items-center justify-center rounded-md p-1.5 transition-all",
            device === b.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {b.icon}
        </button>
      ))}
    </div>
  );
}

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

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: cw, height: ch } = entry.contentRect;
        const pad = 40;
        const availW = cw - pad * 2;
        const availH = ch - pad * 2;
        const s = Math.min(availW / dims.w, availH / dims.h, 1);
        setScale(Math.max(0.2, s));
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [dims.w, dims.h]);

  return (
    <div
      ref={containerRef}
      className="flex flex-1 items-center justify-center overflow-hidden"
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          width: dims.w,
          height: dims.h,
          flexShrink: 0,
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

export function StudioPreview({ formId }: { formId: string }) {
  const draft = useStudioStore((s) => s.snapshots[formId]?.draft);
  const device = useStudioStore((s) => s.device);
  const setDevice = useStudioStore((s) => s.setDevice);

  if (!draft) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Stage chrome bar */}
      <div className="flex items-center justify-center border-b border-border/40 px-4 py-2">
        <DeviceSwitcher device={device} onChange={setDevice} />
      </div>

      {/* Stage area — dotted background */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--muted)) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        <ScaledDeviceFrame device={device}>
          <LayoutRenderer config={draft} />
        </ScaledDeviceFrame>
      </div>
    </div>
  );
}
