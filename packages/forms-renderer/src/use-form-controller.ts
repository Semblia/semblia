import { useCallback, useMemo, useRef, useState } from "react";
import {
  isFieldVisible,
  validateAnswers,
  type FormField,
  type FormResponseConsent,
  type PublicSnapshot,
} from "@workspace/forms-core";
import type { AnswerMap, FormSubmitPayload, SubmitState } from "./types.js";

function defaultAnswers(snapshot: PublicSnapshot, seed?: AnswerMap): AnswerMap {
  const out: AnswerMap = { ...seed };
  for (const f of snapshot.fields) {
    if (out[f.id] !== undefined) continue;
    if (f.defaultValue !== undefined) out[f.id] = f.defaultValue;
    else if (f.type === "multiSelect") out[f.id] = [];
    else if (f.type === "hidden" && f.hiddenValue) out[f.id] = f.hiddenValue;
  }
  return out;
}

function deriveConsent(
  snapshot: PublicSnapshot,
  answers: AnswerMap,
): FormResponseConsent {
  const consentField = snapshot.fields.find((f) => f.type === "consent");
  const agreed = consentField
    ? answers[consentField.id] === true || answers[consentField.id] === "true"
    : false;
  const hasRole = (role: FormField["role"]) =>
    snapshot.fields.some((f) => f.role === role && f.publishable);
  return {
    canPublishText: agreed,
    canPublishName: agreed && hasRole("authorName"),
    canPublishCompany: agreed && hasRole("authorCompany"),
    canPublishRole: agreed && hasRole("authorRole"),
    canPublishAvatar: agreed && hasRole("authorAvatar"),
    canEditForClarity: false,
  };
}

export interface FormController {
  answers: AnswerMap;
  setAnswer: (fieldId: string, value: unknown) => void;
  errors: Record<string, string>;
  /** Currently-visible, non-hidden fields after applying conditional rules. */
  visibleFields: FormField[];
  isStepped: boolean;
  step: number;
  totalSteps: number;
  currentField: FormField | undefined;
  isLastStep: boolean;
  /** 0–1 completion fraction for the progress indicator. */
  progress: number;
  submitState: SubmitState;
  errorMessage: string | null;
  next: () => void;
  /** Advance without validating — for rating auto-advance where the value is valid by construction. */
  advance: () => void;
  back: () => void;
  submit: () => void;
  honeypot: string;
  setHoneypot: (v: string) => void;
}

export interface UseFormControllerOptions {
  snapshot: PublicSnapshot;
  initialAnswers?: AnswerMap;
  onSubmit?: (payload: FormSubmitPayload) => void | Promise<void>;
  mode?: "live" | "preview";
}

export function useFormController(
  options: UseFormControllerOptions,
): FormController {
  const { snapshot, initialAnswers, onSubmit, mode = "live" } = options;
  const [answers, setAnswers] = useState<AnswerMap>(() =>
    defaultAnswers(snapshot, initialAnswers),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef<number>(Date.now());

  const rules = snapshot.flow.conditionalRules;
  const visibleFields = useMemo(
    () =>
      snapshot.fields.filter(
        (f) => f.type !== "hidden" && isFieldVisible(f.id, rules, answers),
      ),
    [snapshot.fields, rules, answers],
  );

  const isStepped =
    snapshot.flow.mode === "step" || snapshot.layoutPreset === "oneQuestion";
  const totalSteps = isStepped ? Math.max(visibleFields.length, 1) : 1;
  const clampedStep = Math.min(step, totalSteps - 1);
  const currentField = isStepped ? visibleFields[clampedStep] : undefined;
  const isLastStep = !isStepped || clampedStep >= totalSteps - 1;
  const progress = isStepped ? (clampedStep + 1) / totalSteps : 0;

  const setAnswer = useCallback((fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const next = useCallback(() => {
    const field = visibleFields[clampedStep];
    if (field) {
      const result = validateAnswers(
        { fields: [field], flow: snapshot.flow },
        answers,
      );
      if (!result.ok) {
        setErrors((prev) => ({
          ...prev,
          ...Object.fromEntries(result.errors.map((e) => [e.fieldId, e.message])),
        }));
        return;
      }
    }
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }, [visibleFields, clampedStep, snapshot.flow, answers, totalSteps]);

  const advance = useCallback(
    () => setStep((s) => Math.min(s + 1, totalSteps - 1)),
    [totalSteps],
  );

  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const submit = useCallback(() => {
    const result = validateAnswers(
      { fields: visibleFields, flow: snapshot.flow },
      answers,
    );
    if (!result.ok) {
      setErrors(
        Object.fromEntries(result.errors.map((e) => [e.fieldId, e.message])),
      );
      // Jump the stepped flow to the first field that failed.
      if (isStepped && result.errors[0]) {
        const idx = visibleFields.findIndex(
          (f) => f.id === result.errors[0]!.fieldId,
        );
        if (idx >= 0) setStep(idx);
      }
      return;
    }
    setErrors({});

    const payload: FormSubmitPayload = {
      answers,
      consent: deriveConsent(snapshot, answers),
      elapsedMs: Date.now() - startedAt.current,
      honeypot: mode === "preview" ? "" : honeypot,
    };

    if (!onSubmit) {
      setSubmitState("success");
      return;
    }
    setSubmitState("submitting");
    setErrorMessage(null);
    Promise.resolve(onSubmit(payload))
      .then(() => setSubmitState("success"))
      .catch((err: unknown) => {
        setSubmitState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        );
      });
  }, [visibleFields, snapshot, answers, isStepped, honeypot, mode, onSubmit]);

  return {
    answers,
    setAnswer,
    errors,
    visibleFields,
    isStepped,
    step: clampedStep,
    totalSteps,
    currentField,
    isLastStep,
    progress,
    submitState,
    errorMessage,
    next,
    advance,
    back,
    submit,
    honeypot,
    setHoneypot,
  };
}
