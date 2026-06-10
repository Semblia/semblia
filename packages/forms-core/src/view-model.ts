import { resolveWebFonts } from "./fonts.js";
import { tokensToCssVars } from "./tokens-css.js";
import type { FormConfig, FormViewModel } from "./types.js";

export function createFormViewModel(config: FormConfig): FormViewModel {
  return {
    brandName: config.brandName,
    headline: config.headline,
    subhead: config.subhead,
    submitLabel: config.submitLabel,
    logoUrl: config.logoUrl ?? null,
    questions: config.questions.map((question) => ({
      id: question.id,
      type: question.type,
      label: question.label,
      placeholder: question.placeholder ?? "",
      description: question.description ?? "",
      required: question.required,
      options: question.options ?? [],
      showIf: question.showIf ?? null,
      inputName: `answers[${question.id}]`,
    })),
    layout: config.layout,
    loader: config.loader,
    success: config.success,
    cssVars: tokensToCssVars(config.tokens),
    colorScheme: config.tokens.dark ? "dark" : "light",
    fieldShape: config.tokens.fieldShape,
    webFonts: resolveWebFonts(config.tokens),
  };
}
