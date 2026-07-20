import { compileTemplate } from "./design.js";
import type { FormDefinitionDoc } from "./schema/definition.js";
import type { CompiledSnapshot, PublicSnapshot } from "./schema/snapshot.js";
import { resolveTemplateManifest } from "./templates.js";
import { CORE_VERSION, RENDERER_VERSION, SNAPSHOT_VERSION } from "./version.js";

/**
 * The snapshot compiler (spec §13, §14.3). Deterministically turns an editable
 * doc into an immutable, public-safe published artifact. Pure + sync so the
 * studio preview, the publish path, and the renderers can never disagree.
 */

export interface SnapshotMeta {
  snapshotId: string;
  formId: string;
  projectId: string;
  slug: string | null;
  version: number;
  status?: "published" | "archived";
  publishedAt?: string;
  /** Resolved by the API from the doc's logo/hero asset ids. */
  logoUrl?: string | null;
  heroImageUrl?: string | null;
}

// ── Deterministic, dependency-free content checksum (also used as an etag) ─────
// forms-core runs in the browser (studio preview) too, so we avoid node:crypto.
// This is a content fingerprint for cache validation + change detection, not a
// security primitive.

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map(
      (k) =>
        `${JSON.stringify(k)}:${stableStringify(
          (value as Record<string, unknown>)[k],
        )}`,
    )
    .join(",")}}`;
}

function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const high = (2097151 & h2).toString(16).padStart(6, "0");
  const low = (h1 >>> 0).toString(16).padStart(8, "0");
  return `${high}${low}`;
}

export function computeChecksum(value: unknown): string {
  return cyrb53(stableStringify(value));
}

export function compileSnapshot(
  doc: FormDefinitionDoc,
  meta: SnapshotMeta,
): CompiledSnapshot {
  const template = compileTemplate(doc);
  const manifest = resolveTemplateManifest(doc.templateId);
  const heroSupported = manifest.assetSlots.includes("hero");

  const snapshot: CompiledSnapshot = {
    snapshotId: meta.snapshotId,
    formId: meta.formId,
    projectId: meta.projectId,
    slug: meta.slug,
    version: meta.version,

    schemaVersion: doc.schemaVersion,
    snapshotVersion: SNAPSHOT_VERSION,
    rendererVersion: RENDERER_VERSION,
    coreVersion: CORE_VERSION,

    status: meta.status ?? "published",
    intent: doc.intent,
    delivery: doc.delivery,

    template,
    brand: { name: doc.brand.name },

    fields: doc.fields,
    flow: doc.flow,
    content: doc.content,
    settings: {
      attribution: doc.settings.attribution,
      allowAnonymous: doc.settings.allowAnonymous,
      requireConsent: doc.settings.requireConsent,
      captchaMode: doc.settings.captchaMode,
      uploadsAllowed: doc.settings.uploadsAllowed,
    },
    assets: {
      logoUrl: meta.logoUrl ?? doc.brand.logoUrl ?? null,
      // Imagery slots are template-declared; undeclared slots compile away.
      heroImageUrl: heroSupported
        ? (meta.heroImageUrl ?? doc.assets.heroImageUrl ?? null)
        : null,
    },
    security: {
      embedAllowed: doc.settings.embedAllowed,
      allowedOrigins: doc.settings.allowedOrigins,
    },
    serverSettings: {
      minCompletionMs: doc.settings.minCompletionMs,
      honeypot: doc.settings.honeypot,
      blockedWords: doc.settings.blockedWords,
    },

    checksum: "",
    publishedAt: meta.publishedAt ?? new Date().toISOString(),
  };

  // Checksum covers everything except the checksum field + the wall-clock
  // publishedAt, so re-publishing identical content yields a stable fingerprint.
  const { checksum: _checksum, publishedAt: _publishedAt, ...fingerprint } =
    snapshot;
  void _checksum;
  void _publishedAt;
  snapshot.checksum = computeChecksum(fingerprint);

  return snapshot;
}

/** Strip server-only settings before a snapshot leaves the API (spec §26). */
export function toPublicSnapshot(snapshot: CompiledSnapshot): PublicSnapshot {
  const { serverSettings: _serverSettings, ...rest } = snapshot;
  void _serverSettings;
  return rest;
}
