/**
 * @workspace/forms-core — the shared contracts + compilers for Semblia Forms.
 *
 * Framework-agnostic (pure TS + zod + @workspace/brand-theme). Shared by the
 * API, the web studio (live preview), forms_runtime, and the static-preview
 * worker so the schema, validation, design tokens, and snapshots can never
 * disagree across surfaces (spec §18.4, §27).
 */
export * from "./version.js";
export * from "./schema/index.js";
export * from "./templates.js";
export * from "./design.js";
export * from "./conditions.js";
export * from "./delivery.js";
export * from "./validate.js";
export * from "./normalize.js";
export * from "./snapshot.js";
export * from "./migrate.js";
export * from "./intents.js";
