/**
 * The forms v4 persisted contract: versioned Zod schemas, the publish
 * artifact, and the migrations registry. DOM-free and isomorphic — safe to
 * import from the API, the runtime, the studio, and the embed build.
 */

export {
  FORM_SCHEMA_VERSION,
  LAYOUT_PRESETS,
  colorOverridesSchema,
  derivedFormThemeSchema,
  formContentSchema,
  formDefinitionDocSchema,
  formThemeInputsSchema,
  layoutOptionsSchema,
  layoutSelectionSchema,
  publishedFormDocSchema,
  resolvedThemeSnapshotSchema,
  successContentSchema,
  themeDocSchema,
} from "./definition.js";
export type {
  ColorOverrides,
  FormContent,
  FormDefinitionDoc,
  LayoutOptions,
  LayoutPresetId,
  LayoutSelection,
  PublishedFormDoc,
  SuccessContent,
  ThemeDoc,
} from "./definition.js";
export {
  applyColorOverrides,
  applyColorOverridesToScheme,
} from "./theme-overrides.js";
export {
  QUESTION_TYPES,
  formStructureSchema,
  questionSchema,
  showIfOpSchema,
  showIfRuleSchema,
} from "./structure.js";
export type {
  FormQuestion,
  FormStructure,
  QuestionType,
  ShowIfOp,
  ShowIfRule,
} from "./structure.js";
export { migrateFormDoc, projectV1ToV2 } from "./migrate.js";
export { defaultFormDefinition, publishFormDefinition } from "./publish.js";
