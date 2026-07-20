/**
 * widgets-core — the single owner of the Semblia widget v-next contract.
 *
 * Three separated concerns (template system rebuild 2026-07-13):
 *   content   — which proof appears and which fields show
 *   template  — one self-contained display design (composition + personality
 *               + theme recipe), chosen from the roster in templates.ts
 *   brand     — brand facts (color, appearance) the template derives from,
 *               AA-clamped through @workspace/brand-theme
 */

export * from "./schema/index.js";
export * from "./templates.js";
export * from "./theme.js";
export * from "./telemetry.js";
export * from "./render/index.js";
