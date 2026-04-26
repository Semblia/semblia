"use client";

/**
 * Host-page chrome — frames an embed widget inside a faux marketing page so
 * the user sees what the widget looks like in context (not floating in a
 * void). The host page uses muted, generic typography so the widget visually
 * dominates.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface HostPageChromeProps {
  hostName: string;
  contentDark?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function HostPageChrome({
  hostName,
  contentDark = false,
  children,
  className,
}: HostPageChromeProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-y-auto",
        contentDark ? "bg-zinc-950" : "bg-zinc-50",
        className,
      )}
    >
      {/* Faux navbar */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-b px-6 py-3",
          contentDark
            ? "border-zinc-800 bg-zinc-950/80 text-zinc-400"
            : "border-zinc-200/70 bg-white/80 text-zinc-500",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-5 rounded-md",
              contentDark ? "bg-zinc-700" : "bg-zinc-300",
            )}
            aria-hidden
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
            {hostName}
          </span>
        </div>
        <div className="hidden items-center gap-4 text-[11px] sm:flex">
          <span>Product</span>
          <span>Pricing</span>
          <span>Docs</span>
          <span
            className={cn(
              "rounded-md px-2.5 py-1 text-[10px]",
              contentDark
                ? "bg-zinc-800 text-zinc-200"
                : "bg-zinc-900 text-white",
            )}
          >
            Sign in
          </span>
        </div>
      </div>

      {/* Faux hero */}
      <div className="px-6 pb-2 pt-8">
        <div
          className={cn(
            "mx-auto flex max-w-2xl flex-col items-center gap-3 text-center",
          )}
        >
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]",
              contentDark
                ? "border-zinc-700 text-zinc-500"
                : "border-zinc-200 text-zinc-500",
            )}
          >
            Trusted by 4,000+ teams
          </span>
          <h1
            className={cn(
              "text-2xl font-semibold tracking-tight",
              contentDark ? "text-zinc-100" : "text-zinc-900",
            )}
          >
            What people are saying
          </h1>
          <p
            className={cn(
              "max-w-md text-sm",
              contentDark ? "text-zinc-400" : "text-zinc-500",
            )}
          >
            We don&apos;t pay for these. We just collect them and let them
            speak.
          </p>
        </div>
      </div>

      {/* Widget slot */}
      <div className="px-6 py-6">
        <div className="mx-auto max-w-3xl">{children}</div>
      </div>

      {/* Faux footer */}
      <div
        className={cn(
          "mt-auto flex shrink-0 items-center justify-between border-t px-6 py-3 font-mono text-[9px] uppercase tracking-[0.16em]",
          contentDark
            ? "border-zinc-800 text-zinc-600"
            : "border-zinc-200/70 text-zinc-400",
        )}
      >
        <span>
          © {new Date().getFullYear()} {hostName}
        </span>
        <span>Privacy · Terms</span>
      </div>
    </div>
  );
}
