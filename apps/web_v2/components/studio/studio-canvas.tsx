"use client";

/**
 * StudioCanvas — the shared, controlled preview stage.
 *
 * The artifact renders at TRUE device width inside an honest rounded-rect
 * frame (no fake bezels); a floating label above the frame states the URL and
 * width. Zoom is a first-class, visible system (the Figma/Framer model):
 *
 *   - Fit (default): auto-scales to the stage, re-fits on resize.
 *   - Manual: 25–200% via ctrl/cmd+wheel, the dock stepper, or the zoom menu
 *     (Fit ⇧1 · 50% · 100% `0` · 200%). Manual zoom sticks until Fit.
 *
 * All canvas controls live in one floating bottom-center dock: device · zoom
 * · scheme. The stage is a quiet dot-grid; there are no persistent tips.
 */

import * as React from "react";
import {
  CaretDownIcon,
  DesktopIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  MoonStarsIcon,
  SunIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconSegment } from "./controls";

export type CanvasScheme = "light" | "dark";

export interface CanvasDevice<Id extends string = string> {
  id: Id;
  label: string;
  icon: PhosphorIcon;
  /** True viewport size the artifact renders at. */
  w: number;
  h: number;
}

/** Stock device presets; studios pick the subset they support. */
export const CANVAS_DEVICES = {
  desktop: {
    id: "desktop",
    label: "Desktop",
    icon: DesktopIcon,
    w: 1280,
    h: 800,
  },
  tablet: {
    id: "tablet",
    label: "Tablet",
    icon: DeviceTabletIcon,
    w: 768,
    h: 1024,
  },
  mobile: {
    id: "mobile",
    label: "Mobile",
    icon: DeviceMobileIcon,
    w: 393,
    h: 760,
  },
} as const;

type Zoom = "fit" | number;

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_STOPS = [0.25, 0.5, 0.75, 1, 1.5, 2];
const FIT_PAD = 32;

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

/**
 * The whole zoom system: fit-to-stage (ResizeObserver), ctrl/cmd+wheel,
 * stepper stops, and the keyboard shortcuts. Returns the effective scale.
 */
function useCanvasZoom(
  stageRef: React.RefObject<HTMLDivElement | null>,
  dims: { w: number; h: number },
) {
  const [zoom, setZoom] = React.useState<Zoom>("fit");
  const [fitScale, setFitScale] = React.useState(1);

  // Fit = scale the true-size frame into the stage, never above 100%.
  const applyFit = React.useCallback(
    (cw: number, ch: number) => {
      const availW = Math.max(0, cw - FIT_PAD * 2);
      const availH = Math.max(0, ch - FIT_PAD * 2 - 24); // room for the label
      if (availW === 0 || availH === 0) return;
      setFitScale(clampZoom(Math.min(availW / dims.w, availH / dims.h, 1)));
    },
    [dims.w, dims.h],
  );

  React.useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    applyFit(rect.width, rect.height);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        applyFit(entry.contentRect.width, entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [applyFit, stageRef]);

  const scale = zoom === "fit" ? fitScale : zoom;

  // Ctrl/cmd + wheel zooms (native non-passive listener so we can
  // preventDefault the browser's own page zoom).
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setZoom((prev) => {
        const current = prev === "fit" ? fitScale : prev;
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        return clampZoom(Math.round(current * factor * 100) / 100);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [fitScale, stageRef]);

  const zoomBy = React.useCallback(
    (dir: 1 | -1) => {
      setZoom((prev) => {
        const current = prev === "fit" ? fitScale : prev;
        const next =
          dir === 1
            ? ZOOM_STOPS.find((s) => s > current + 0.001)
            : [...ZOOM_STOPS].reverse().find((s) => s < current - 0.001);
        return next != null ? next : clampZoom(current);
      });
    },
    [fitScale],
  );

  useKeyboardShortcuts([
    {
      key: "0",
      label: "Zoom to 100%",
      group: "Canvas",
      action: () => setZoom(1),
    },
    {
      key: "!",
      label: "Zoom to fit",
      group: "Canvas",
      action: () => setZoom("fit"),
    },
    {
      key: "Ctrl+=",
      label: "Zoom in",
      group: "Canvas",
      action: () => zoomBy(1),
    },
    {
      key: "Meta+=",
      label: "Zoom in",
      group: "Canvas",
      action: () => zoomBy(1),
    },
    {
      key: "Ctrl+-",
      label: "Zoom out",
      group: "Canvas",
      action: () => zoomBy(-1),
    },
    {
      key: "Meta+-",
      label: "Zoom out",
      group: "Canvas",
      action: () => zoomBy(-1),
    },
  ]);

  return { scale, zoomBy, setZoom };
}

export function StudioCanvas<DeviceId extends string>({
  devices,
  device,
  onDeviceChange,
  scheme,
  onSchemeChange,
  schemeHint,
  frameLabel,
  dockExtras,
  onClickCapture,
  stageClassName,
  children,
}: {
  devices: ReadonlyArray<CanvasDevice<DeviceId>>;
  device: DeviceId;
  onDeviceChange: (d: DeviceId) => void;
  scheme: CanvasScheme;
  onSchemeChange: (s: CanvasScheme) => void;
  /** Optional readout next to the scheme control (e.g. "Auto"). */
  schemeHint?: string;
  /** Honest frame label, e.g. the hosted URL. Width is appended. */
  frameLabel: React.ReactNode;
  dockExtras?: React.ReactNode;
  onClickCapture?: (e: React.MouseEvent) => void;
  stageClassName?: string;
  children: React.ReactNode;
}) {
  const dims = devices.find((d) => d.id === device) ?? devices[0];
  const stageRef = React.useRef<HTMLDivElement>(null);
  const { scale, zoomBy, setZoom } = useCanvasZoom(stageRef, dims);

  const scaledW = Math.round(dims.w * scale);
  const scaledH = Math.round(dims.h * scale);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Stage */}
      <div
        ref={stageRef}
        className={cn(
          "tf-stage-grid min-h-0 flex-1 overflow-auto bg-muted/50",
          stageClassName,
        )}
        onClickCapture={onClickCapture}
      >
        <div className="flex min-h-full min-w-fit p-6 pb-20">
          <div className="m-auto">
            {/* Frame label — fixed UI size, outside the transform. */}
            <div
              className="mb-1.5 flex items-center justify-between gap-3 px-0.5"
              style={{ width: scaledW, minWidth: 180 }}
            >
              <span className="truncate font-mono text-[10.5px] text-muted-foreground/80">
                {frameLabel}
              </span>
              <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-muted-foreground/60">
                {dims.w}
              </span>
            </div>

            {/* Scaled wrapper reserves the frame's on-screen box. */}
            <div
              className="tf-canvas-zoom relative"
              style={{ width: scaledW, height: scaledH }}
            >
              <div
                className={cn(
                  "absolute left-0 top-0 origin-top-left overflow-hidden rounded-lg",
                  "border border-border/80 bg-background shadow-md shadow-black/5",
                )}
                style={{
                  width: dims.w,
                  height: dims.h,
                  transform: `scale(${scale})`,
                }}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CanvasDock
        devices={devices}
        device={device}
        onDeviceChange={onDeviceChange}
        scale={scale}
        zoomBy={zoomBy}
        setZoom={setZoom}
        scheme={scheme}
        onSchemeChange={onSchemeChange}
        schemeHint={schemeHint}
        dockExtras={dockExtras}
      />
    </div>
  );
}

