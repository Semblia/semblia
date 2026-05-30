import { tokensToCssVars } from "./css-vars.js";
import type { FormConfig, FormViewModel } from "./types.js";

export function createFormViewModel(config: FormConfig): FormViewModel {
  return {
    brandName: config.brandName,
    headline: config.headline,
    subhead: config.subhead,
    questions: config.questions.map((question) => ({
      id: question.id,
      type: question.type,
      label: question.label,
      placeholder: question.placeholder ?? "",
      required: question.required,
      inputName: `answers[${question.id}]`,
    })),
    cssVars: tokensToCssVars(config.tokens),
  };
}
