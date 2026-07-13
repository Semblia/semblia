/**
 * Version constants stamped into every published snapshot. They let the runtime
 * and renderers detect when a stored snapshot predates a breaking change.
 *
 * - SCHEMA_VERSION  — the FormDefinitionDoc / stored config shape.
 * - SNAPSHOT_VERSION — the compiled public snapshot shape.
 * - RENDERER_VERSION — the forms-renderer component contract.
 * - CORE_VERSION     — this package's compiler behavior.
 */
export const SCHEMA_VERSION = "6.0.0" as const;
export const SNAPSHOT_VERSION = "6.0.0" as const;
export const RENDERER_VERSION = "6.0.0" as const;
export const CORE_VERSION = "6.0.0" as const;
