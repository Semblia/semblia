/**
 * Form Studio draft helpers — the bridge between the API's opaque draft JSON and
 * the typed forms-core document, plus the preview-snapshot compile path.
 *
 * Compiling here uses the exact same forms-core compiler the publish path and
 * every renderer use, so the studio preview is byte-for-byte what respondents
 * will see (spec §27).
 */

import {
  migrateFormDoc,
  createFormTemplate,
  compileSnapshot,
  toPublicSnapshot,
  type FormDefinitionDoc,
  type PublicSnapshot,
} from "@workspace/forms-core";
import type { V2FormIntent } from "@workspace/types";

/**
 * Parse a stored draft into a typed doc. Never throws — a malformed/empty draft
 * falls back to a fresh template for the form's intent so the studio always
 * opens on something editable rather than a blank crash.
 */
export function parseDraftDoc(
  raw: Record<string, unknown> | undefined | null,
  intent: V2FormIntent,
): FormDefinitionDoc {
  try {
    if (raw && Object.keys(raw).length > 0) return migrateFormDoc(raw);
  } catch {
    // fall through to template
  }
  return createFormTemplate(intent);
}

export interface PreviewMeta {
  formId: string;
  projectId: string;
  slug: string | null;
}

/**
 * Compile a live, public-safe preview snapshot from the working draft. Marked
 * `published` so the renderer shows the interactive form (not the closed state),
 * with placeholder identity fields — preview snapshots are never persisted.
 */
export function compilePreviewSnapshot(
  doc: FormDefinitionDoc,
  meta: PreviewMeta,
): PublicSnapshot {
  const compiled = compileSnapshot(doc, {
    snapshotId: "preview",
    formId: meta.formId,
    projectId: meta.projectId,
    slug: meta.slug,
    version: 0,
    status: "published",
  });
  return toPublicSnapshot(compiled);
}
