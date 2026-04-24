import type { StudioConfig } from "./studio-types";

/* ─── Rule output ─────────────────────────────────────────────────────────── */

export interface DesignIssue {
  id: string;
  severity: "info" | "warn";
  message: string;
  /** Applies a corrective patch to the draft. Undefined = no quick-fix. */
  canonicalFix?: (draft: StudioConfig) => StudioConfig;
}

/* ─── WCAG contrast helper ────────────────────────────────────────────────── */

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const linearize = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 21;
  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ─── Rule definitions ────────────────────────────────────────────────────── */

type Rule = (config: StudioConfig) => DesignIssue | null;

const rules: Rule[] = [
  // Headline too large for split hero pane
  (c) => {
    if (c.tokens.sizeHead > 44 && c.layout.container === "split") {
      return {
        id: "split-head-overflow",
        severity: "warn",
        message: `Headline size ${c.tokens.sizeHead}px may overflow the split hero pane. Consider reducing to 36–44px.`,
        canonicalFix: (d) => ({
          ...d,
          tokens: { ...d.tokens, sizeHead: 36 },
        }),
      };
    }
    return null;
  },

  // Hard shadow invisible in fullbleed (no boxed surface to cast on)
  (c) => {
    if (c.tokens.shadow === "hard" && c.layout.container === "fullbleed") {
      return {
        id: "fullbleed-hard-shadow",
        severity: "warn",
        message:
          "Hard shadow has no surface to cast on in fullbleed layout. Switch to 'soft' or 'none', or use a boxed container.",
        canonicalFix: (d) => ({
          ...d,
          tokens: { ...d.tokens, shadow: "soft" },
        }),
      };
    }
    return null;
  },

  // Glow shadow also invisible in fullbleed
  (c) => {
    if (c.tokens.shadow === "glow" && c.layout.container === "fullbleed") {
      return {
        id: "fullbleed-glow-shadow",
        severity: "info",
        message:
          "Glow shadow is subtle in fullbleed — it looks best on a boxed or centered card.",
        canonicalFix: undefined,
      };
    }
    return null;
  },

  // Airy density + cards flow → oversized card stacks
  (c) => {
    if (c.tokens.density === "airy" && c.layout.flow === "cards") {
      return {
        id: "airy-cards",
        severity: "warn",
        message:
          "Airy density creates oversized card stacks. 'Cozy' or 'Default' density works better with card flow.",
        canonicalFix: (d) => ({
          ...d,
          tokens: { ...d.tokens, density: "cozy" },
        }),
      };
    }
    return null;
  },

  // Floating hero without fullbleed container
  (c) => {
    if (c.layout.hero === "floating" && c.layout.container !== "fullbleed") {
      return {
        id: "floating-not-fullbleed",
        severity: "warn",
        message:
          "Floating hero is designed for fullbleed layout. In boxed/centered/split it can overlap form content.",
        canonicalFix: (d) => ({
          ...d,
          layout: { ...d.layout, container: "fullbleed" },
        }),
      };
    }
    return null;
  },

  // Underline fields + glow shadow in boxed card — aesthetic mismatch
  (c) => {
    if (
      c.tokens.fieldShape === "underline" &&
      c.tokens.shadow === "glow" &&
      c.layout.container === "boxed"
    ) {
      return {
        id: "underline-glow-boxed",
        severity: "info",
        message:
          "Minimal underline fields inside a glowing card feel tonally mismatched. Consider 'soft' shadow or 'rounded' fields.",
        canonicalFix: undefined,
      };
    }
    return null;
  },

  // Block button + underline fields — formality mismatch (block is loud, underline is minimal)
  (c) => {
    if (
      c.tokens.buttonStyle === "block" &&
      c.tokens.fieldShape === "underline"
    ) {
      return {
        id: "block-underline-mismatch",
        severity: "info",
        message:
          "Block uppercase button contrasts sharply with minimal underline fields. Consider 'solid' or 'ghost' button style.",
        canonicalFix: (d) => ({
          ...d,
          tokens: { ...d.tokens, buttonStyle: "solid" },
        }),
      };
    }
    return null;
  },

  // Conversational flow + stepped mobile override — progressive reveal + step nav conflict
  (c) => {
    if (
      c.layout.flow === "conversational" &&
      c.layout.mobileFlow === "stepped"
    ) {
      return {
        id: "convo-stepped-mobile",
        severity: "info",
        message:
          "Stepped mobile flow on a conversational form changes the feel significantly on small screens. 'Auto' inherits the conversational flow.",
        canonicalFix: (d) => ({
          ...d,
          layout: { ...d.layout, mobileFlow: "auto" },
        }),
      };
    }
    return null;
  },

  // WCAG AA contrast check: accent vs. accentInk (buttons, progress bar)
  (c) => {
    const ratio = contrastRatio(c.tokens.accent, c.tokens.accentInk);
    if (ratio < 4.5) {
      return {
        id: "contrast-accent",
        severity: "warn",
        message: `Accent/button text contrast ratio is ${ratio.toFixed(1)}:1, below WCAG AA (4.5:1). Adjust accent or text color for accessibility.`,
        canonicalFix: undefined,
      };
    }
    return null;
  },

  // WCAG AA contrast check: ink vs. bg (body text)
  (c) => {
    const ratio = contrastRatio(c.tokens.ink, c.tokens.bg);
    if (ratio < 4.5) {
      return {
        id: "contrast-ink",
        severity: "warn",
        message: `Body text contrast ratio is ${ratio.toFixed(1)}:1, below WCAG AA (4.5:1). The text may be hard to read for some users.`,
        canonicalFix: undefined,
      };
    }
    return null;
  },
];

/* ─── Public API ──────────────────────────────────────────────────────────── */

export function evaluateDesignHealth(config: StudioConfig): DesignIssue[] {
  return rules
    .map((rule) => rule(config))
    .filter((issue): issue is DesignIssue => issue !== null);
}