function CanvasDock<DeviceId extends string>({
  devices,
  device,
  onDeviceChange,
  scale,
  zoomBy,
  setZoom,
  scheme,
  onSchemeChange,
  schemeHint,
  dockExtras,
}: {
  devices: ReadonlyArray<CanvasDevice<DeviceId>>;
  device: DeviceId;
  onDeviceChange: (d: DeviceId) => void;
  scale: number;
  zoomBy: (dir: 1 | -1) => void;
  setZoom: (z: Zoom) => void;
  scheme: CanvasScheme;
  onSchemeChange: (s: CanvasScheme) => void;
  schemeHint?: string;
  dockExtras?: React.ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border/80 bg-background/95 px-2 py-1.5 shadow-lg shadow-black/10 backdrop-blur-sm">
        {devices.length > 1 && (
          <>
            <IconSegment
              ariaLabel="Preview device"
              options={devices.map((d) => ({
                value: d.id,
                label: d.label,
                icon: d.icon,
              }))}
              value={device}
              onChange={onDeviceChange}
            />
            <DockDivider />
          </>
        )}

        {/* Zoom cluster */}
        <div className="flex items-center">
          <DockButton label="Zoom out" onClick={() => zoomBy(-1)}>
            −
          </DockButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Zoom level"
                className="flex h-6 min-w-[3.25rem] items-center justify-center gap-0.5 rounded-md px-1 text-[11px] font-medium tabular-nums text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
              >
                {Math.round(scale * 100)}%
                <CaretDownIcon
                  className="size-2.5 text-muted-foreground"
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="w-44">
              <DropdownMenuItem onSelect={() => setZoom("fit")}>
                Zoom to fit
                <DropdownMenuShortcut>⇧1</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setZoom(0.5)}>
                Zoom to 50%
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setZoom(1)}>
                Zoom to 100%
                <DropdownMenuShortcut>0</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setZoom(2)}>
                Zoom to 200%
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DockButton label="Zoom in" onClick={() => zoomBy(1)}>
            +
          </DockButton>
        </div>

        <DockDivider />

        <div className="flex items-center gap-1.5">
          <IconSegment<CanvasScheme>
            ariaLabel="Preview color scheme"
            options={[
              { value: "light", label: "Light", icon: SunIcon },
              { value: "dark", label: "Dark", icon: MoonStarsIcon },
            ]}
            value={scheme}
            onChange={onSchemeChange}
          />
          {schemeHint ? (
            <span className="text-[10px] text-muted-foreground/70">
              {schemeHint}
            </span>
          ) : null}
        </div>

        {dockExtras ? (
          <>
            <DockDivider />
            {dockExtras}
          </>
        ) : null}
      </div>
    </div>
  );
}

function DockDivider() {
  return <span aria-hidden className="h-4 w-px bg-border" />;
}

function DockButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
    >
      {children}
    </button>
  );
}
