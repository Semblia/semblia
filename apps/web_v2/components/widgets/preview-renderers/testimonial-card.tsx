"use client";

/**
 * Shared testimonial card — renders a single testimonial honoring the current
 * widget visibility config. Consumed by every layout renderer (carousel, grid,
 * masonry, list, wall). All visual styles flow through `--w-*` CSS variables.
 *
 * Memoized: cards re-render only when their testimonial or visibility changes,
 * not when an unrelated control panel mutation bumps the parent.
 */

import * as React from "react";
import { nameInitials } from "@/lib/format";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import type { WidgetVisibility } from "@/lib/widgets/widget-types";

interface TestimonialCardProps {
  testimonial: WidgetTestimonial;
  visibility: WidgetVisibility;
  /** Render at reduced size — used by the wall layout & mini-preview. */
  scale?: "default" | "dense" | "mini";
}

const SCALE_BASE_FONT: Record<
  NonNullable<TestimonialCardProps["scale"]>,
  string
> = {
  default: "var(--w-fs-base)",
  dense: "calc(var(--w-fs-base) - 1px)",
  mini: "9px",
};

const SCALE_PAD_X: Record<
  NonNullable<TestimonialCardProps["scale"]>,
  string
> = {
  default: "var(--w-card-pad-x)",
  dense: "calc(var(--w-card-pad-x) * 0.85)",
  mini: "8px",
};

const SCALE_PAD_Y: Record<
  NonNullable<TestimonialCardProps["scale"]>,
  string
> = {
  default: "var(--w-card-pad-y)",
  dense: "calc(var(--w-card-pad-y) * 0.85)",
  mini: "8px",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 2,
        color: "var(--w-accent)",
        fontSize: "calc(var(--w-fs-sm) * 1)",
        lineHeight: 1,
      }}
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ opacity: i < rating ? 1 : 0.2 }}>
          ★
        </span>
      ))}
    </div>
  );
}

function Avatar({
  name,
  src,
  scale,
}: {
  name: string;
  src: string | null;
  scale: NonNullable<TestimonialCardProps["scale"]>;
}) {
  const initials = nameInitials(name);
  const size =
    scale === "mini"
      ? "16px"
      : scale === "dense"
        ? "calc(var(--w-avatar) * 0.85)"
        : "var(--w-avatar)";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--w-surface-60)",
        border: "1px solid var(--w-line-50)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: scale === "mini" ? "7px" : "calc(var(--w-fs-xs) * 1)",
        fontWeight: 600,
        color: "var(--w-text-soft)",
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initials
      )}
    </div>
  );
}

function TestimonialCardImpl({
  testimonial: t,
  visibility,
  scale = "default",
}: TestimonialCardProps) {
  const baseFs = SCALE_BASE_FONT[scale];
  const padX = SCALE_PAD_X[scale];
  const padY = SCALE_PAD_Y[scale];

  const showHeader =
    visibility.showAvatar ||
    visibility.showCompany ||
    Boolean(t.authorRole) ||
    true;

  return (
    <article
      style={{
        background: "var(--w-surface)",
        border: "var(--w-card-border)",
        borderRadius: "var(--w-radius)",
        boxShadow: "var(--w-card-shadow)",
        padding: `${padY} ${padX}`,
        color: "var(--w-text)",
        fontFamily: "var(--w-font)",
        fontSize: baseFs,
        lineHeight: 1.5,
        breakInside: "avoid",
        display: "flex",
        flexDirection: "column",
        gap: scale === "mini" ? 6 : 12,
        minWidth: 0,
        boxSizing: "border-box",
        contain: "content",
      }}
    >
      {/* Header row: avatar + author + rating */}
      {showHeader && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: scale === "mini" ? 6 : 10,
            minWidth: 0,
          }}
        >
          {visibility.showAvatar && (
            <Avatar
              name={t.authorName}
              src={t.authorAvatar?.url ?? null}
              scale={scale}
            />
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: baseFs,
                color: "var(--w-text)",
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {t.authorName}
            </div>
            {(t.authorRole || (visibility.showCompany && t.authorCompany)) && (
              <div
                style={{
                  fontSize: "var(--w-fs-xs)",
                  color: "var(--w-text-soft)",
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {[t.authorRole, visibility.showCompany ? t.authorCompany : null]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
          </div>
          {visibility.showRating && t.rating != null && (
            <StarRow rating={t.rating} />
          )}
        </header>
      )}

      {/* Body */}
      <p
        style={{
          margin: 0,
          fontSize: baseFs,
          color: "var(--w-text)",
          lineHeight: 1.55,
          letterSpacing: "-0.005em",
        }}
      >
        {scale === "mini"
          ? t.content.length > 90
            ? `${t.content.slice(0, 88)}…`
            : t.content
          : t.content}
      </p>

      {/* Footer */}
      {(visibility.showDate || (visibility.showSource && t.source)) && (
        <footer
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "var(--w-fs-xs)",
            color: "var(--w-text-faint)",
            marginTop: scale === "mini" ? 0 : 2,
          }}
        >
          {visibility.showDate && <span>{formatDate(t.createdAt)}</span>}
          {visibility.showDate && visibility.showSource && t.source && (
            <span aria-hidden>·</span>
          )}
          {visibility.showSource && t.source && (
            <span style={{ textTransform: "capitalize" }}>{t.source}</span>
          )}
        </footer>
      )}
    </article>
  );
}

export const TestimonialCard = React.memo(TestimonialCardImpl);
