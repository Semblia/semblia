import type { FormDesignTokens } from "./types.js";

export function tokensToCssVars(
  tokens: FormDesignTokens,
): Record<string, string> {
  return {
    "--tresta-form-accent": tokens.accent,
    "--tresta-form-background": tokens.background,
    "--tresta-form-text": tokens.text,
    "--tresta-form-muted-text": tokens.mutedText,
    "--tresta-form-surface": tokens.surface,
    "--tresta-form-border": tokens.border,
    "--tresta-form-radius": `${tokens.radius}px`,
    "--tresta-form-font-family": tokens.fontFamily,
  };
}
