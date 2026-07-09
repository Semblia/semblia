"use client";

/**
 * PreviewChrome — the floating pill on the full-page preview routes.
 *
 * The Figma Present idea: the artifact owns the viewport; chrome auto-hides
 * after a moment of stillness and returns on mouse movement (always visible
 * while focused, and when reduced motion is preferred).
 */

import * as React from "react";
import {
  ArrowCounterClockwiseIcon,
  MoonStarsIcon,
  SunIcon,
  XIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconSegment } from "./controls";
import type { CanvasDevice, CanvasScheme } from "./studio-canvas";

const IDLE_MS = 2500;

export function PreviewChrome<DeviceId extends string>({
  backHref,
  backLabel = "Back to studio",
  devices,
  device,
  onDeviceChange,
  scheme,
  onSchemeChange,
  onRestart,
}: {
  backHref: string;
  backLabel?: string;
  devices?: ReadonlyArray<CanvasDevice<DeviceId>>;
  device?: DeviceId;
  onDeviceChange?: (d: DeviceId) => void;
  scheme: CanvasScheme;
  onSchemeChange: (s: CanvasScheme) => void;
  onRestart?: () => void;
}) {
  const [visible, setVisible] = React.useState(true);
  const [pinned, setPinned] = React.useState(false); // focus/hover holds it open
  const timerRef = React.useRef<number>(0);

  React.useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return; // stays visible

    const poke = () => {
      setVisible(true);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setVisible(false), IDLE_MS);
    };
    poke();
    window.addEventListener("mousemove", poke);
    window.addEventListener("keydown", poke);
    window.addEventListener("touchstart", poke);
    return () => {
      window.clearTimeout(timerRef.current);
      window.removeEventListener("mousemove", poke);
      window.removeEventListener("keydown", poke);
      window.removeEventListener("touchstart", poke);
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed left-1/2 top-4 z-50 -translate-x-1/2 transition-[opacity,transform] duration-200",
        visible || pinned
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-1.5 opacity-0",
      )}
      onMouseEnter={() => setPinned(true)}
      onMouseLeave={() => setPinned(false)}
      onFocusCapture={() => setPinned(true)}
      onBlurCapture={() => setPinned(false)}
    >
      <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/95 px-2 py-1.5 shadow-lg shadow-black/10 backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={backHref}
              aria-label={backLabel}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
            >
              <XIcon className="size-3.5" weight="bold" aria-hidden />
            </a>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[11px]">
            {backLabel}
          </TooltipContent>
        </Tooltip>

        {devices && devices.length > 1 && device && onDeviceChange ? (
          <>
            <span aria-hidden className="h-4 w-px bg-border" />
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
          </>
        ) : null}

        <span aria-hidden className="h-4 w-px bg-border" />
        <IconSegment<CanvasScheme>
          ariaLabel="Color scheme"
          options={[
            { value: "light", label: "Light", icon: SunIcon },
            { value: "dark", label: "Dark", icon: MoonStarsIcon },
          ]}
          value={scheme}
          onChange={onSchemeChange}
        />

        {onRestart ? (
          <>
            <span aria-hidden className="h-4 w-px bg-border" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Restart preview"
                  onClick={onRestart}
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
                >
                  <ArrowCounterClockwiseIcon className="size-3.5" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Restart
              </TooltipContent>
            </Tooltip>
          </>
        ) : null}
      </div>
    </div>
  );
}
