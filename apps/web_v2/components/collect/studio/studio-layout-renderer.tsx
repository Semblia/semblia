"use client";

/**
 * Studio layout renderer — composable flow × container × hero system.
 * Translates the design reference's layout engine to React/inline-styles.
 */

import * as React from "react";
import type {
  DesignTokens,
  LayoutConfig,
  StudioQuestion,
  StudioConfig,
} from "@/lib/collect/studio-types";
import { evalShowIf } from "@/lib/collect/studio-types";
import { StudioField, SubmitButton, hexAlpha } from "./studio-fields";

/* ─── Texture backgrounds ─────────────────────────────────────────────────── */

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
function safeHex(hex: string, fallback: string): string {
  return HEX_RE.test(hex) ? hex : fallback;
}

function textureBg(texture: DesignTokens["texture"], ink: string): string | undefined {
  if (texture === "none") return undefined;
  if (texture === "grain") {
    return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E")`;
  }
  const sanitized = safeHex(ink, "#000000");
  const encodedInk = encodeURIComponent(sanitized);
  if (texture === "dots") {
    return `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='0.6' fill='${encodedInk}' opacity='0.06'/%3E%3C/svg%3E")`;
  }
  if (texture === "lines") {
    return `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 6L6 0' stroke='${encodedInk}' stroke-width='0.3' opacity='0.06'/%3E%3C/svg%3E")`;
  }
  return undefined;
}

/* ─── Brand pill ──────────────────────────────────────────────────────────── */

function BrandMark({ tokens, name }: { tokens: DesignTokens; name: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 14px 5px 5px",
        borderRadius: 999,
        background: hexAlpha(tokens.surface, 0.7),
        border: `1px solid ${hexAlpha(tokens.line, 0.3)}`,
        fontSize: tokens.sizeBase * 0.75,
        fontFamily: tokens.fontBody,
        color: tokens.inkSoft,
        backdropFilter: "blur(8px)",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: tokens.accent,
          color: tokens.accentInk,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {name.charAt(0)}
      </span>
      {name}
    </div>
  );
}

/* ─── Headline ────────────────────────────────────────────────────────────── */

function Headline({
  headline,
  subhead,
  tokens,
}: {
  headline: string;
  subhead: string;
  tokens: DesignTokens;
}) {
  return (
    <div>
      <h1
        style={{
          fontFamily: tokens.fontHead,
          fontSize: tokens.sizeHead,
          fontWeight: tokens.weightHead,
          letterSpacing: `${tokens.trackingHead}em`,
          lineHeight: 1.1,
          color: tokens.ink,
          margin: 0,
          textWrap: "balance" as React.CSSProperties["textWrap"],
        }}
      >
        {headline}
      </h1>
      {subhead && (
        <p
          style={{
            fontFamily: tokens.fontBody,
            fontSize: tokens.sizeBase,
            fontWeight: tokens.weightBody,
            color: tokens.inkSoft,
            lineHeight: 1.6,
            marginTop: 12,
            maxWidth: 480,
          }}
        >
          {subhead}
        </p>
      )}
    </div>
  );
}

/* ─── Powered by footer ───────────────────────────────────────────────────── */

function PoweredBy({ tokens }: { tokens: DesignTokens }) {
  return (
    <div
      style={{
        textAlign: "center" as const,
        fontSize: tokens.sizeBase * 0.65,
        color: hexAlpha(tokens.inkSoft, 0.5),
        fontFamily: tokens.fontMono || "monospace",
        letterSpacing: "0.04em",
        padding: "16px 0",
      }}
    >
      Powered by <strong style={{ fontWeight: 600, color: tokens.inkSoft }}>Tresta</strong>
    </div>
  );
}

/* ─── Thank you panel ─────────────────────────────────────────────────────── */

