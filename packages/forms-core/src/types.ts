export type FormQuestionType = "text" | "textarea" | "email" | "rating";

export interface FormQuestion {
  id: string;
  type: FormQuestionType;
  label: string;
  placeholder?: string;
  required: boolean;
}

export interface FormDesignTokens {
  accent: string;
  /** Foreground for text/icons sitting on top of `accent` (e.g. the submit button label). */
  accentText: string;
  background: string;
  text: string;
  mutedText: string;
  surface: string;
  border: string;
  radius: number;
  fontFamily: string;
}

export interface FormConfig {
  brandName: string;
  headline: string;
  subhead: string;
  questions: FormQuestion[];
  tokens: FormDesignTokens;
}

export interface FormViewModelQuestion {
  id: string;
  type: FormQuestionType;
  label: string;
  placeholder: string;
  required: boolean;
  inputName: string;
}

export interface FormViewModel {
  brandName: string;
  headline: string;
  subhead: string;
  questions: FormViewModelQuestion[];
  cssVars: Record<string, string>;
}
