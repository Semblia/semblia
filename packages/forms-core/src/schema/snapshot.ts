import type {
  Appearance,
  ResolvedThemeSnapshot,
} from "@workspace/brand-theme";
import type { FormField } from "./fields.js";
import type { FormContent, FormFlow, FormIntent } from "./definition.js";
import type { TemplatePacing } from "../templates.js";

/**
 * The compiled public snapshot. Produced *deterministically* by the snapshot
 * compiler at publish time and stamped immutably into `FormVersion.snapshot`,
 * so the runtime/renderers never derive or validate at request time. These are
 * TS interfaces (compiler output), not Zod input schemas.
 */

/**
 * The resolved template reference (v6). Identity + normalized accent picks +
 * the AA-clamped theme the template's recipe derived from the brand color.
 * The renderer routes on `templateId` to the matching template pack.
 */
export interface CompiledTemplate {
  templateId: string;
  templateVersion: number;
  pacing: TemplatePacing;
  /** Resolved appearance after clamping into the template's supported set. */
  appearance: Appearance;
  /** Normalized against the manifest's accent spec — safe to trust at render. */
  accents: Record<string, string>;
  /** AA-clamped derived theme per renderable color scheme (brand-theme engine). */
  theme: ResolvedThemeSnapshot;
  /** `--tf-*` custom properties per scheme, ready to drop into a <style>. */
  cssVars: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
}

/** Public brand facts templates may reference in copy/attribution moments. */
export interface SnapshotBrand {
  name: string;
}

/** Public, render-time settings (safe to ship to the browser). */
export interface PublicSnapshotSettings {
  attribution: boolean;
  allowAnonymous: boolean;
  requireConsent: boolean;
  captchaMode: "off" | "suspicious" | "always";
  uploadsAllowed: boolean;
}

export interface SnapshotSecurity {
  embedAllowed: boolean;
  allowedOrigins: string[];
}

export interface SnapshotAssets {
  logoUrl: string | null;
  heroImageUrl: string | null;
}

/**
 * Server-only settings. NEVER included in the public snapshot delivered to the
 * runtime/browser (spec §26 — internal moderation/anti-abuse rules must not
 * leak). Used by the API submit pipeline only.
 */
export interface ServerSnapshotSettings {
  minCompletionMs: number;
  honeypot: boolean;
  blockedWords: string[];
}

/** The public-safe snapshot served to forms_runtime, embeds, and the renderer. */
export interface PublicSnapshot {
  snapshotId: string;
  formId: string;
  projectId: string;
  slug: string | null;
  version: number;

  schemaVersion: string;
  snapshotVersion: string;
  rendererVersion: string;
  coreVersion: string;

  status: "published" | "archived";
  intent: FormIntent;

  template: CompiledTemplate;
  brand: SnapshotBrand;

  fields: FormField[];
  flow: FormFlow;
  content: FormContent;
  settings: PublicSnapshotSettings;
  assets: SnapshotAssets;
  security: SnapshotSecurity;

  checksum: string;
  publishedAt: string;
}

/**
 * The full compiled snapshot stored in `FormVersion.snapshot`. It is the public
 * snapshot plus the server-only settings. `toPublicSnapshot` strips
 * `serverSettings` before anything leaves the API.
 */
export interface CompiledSnapshot extends PublicSnapshot {
  serverSettings: ServerSnapshotSettings;
}
