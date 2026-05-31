import { tokensToCssVars } from "./tokens-css.js";
import type { FormConfig, FormViewModel } from "./types.js";

export function createFormViewModel(config: FormConfig): FormViewModel {
  return {
    brandName: config.brandName,
    headline: config.headline,
    subhead: config.subhead,
    logoUrl: config.logoUrl ?? null,
    questions: config.questions.map((question) => ({
      id: question.id,
      type: question.type,
      label: question.label,
      placeholder: question.placeholder ?? "",
      required: question.required,
      options: question.options ?? [],
      inputName: `answers[${question.id}]`,
    })),
    cssVars: tokensToCssVars(config.tokens),
    colorScheme: config.tokens.dark ? "dark" : "light",
  };
}
