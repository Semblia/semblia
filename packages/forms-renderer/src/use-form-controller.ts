import { useCallback, useMemo, useRef, useState } from "react";
import {
  AUTO_PACING_THRESHOLD,
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

/** Identity facts cluster into one step so staged flows never ask 4 screens of "who are you". */
const IDENTITY_TYPES = new Set<FormField["type"]>([
  "name",
  "email",
  "role",
  "company",
  "website",
]);

/**
 * A step is one respondent "moment": a single ask, an identity cluster, or the
 * record-or-write pair (videoUpload followed by the primaryText escape).
 */
export interface FormStep {
  fields: FormField[];
  kind: "ask" | "identity" | "recordOrWrite";
}

export function groupIntoSteps(fields: FormField[]): FormStep[] {
  const steps: FormStep[] = [];
  let i = 0;
  while (i < fields.length) {
    const f = fields[i]!;
    const next = fields[i + 1];
    if (
      (f.type === "videoUpload" || f.type === "audioUpload") &&
      next?.role === "primaryText"
    ) {
      steps.push({ fields: [f, next], kind: "recordOrWrite" });
      i += 2;
      continue;
    }
    if (IDENTITY_TYPES.has(f.type)) {
      const cluster: FormField[] = [f];
      while (i + cluster.length < fields.length) {
        const peek = fields[i + cluster.length]!;
        if (!IDENTITY_TYPES.has(peek.type)) break;
        cluster.push(peek);
      }
      steps.push({ fields: cluster, kind: "identity" });
      i += cluster.length;
      continue;
    }
    // Consent rides with the previous step rather than being its own screen.
    if (f.type === "consent" && steps.length > 0) {
      steps[steps.length - 1]!.fields.push(f);
      i += 1;
      continue;
    }
    steps.push({ fields: [f], kind: "ask" });
    i += 1;
  }
  return steps;
}

export interface FormController {
  answers: AnswerMap;
  setAnswer: (fieldId: string, value: unknown) => void;
  errors: Record<string, string>;
  /** Currently-visible, non-hidden fields after applying conditional rules. */
  visibleFields: FormField[];
  /** Visible fields grouped into respondent moments (staged pacing). */
  steps: FormStep[];
  isStepped: boolean;
  step: number;
  totalSteps: number;
  currentStep: FormStep | undefined;
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

function isBlank(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
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

  const steps = useMemo(() => groupIntoSteps(visibleFields), [visibleFields]);

  // Pacing is a template decision (principle P6): staged templates page
  // through moments; auto templates go staged only past the threshold.
  const pacing = snapshot.template.pacing;
  const isStepped =
    pacing === "staged" ||
    (pacing === "auto" && steps.length > AUTO_PACING_THRESHOLD);
  const totalSteps = isStepped ? Math.max(steps.length, 1) : 1;
  const clampedStep = Math.min(step, totalSteps - 1);
  const currentStep = isStepped ? steps[clampedStep] : undefined;
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

  /** The record-or-write pair is schema-optional; require one of the two here. */
  const recordOrWriteError = useCallback(
    (candidate: FormStep[]): Record<string, string> | null => {
      for (const s of candidate) {
        if (s.kind !== "recordOrWrite") continue;
        const [media, text] = s.fields;
        if (media && text && isBlank(answers[media.id]) && isBlank(answers[text.id])) {
          return {
            [text.id]: "Record a quick video or write a few words — either works.",
          };
        }
      }
      return null;
    },
    [answers],
  );

  const validateStepFields = useCallback(
    (fields: FormField[]): Record<string, string> | null => {
      const result = validateAnswers({ fields, flow: snapshot.flow }, answers);
      if (result.ok) return null;
      return Object.fromEntries(result.errors.map((e) => [e.fieldId, e.message]));
    },
    [snapshot.flow, answers],
  );

  const next = useCallback(() => {
    const current = steps[clampedStep];
    if (current) {
      const stepErrors = {
        ...validateStepFields(current.fields),
        ...recordOrWriteError([current]),
      };
      if (Object.keys(stepErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...stepErrors }));
        return;
      }
    }
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }, [steps, clampedStep, validateStepFields, recordOrWriteError, totalSteps]);

  const advance = useCallback(
    () => setStep((s) => Math.min(s + 1, totalSteps - 1)),
    [totalSteps],
  );

  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const submit = useCallback(() => {
    const all = {
      ...validateStepFields(visibleFields),
      ...recordOrWriteError(steps),
    };
    if (Object.keys(all).length > 0) {
      setErrors(all);
      // Jump the stepped flow to the first step that failed.
      const firstBad = Object.keys(all)[0];
      if (isStepped && firstBad) {
        const idx = steps.findIndex((s) =>
          s.fields.some((f) => f.id === firstBad),
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
  }, [
    visibleFields,
    steps,
    snapshot,
    answers,
    isStepped,
    honeypot,
    mode,
    onSubmit,
    validateStepFields,
    recordOrWriteError,
  ]);

  return {
    answers,
    setAnswer,
    errors,
    visibleFields,
    steps,
    isStepped,
    step: clampedStep,
    totalSteps,
    currentStep,
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
