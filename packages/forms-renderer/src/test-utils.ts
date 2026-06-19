import {
  compileSnapshot,
  createFormTemplate,
  toPublicSnapshot,
  type FormDefinitionDoc,
  type FormIntent,
  type PublicSnapshot,
  type SnapshotMeta,
} from "@workspace/forms-core";

const META: SnapshotMeta = {
  snapshotId: "v1",
  formId: "f1",
  projectId: "p1",
  slug: "demo",
  version: 1,
  publishedAt: "2026-06-20T00:00:00.000Z",
};

/** Build a real public snapshot from an intent template for renderer tests. */
export function makeSnapshot(
  intent: FormIntent = "TESTIMONIAL",
  mutate?: (doc: FormDefinitionDoc) => FormDefinitionDoc,
): PublicSnapshot {
  const base = createFormTemplate(intent);
  const doc = mutate ? mutate(base) : base;
  return toPublicSnapshot(compileSnapshot(doc, META));
}
