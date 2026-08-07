"use client";

/**
 * What the person actually recorded or attached.
 *
 * The form can ask for a video, a voice note, a screenshot or a file, and until
 * now the review screen rendered all four the same way: as the MediaAsset's
 * cuid, printed as the answer's text. A reviewer could not watch the video they
 * were being asked to approve.
 *
 * Each kind gets the control that plays it — `<video>`, `<audio>`, an `<img>`,
 * or a download link — because the point of this section is to make the
 * judgement possible without leaving the page. The URLs are short-lived
 * presigned reads, so nothing here is a durable address to copy or share.
 */

import * as React from "react";
import {
  DownloadSimpleIcon,
  FileIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import type { V2ResponseMediaDTO } from "@workspace/types";
import { cn } from "@/lib/utils";

/** Bytes as the size a person reads, not the number a machine stores. */
export function fileSize(bytes: number | null): string | null {
  if (bytes === null || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

const KIND_LABEL: Record<V2ResponseMediaDTO["kind"], string> = {
  IMAGE: "Image",
  VIDEO: "Video",
  AUDIO: "Audio",
  FILE: "File",
};

export function ResponseMedia({ media }: { media: V2ResponseMediaDTO[] }) {
  if (media.length === 0) return null;

  return (
    <section
      aria-labelledby="response-media-heading"
      className="mt-6 space-y-3"
    >
      <h3
        id="response-media-heading"
        className="text-[11px] font-medium text-muted-foreground"
      >
        {media.length === 1 ? "Attached" : `Attached · ${media.length}`}
      </h3>
      <ul className="space-y-3">
        {media.map((item) => (
          <li key={item.assetId}>
            <MediaItem item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MediaItem({ item }: { item: V2ResponseMediaDTO }) {
  // A file that exists but could not be signed is not the same as no file —
  // saying so is what stops a reviewer concluding the submission was empty.
  if (!item.url) return <UnavailableMedia item={item} />;

  return (
    <figure className="overflow-hidden rounded-lg bg-surface">
      <MediaPlayer item={item} />
      <figcaption className="flex items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground">
        <span>{KIND_LABEL[item.kind]}</span>
        <span aria-hidden className="text-border">
          ·
        </span>
        <span className="truncate font-mono text-[10px]">
          {item.contentType}
        </span>
        {fileSize(item.byteSize) && (
          <>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span className="tabular-nums">{fileSize(item.byteSize)}</span>
          </>
        )}
        <a
          href={item.url}
          download
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <DownloadSimpleIcon className="size-3" weight="bold" aria-hidden />
          Download
        </a>
      </figcaption>
    </figure>
  );
}

/**
 * `preload="metadata"` on purpose: a queue of recordings should not pull down
 * every take in full the moment the page opens, but a player with no duration
 * is a player you cannot judge the length of before pressing play.
 */
function MediaPlayer({ item }: { item: V2ResponseMediaDTO }) {
  const url = item.url as string;

  if (item.kind === "VIDEO") {
    return (
      <video
        controls
        preload="metadata"
        src={url}
        className="block max-h-[26rem] w-full bg-black"
      />
    );
  }

  if (item.kind === "AUDIO") {
    return (
      <div className="px-3 pt-3">
        <audio controls preload="metadata" src={url} className="w-full" />
      </div>
    );
  }

  if (item.kind === "IMAGE") {
    return (
      // Contain, never cover: this is evidence, and a cropped screenshot is
      // missing exactly the part somebody wanted you to see.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Submitted image"
        className="block max-h-[26rem] w-full bg-muted/40 object-contain"
      />
    );
  }

  return (
    <a
      href={url}
      download
      className="flex items-center gap-2.5 px-3 py-3 text-[13px] text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate">Download attachment</span>
    </a>
  );
}

function UnavailableMedia({ item }: { item: V2ResponseMediaDTO }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2.5",
        "text-xs leading-relaxed text-muted-foreground",
      )}
    >
      <WarningCircleIcon
        className="mt-0.5 size-3.5 shrink-0 text-warning"
        weight="bold"
        aria-hidden
      />
      <span>
        {KIND_LABEL[item.kind]} attached, but it could not be opened right now.
        The file is still stored — try reloading in a moment.
      </span>
    </p>
  );
}
