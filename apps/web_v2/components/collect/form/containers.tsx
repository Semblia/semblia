"use client";

import * as React from "react";

/* ─── Re-exports from container-hero ─────────────────────────────────────── */

export { BrandPill, HeroTop, HeroSide, HeroFloating } from "./container-hero";

/* ─── Powered by footer ───────────────────────────────────────────────────── */

export function PoweredBy() {
  return (
    <div
      style={{
        textAlign: "center",
        fontSize: "calc(var(--f-size-base) * 0.65)",
        color: "var(--f-ink-soft-50)",
        fontFamily: "var(--f-font-mono)",
        letterSpacing: "0.04em",
        padding: "12px 0 4px",
      }}
    >
      Powered by{" "}
      <strong style={{ fontWeight: 600, color: "var(--f-ink-soft)" }}>
        Tresta
      </strong>
    </div>
  );
}

/* ─── Container variants ──────────────────────────────────────────────────── */

export function ContainerBoxed({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maxWidth: "var(--f-container-max-w)",
        margin: "0 auto",
        padding: "var(--f-container-pad-y) var(--f-container-pad-x)",
        background: "var(--f-surface)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--f-line-30)",
        borderRadius: "var(--f-radius)",
        boxShadow: "var(--f-shadow)",
        "--f-sticky-bg": "var(--f-surface)",
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export function ContainerCentered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maxWidth: "var(--f-container-max-w)",
        margin: "0 auto",
        padding: "var(--f-container-pad-y) var(--f-container-pad-x)",
      }}
    >
      {children}
    </div>
  );
}

export function ContainerFullbleed({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "var(--f-container-pad-y) var(--f-container-pad-x)",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}

export function ContainerSplit({
  heroContent,
  children,
}: {
  heroContent: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      {/* Left hero pane — sticky, never scrolls */}
      <div
        style={{
          width: "var(--f-hero-side-w)",
          flexShrink: 0,
          background: "var(--f-accent)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          color: "var(--f-accent-ink)",
          position: "sticky",
          top: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {heroContent}
      </div>
      {/* Right form pane — scrolls independently */}
      <div
        style={{
          flex: 1,
          padding: "var(--f-container-pad-y) var(--f-container-pad-x)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "var(--f-bg)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
