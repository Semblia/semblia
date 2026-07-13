/**
 * @workspace/forms-renderer — the single React renderer for a forms-core
 * PublicSnapshot. The same renderer powers the dashboard live preview, hosted
 * pages (SSR via ./server), iframe embeds, native injection (./client), and
 * static preview generation, so every surface renders identical output from the
 * same snapshot (spec §18.5, §27).
 *
 * This entry is isomorphic (no react-dom). Use `./server` for SSR and `./client`
 * for browser mounting/hydration.
 */
export { FormRenderer, FormLoader } from "./renderer.js";
export { FieldControl, type FieldControlProps } from "./fields.js";
export { buildFormStylesheet, rootDataAttributes } from "./css.js";
export type { StylesheetOptions } from "./css.js";
export {
  resolveTemplatePack,
  TEMPLATE_PACK_IDS,
  type TemplatePack,
  type TemplateCompositionProps,
  type TemplateLoaderProps,
} from "./templates/registry.js";
export {
  useFormController,
  groupIntoSteps,
  type FormController,
  type FormStep,
  type UseFormControllerOptions,
} from "./use-form-controller.js";
export type {
  AnswerMap,
  FormRendererProps,
  FormSubmitPayload,
  RenderScheme,
  SubmitState,
} from "./types.js";
