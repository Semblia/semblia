"use client";

/**
 * ProjectAvatar — the canonical project icon. Resolves, in order:
 *   1. an uploaded logo asset,
 *   2. the site favicon derived from the project's website URL,
 *   3. brand-coloured initials.
 *
 * Images use object-contain on a neutral surface (never cover-crop a brand
 * mark) and fall back to initials if they fail to load, so the icon is always
 * something sensible. This is what turns "add your website" into "your favicon
 * is now your project icon" across the app.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { projectInitials } from "@/lib/format";
import { faviconForUrl } from "@/lib/favicon";

interface ProjectAvatarProps {
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  brandColor?: string | null;
  /** Tailwind size + rounding classes for the outer box (e.g. "size-10"). */
  className?: string;
  rounded?: string;
  textClassName?: string;
}

export function ProjectAvatar({
  name,
  logoUrl,
  websiteUrl,
  brandColor,
  className,
  rounded = "rounded-lg",
  textClassName = "text-sm font-bold",
}: ProjectAvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const src = logoUrl || faviconForUrl(websiteUrl);
  const showImage = Boolean(src) && !failed;
  const color = brandColor ?? "var(--brand)";

  if (showImage) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden border border-border/60 bg-white",
          rounded,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src as string}
          alt=""
          className="size-full object-contain p-[15%]"
          onError={() => setFailed(true)}
          aria-hidden
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center text-white shadow-sm",
        rounded,
        textClassName,
        className,
      )}
      style={
        {
          backgroundColor: color,
          "--tw-shadow-color": color,
        } as React.CSSProperties
      }
      aria-hidden
    >
      {projectInitials(name)}
    </span>
  );
}
