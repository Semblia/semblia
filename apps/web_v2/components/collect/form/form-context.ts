import { createContext, useContext } from "react";
import type { StudioQuestion } from "@/lib/collect/studio-types";

export type FormStatus = "editing" | "submitting" | "success" | "error";

export interface FormContextValue {
  questions: StudioQuestion[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  status: FormStatus;
  step: number;
  totalSteps: number;
  /** Derived from tokens.fieldShape — true when fields should render as underline only. */
  isUnderline: boolean;
  setValue: (id: string, value: unknown) => void;
  clearError: (id: string) => void;
  /** Validates current step question, advances if valid. Returns true on success. */
  goNext: () => boolean;
  goBack: () => void;
  /** Validates all visible questions and fires mock submission. */
  submit: () => void;
}

export const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error("useFormContext must be inside <TestimonialForm>");
  return ctx;
}