function ThankYouPanel({ tokens }: { tokens: DesignTokens }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 300,
        gap: 16,
        textAlign: "center" as const,
        padding: "40px 24px",
      }}
    >
      <div style={{ fontSize: 48 }}>✨</div>
      <h2
        style={{
          fontFamily: tokens.fontHead,
          fontSize: tokens.sizeHead * 0.7,
          fontWeight: tokens.weightHead,
          color: tokens.ink,
          margin: 0,
        }}
      >
        Thank you!
      </h2>
      <p
        style={{
          fontFamily: tokens.fontBody,
          fontSize: tokens.sizeBase,
          color: tokens.inkSoft,
          maxWidth: 360,
          lineHeight: 1.6,
        }}
      >
        Your feedback means the world to us. We'll review every word.
      </p>
    </div>
  );
}

/* ─── Flow renderers ──────────────────────────────────────────────────────── */

function FlowAll({
  questions,
  tokens,
  values,
}: {
  questions: StudioQuestion[];
  tokens: DesignTokens;
  values: Record<string, unknown>;
}) {
  const visible = questions.filter((q) => evalShowIf(q, values));
  const gap = tokens.density === "compact" ? 16 : tokens.density === "airy" ? 28 : 20;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {visible.map((q) => (
        <StudioField key={q.id} question={q} tokens={tokens} />
      ))}
      <div style={{ marginTop: 8 }}>
        <SubmitButton tokens={tokens} />
      </div>
    </div>
  );
}

