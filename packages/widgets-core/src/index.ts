/**
 * widgets-core — the single owner of the Semblia widget v-next contract.
 *
 * Three separated concerns:
 *   content    — which proof appears and which fields show
 *   layout     — one hand-designed display preset
 *   appearance — constrained knobs through @workspace/brand-theme
 */

export * from "./schema/index.js";
export * from "./theme.js";
export * from "./telemetry.js";
export * from "./render/index.js";
