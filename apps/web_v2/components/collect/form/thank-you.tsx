"use client";

import * as React from "react";

export function ThankYou({ brandName }: { brandName?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--f-flow-gap)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--f-accent-08)",
          border: "1.5px solid var(--f-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
        }}
      >
        ✓
      </div>
      <h2
        style={{
          fontFamily: "var(--f-font-head)",
          fontSize: "var(--f-size-head)",
          fontWeight:
            "var(--f-weight-head)" as React.CSSProperties["fontWeight"],
          letterSpacing: "var(--f-tracking-head)",
          color: "var(--f-ink)",
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        Thank you!
      </h2>
      <p
        style={{
          fontFamily: "var(--f-font-body)",
          fontSize: "var(--f-size-base)",
          fontWeight:
            "var(--f-weight-body)" as React.CSSProperties["fontWeight"],
          color: "var(--f-ink-soft)",
          maxWidth: "calc(var(--f-container-max-w) * 0.65)",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {brandName
          ? `${brandName} appreciates your feedback.`
          : "Your feedback means the world to us."}
      </p>
    </div>
  );
}