function FlowStepped({
  questions,
  tokens,
  values,
}: {
  questions: StudioQuestion[];
  tokens: DesignTokens;
  values: Record<string, unknown>;
}) {
  const [step, setStep] = React.useState(0);
  const visible = questions.filter((q) => evalShowIf(q, values));
  const current = visible[step];
  const total = visible.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Progress bar */}
      <div
        style={{
          height: 3,
          background: hexAlpha(tokens.line, 0.3),
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((step + 1) / total) * 100}%`,
            background: tokens.accent,
            borderRadius: 999,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Current question */}
      {current && <StudioField question={current} tokens={tokens} />}

      {/* Navigation */}
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          style={{
            fontFamily: tokens.fontBody,
            fontSize: tokens.sizeBase * 0.85,
            color: step === 0 ? hexAlpha(tokens.inkSoft, 0.3) : tokens.inkSoft,
            background: "none",
            border: "none",
            cursor: step === 0 ? "default" : "pointer",
            padding: "8px 16px",
          }}
        >
          ← Back
        </button>

        {step < total - 1 ? (
          <button
            type="button"
            onClick={() => setStep(Math.min(total - 1, step + 1))}
            style={{
              fontFamily: tokens.fontBody,
              fontSize: tokens.sizeBase * 0.85,
              color: tokens.accent,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              padding: "8px 16px",
            }}
          >
            Next →
          </button>
        ) : (
          <SubmitButton tokens={tokens} />
        )}
      </div>
    </div>
  );
}

function FlowCards({
  questions,
  tokens,
  values,
}: {
  questions: StudioQuestion[];
  tokens: DesignTokens;
  values: Record<string, unknown>;
}) {
  const [current, setCurrent] = React.useState(0);
  const visible = questions.filter((q) => evalShowIf(q, values));
  const q = visible[current];

  return (
    <div style={{ position: "relative", minHeight: 200 }}>
      {/* Stacked card effect */}
      {visible.slice(current, current + 3).map((cq, i) => (
        <div
          key={cq.id}
          style={{
            position: i === 0 ? "relative" : "absolute",
            top: i * 6,
            left: i * 3,
            right: i * 3,
            zIndex: 10 - i,
            background: tokens.surface,
            border: `1px solid ${hexAlpha(tokens.line, 0.4)}`,
            borderRadius: tokens.radius + 4,
            padding: 24,
            opacity: i === 0 ? 1 : 0.6 - i * 0.2,
            transform: `scale(${1 - i * 0.03})`,
            transition: "all .3s ease",
            boxShadow:
              i === 0
                ? tokens.shadow === "soft"
                  ? `0 8px 24px ${hexAlpha(tokens.ink, 0.08)}`
                  : tokens.shadow === "hard"
                    ? `4px 4px 0 ${tokens.ink}`
                    : "none"
                : "none",
          }}
        >
          {i === 0 && q && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <StudioField question={q} tokens={tokens} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                {current > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrent((c) => c - 1)}
                    style={{
                      fontFamily: tokens.fontBody,
                      fontSize: tokens.sizeBase * 0.85,
                      color: tokens.inkSoft,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    ← Back
                  </button>
                )}
                {current < visible.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrent((c) => c + 1)}
                    style={{
                      fontFamily: tokens.fontBody,
                      fontSize: tokens.sizeBase * 0.85,
                      fontWeight: 600,
                      color: tokens.accent,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  <SubmitButton tokens={tokens} />
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FlowConvo({
  questions,
  tokens,
  values,
}: {
  questions: StudioQuestion[];
  tokens: DesignTokens;
  values: Record<string, unknown>;
}) {
  const [revealed, setRevealed] = React.useState(1);
  const visible = questions.filter((q) => evalShowIf(q, values));
  const shown = visible.slice(0, revealed);
  const gap = tokens.density === "compact" ? 20 : tokens.density === "airy" ? 36 : 28;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {shown.map((q, i) => (
        <div
          key={q.id}
          style={{
            opacity: 1,
            transition: "opacity .3s ease",
          }}
        >
          <StudioField question={q} tokens={tokens} />
          {i === shown.length - 1 && revealed < visible.length && (
            <button
              type="button"
              onClick={() => setRevealed((r) => r + 1)}
              style={{
                display: "block",
                marginTop: 12,
                fontFamily: tokens.fontBody,
                fontSize: tokens.sizeBase * 0.85,
                fontWeight: 600,
                color: tokens.accent,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Continue ↓
            </button>
          )}
        </div>
      ))}
      {revealed >= visible.length && (
        <div style={{ marginTop: 8 }}>
          <SubmitButton tokens={tokens} />
        </div>
      )}
    </div>
  );
}

/* ─── Container variants ──────────────────────────────────────────────────── */

function BoxedContainer({
  tokens,
  children,
}: {
  tokens: DesignTokens;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: "40px 32px",
        background: tokens.surface,
        border: `1px solid ${hexAlpha(tokens.line, 0.4)}`,
        borderRadius: tokens.radius + 4,
        boxShadow:
          tokens.shadow === "soft"
            ? `0 8px 32px ${hexAlpha(tokens.ink, 0.06)}`
            : tokens.shadow === "hard"
              ? `5px 5px 0 ${tokens.ink}`
              : tokens.shadow === "glow"
                ? `0 0 40px ${hexAlpha(tokens.accent, 0.15)}`
                : "none",
      }}
    >
      {children}
    </div>
  );
}

function CenteredContainer({
  tokens,
  children,
}: {
  tokens: DesignTokens;
  children: React.ReactNode;
}) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}>
      {children}
    </div>
  );
}

function FullbleedContainer({
  tokens,
  children,
}: {
  tokens: DesignTokens;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: "40px 32px", width: "100%", maxWidth: "100%" }}>
      {children}
    </div>
  );
}

function SplitContainer({
  tokens,
  heroContent,
  children,
}: {
  tokens: DesignTokens;
  heroContent: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100%", width: "100%" }}>
      {/* Left hero pane */}
      <div
        style={{
          width: "42%",
          flexShrink: 0,
          background: `linear-gradient(135deg, ${tokens.accent}, ${hexAlpha(tokens.accent, 0.7)})`,
          display: "flex",
          flexDirection: "column" as const,
          justifyContent: "center",
          padding: 32,
          color: tokens.accentInk,
        }}
      >
        {heroContent}
      </div>
      {/* Right form pane */}
      <div
        style={{
          flex: 1,
          padding: "40px 32px",
          overflowY: "auto" as const,
          display: "flex",
          flexDirection: "column" as const,
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Hero variants ───────────────────────────────────────────────────────── */

function HeroTop({
  tokens,
  config,
}: {
  tokens: DesignTokens;
  config: StudioConfig;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center" }}>
      {/* Brand bar */}
      {config.layout.showBrandPill && (
        <div
          style={{
            width: "100%",
            padding: "14px 20px",
            borderBottom: `1px solid ${hexAlpha(tokens.line, 0.3)}`,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <BrandMark tokens={tokens} name={config.brandName} />
        </div>
      )}
      <div style={{ padding: "40px 24px 24px", textAlign: "center" as const, maxWidth: 480 }}>
        <Headline headline={config.headline} subhead={config.subhead} tokens={tokens} />
      </div>
    </div>
  );
}

function HeroSide({
  tokens,
  config,
}: {
  tokens: DesignTokens;
  config: StudioConfig;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column" as const, justifyContent: "center",
      gap: 20, height: "100%",
    }}>
      {config.layout.showBrandPill && (
        <BrandMark tokens={tokens} name={config.brandName} />
      )}
      <Headline headline={config.headline} subhead={config.subhead} tokens={tokens} />
      <blockquote
        style={{
          fontFamily: tokens.fontHead,
          fontStyle: "italic",
          fontSize: tokens.sizeBase * 1.1,
          lineHeight: 1.6,
          color: hexAlpha(tokens.accentInk, 0.8),
          borderLeft: `3px solid ${hexAlpha(tokens.accentInk, 0.3)}`,
          paddingLeft: 16,
          margin: "16px 0 0",
          maxWidth: 260,
        }}
      >
        &ldquo;The feedback we got transformed our product roadmap.&rdquo;
      </blockquote>
    </div>
  );
}

function HeroFloating({
  tokens,
  config,
}: {
  tokens: DesignTokens;
  config: StudioConfig;
}) {
  return (
    <div
      style={{
        position: "absolute" as const,
        top: 24,
        left: 24,
        zIndex: 10,
        maxWidth: 280,
      }}
    >
      {config.layout.showBrandPill && (
        <BrandMark tokens={tokens} name={config.brandName} />
      )}
      <h2
        style={{
          fontFamily: tokens.fontHead,
          fontSize: tokens.sizeHead * 0.55,
          fontWeight: tokens.weightHead,
          color: tokens.ink,
          margin: "8px 0 0",
          lineHeight: 1.2,
        }}
      >
        {config.headline}
      </h2>
    </div>
  );
}

/* ─── Main layout renderer ────────────────────────────────────────────────── */

export const LayoutRenderer = React.memo(function LayoutRenderer({
  config,
}: {
  config: StudioConfig;
}) {
  const { tokens, layout, questions, headline, subhead } = config;
  const values: Record<string, unknown> = {}; // preview — no real values

  const tex = textureBg(tokens.texture, tokens.ink);

  // Pick flow renderer
  const flowProps = { questions, tokens, values };
  const flowNode =
    layout.flow === "stepped" ? (
      <FlowStepped {...flowProps} />
    ) : layout.flow === "cards" ? (
      <FlowCards {...flowProps} />
    ) : layout.flow === "conversational" ? (
      <FlowConvo {...flowProps} />
    ) : (
      <FlowAll {...flowProps} />
    );

  // Pick hero
  const heroNode =
    layout.hero === "top" ? (
      <HeroTop tokens={tokens} config={config} />
    ) : layout.hero === "floating" ? (
      <HeroFloating tokens={tokens} config={config} />
    ) : layout.hero === "side" ? null : // side hero is handled by SplitContainer
    null;

  // Combine hero + flow
  const formContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {heroNode}
      {flowNode}
      <PoweredBy tokens={tokens} />
    </div>
  );

  // Pick container
  let containerNode: React.ReactNode;
  if (layout.container === "split") {
    containerNode = (
      <SplitContainer
        tokens={tokens}
        heroContent={
          <HeroSide tokens={tokens} config={config} />
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {flowNode}
          <PoweredBy tokens={tokens} />
        </div>
      </SplitContainer>
    );
  } else if (layout.container === "boxed") {
    containerNode = (
      <BoxedContainer tokens={tokens}>{formContent}</BoxedContainer>
    );
  } else if (layout.container === "centered") {
    containerNode = (
      <CenteredContainer tokens={tokens}>{formContent}</CenteredContainer>
    );
  } else {
    containerNode = (
      <FullbleedContainer tokens={tokens}>{formContent}</FullbleedContainer>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100%",
        background: tokens.bg,
        backgroundImage: tex,
        fontFamily: tokens.fontBody,
        color: tokens.ink,
        position: "relative",
        overflowY: layout.container === "split" ? "hidden" : "auto",
      }}
    >
      {containerNode}
    </div>
  );
});
