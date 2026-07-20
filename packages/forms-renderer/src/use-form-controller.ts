import { useCallback, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  AUTO_PACING_THRESHOLD,
  isFieldVisible,
  validateAnswers,
  type FormField,
  type FormResponseConsent,
  type PublicSnapshot,
} from "@workspace/forms-core";
import type { AnswerMap, FormSubmitPayload, SubmitState } from "./types.js";

type FieldErrors = Record<string, string>;
type FormFlow = PublicSnapshot["flow"];
type FormPacing = PublicSnapshot["template"]["pacing"];
type FormMode = "live" | "preview" | "showcase";

export function defaultAnswers(
  snapshot: PublicSnapshot,
  seed?: AnswerMap,
): AnswerMap {
  const out: AnswerMap = { ...seed };
  for (const f of snapshot.fields) {
    if (out[f.id] !== undefined) continue;
    if (f.defaultValue !== undefined) out[f.id] = f.defaultValue;
    else if (f.type === "multiSelect") out[f.id] = [];
    else if (f.type === "hidden" && f.hiddenValue) out[f.id] = f.hiddenValue;
  }
  return out;
}

function consentAgreed(snapshot: PublicSnapshot, answers: AnswerMap): boolean {
  const consentField = snapshot.fields.find((f) => f.type === "consent");
  if (!consentField) return false;
  const value = answers[consentField.id];
  return value === true || value === "true";
}

export function deriveConsent(
  snapshot: PublicSnapshot,
  answers: AnswerMap,
): FormResponseConsent {
  const agreed = consentAgreed(snapshot, answers);
  const can = (role: FormField["role"]) =>
    agreed && snapshot.fields.some((f) => f.role === role && f.publishable);
  return {
    canPublishText: agreed,
    canPublishName: can("authorName"),
    canPublishCompany: can("authorCompany"),
    canPublishRole: can("authorRole"),
    canPublishAvatar: can("authorAvatar"),
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

function isRecordAsk(field: FormField): boolean {
  return field.type === "videoUpload" || field.type === "audioUpload";
}

function takeIdentityCluster(fields: FormField[], start: number): FormField[] {
  const cluster: FormField[] = [];
  for (let i = start; i < fields.length; i += 1) {
    if (!IDENTITY_TYPES.has(fields[i]!.type)) break;
    cluster.push(fields[i]!);
  }
  return cluster;
}

function takeStep(fields: FormField[], i: number): FormStep {
  const field = fields[i]!;
  const next = fields[i + 1];
  if (isRecordAsk(field) && next?.role === "primaryText") {
    return { fields: [field, next], kind: "recordOrWrite" };
  }
  if (IDENTITY_TYPES.has(field.type)) {
    return { fields: takeIdentityCluster(fields, i), kind: "identity" };
  }
  return { fields: [field], kind: "ask" };
}

export function groupIntoSteps(fields: FormField[]): FormStep[] {
  const steps: FormStep[] = [];
  let i = 0;
  while (i < fields.length) {
    const field = fields[i]!;
    // Consent rides with the previous step rather than being its own screen.
    if (field.type === "consent" && steps.length > 0) {
      steps[steps.length - 1]!.fields.push(field);
      i += 1;
      continue;
    }
    const step = takeStep(fields, i);
    steps.push(step);
    i += step.fields.length;
  }
  return steps;
}

export interface StepGeometry {
  isStepped: boolean;
  /** Current step index, clamped to the last step. */
  step: number;
  totalSteps: number;
  currentStep: FormStep | undefined;
  isLastStep: boolean;
  /** 0–1 completion fraction for the progress indicator. */
  progress: number;
}

/**
 * Pacing is a template decision (principle P6): staged templates page through
 * moments; auto templates go staged only past the threshold.
 */
export function deriveStepGeometry(
  steps: FormStep[],
  pacing: FormPacing,
  rawStep: number,
): StepGeometry {
  const isStepped =
    pacing === "staged" ||
    (pacing === "auto" && steps.length > AUTO_PACING_THRESHOLD);
  const totalSteps = isStepped ? Math.max(steps.length, 1) : 1;
  const step = Math.min(rawStep, totalSteps - 1);
  return {
    isStepped,
    step,
    totalSteps,
    currentStep: isStepped ? steps[step] : undefined,
    isLastStep: !isStepped || step >= totalSteps - 1,
    progress: isStepped ? (step + 1) / totalSteps : 0,
  };
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
  /**
   * Register the actual File objects behind an upload/capture answer. The
   * answer value stays a display string; the HOST uploads the bytes at submit
   * (presign + PUT) and rewrites the answer to the resulting asset id(s).
   */
  setFieldFiles: (fieldId: string, files: File[]) => void;
}

export interface UseFormControllerOptions {
  snapshot: PublicSnapshot;
  initialAnswers?: AnswerMap;
  onSubmit?: (payload: FormSubmitPayload) => void | Promise<void>;
  mode?: FormMode;
}

function isBlank(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function fieldErrors(
  flow: FormFlow,
  fields: FormField[],
  answers: AnswerMap,
): FieldErrors {
  const result = validateAnswers({ fields, flow }, answers);
  if (result.ok) return {};
  return Object.fromEntries(result.errors.map((e) => [e.fieldId, e.message]));
}

/** The record-or-write pair is schema-optional; require one of the two here. */
export function recordOrWriteErrors(
  steps: FormStep[],
  answers: AnswerMap,
): FieldErrors {
  for (const s of steps) {
    if (s.kind !== "recordOrWrite") continue;
    const [media, text] = s.fields;
    if (!media || !text) continue;
    if (isBlank(answers[media.id]) && isBlank(answers[text.id])) {
      return {
        [text.id]: "Record a quick video or write a few words — either works.",
      };
    }
  }
  return {};
}

function collectErrors(
  flow: FormFlow,
  fields: FormField[],
  steps: FormStep[],
  answers: AnswerMap,
): FieldErrors {
  return {
    ...fieldErrors(flow, fields, answers),
    ...recordOrWriteErrors(steps, answers),
  };
}

export function firstFailingStep(
  steps: FormStep[],
  errors: FieldErrors,
): number {
  const firstBad = Object.keys(errors)[0];
  if (!firstBad) return -1;
  return steps.findIndex((s) => s.fields.some((f) => f.id === firstBad));
}

function clearFieldError(errors: FieldErrors, fieldId: string): FieldErrors {
  if (!errors[fieldId]) return errors;
  const next = { ...errors };
  delete next[fieldId];
  return next;
}

function submitFailureMessage(err: unknown): string {
  return err instanceof Error
    ? err.message
    : "Something went wrong. Please try again.";
}

function buildSubmitPayload(input: {
  snapshot: PublicSnapshot;
  answers: AnswerMap;
  startedAt: number;
  honeypot: string;
  mode: FormMode;
  files: Record<string, File[]>;
}): FormSubmitPayload {
  return {
    answers: input.answers,
    consent: deriveConsent(input.snapshot, input.answers),
    elapsedMs: Date.now() - input.startedAt,
    honeypot: input.mode === "preview" ? "" : input.honeypot,
    files: { ...input.files },
  };
}

function useAnswerState(snapshot: PublicSnapshot, initialAnswers?: AnswerMap) {
  const [answers, setAnswers] = useState<AnswerMap>(() =>
    defaultAnswers(snapshot, initialAnswers),
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const setAnswer = useCallback((fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => clearFieldError(prev, fieldId));
  }, []);

  return { answers, errors, setErrors, setAnswer };
}

function useFieldFiles() {
  const filesRef = useRef<Record<string, File[]>>({});
  const setFieldFiles = useCallback((fieldId: string, files: File[]) => {
    if (files.length === 0) delete filesRef.current[fieldId];
    else filesRef.current[fieldId] = files;
  }, []);
  return { filesRef, setFieldFiles };
}

function useStepNavigation(opts: {
  steps: FormStep[];
  pacing: FormPacing;
  flow: FormFlow;
  answers: AnswerMap;
  showcase: boolean;
  setErrors: Dispatch<SetStateAction<FieldErrors>>;
}) {
  const { steps, pacing, flow, answers, showcase, setErrors } = opts;
  const [rawStep, setStep] = useState(0);
  const geometry = deriveStepGeometry(steps, pacing, rawStep);
  const { step, totalSteps } = geometry;

  const advance = useCallback(
    () => setStep((s) => Math.min(s + 1, totalSteps - 1)),
    [totalSteps],
  );

  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const next = useCallback(() => {
    const current = steps[step];
    const stepErrors =
      current && !showcase
        ? collectErrors(flow, current.fields, [current], answers)
        : {};
    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      return;
    }
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }, [steps, step, showcase, flow, answers, totalSteps, setErrors]);

  return { geometry, next, advance, back, setStep };
}

function useSubmitDispatch(
  onSubmit?: (payload: FormSubmitPayload) => void | Promise<void>,
) {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const succeed = useCallback(() => setSubmitState("success"), []);

  const dispatch = useCallback(
    (payload: FormSubmitPayload) => {
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
          setErrorMessage(submitFailureMessage(err));
        });
    },
    [onSubmit],
  );

  return { submitState, errorMessage, succeed, dispatch };
}

function useSubmitAction(opts: {
  snapshot: PublicSnapshot;
  visibleFields: FormField[];
  steps: FormStep[];
  answers: AnswerMap;
  isStepped: boolean;
  mode: FormMode;
  showcase: boolean;
  honeypot: string;
  onSubmit?: (payload: FormSubmitPayload) => void | Promise<void>;
  filesRef: { current: Record<string, File[]> };
  startedAt: { current: number };
  setErrors: Dispatch<SetStateAction<FieldErrors>>;
  setStep: Dispatch<SetStateAction<number>>;
}) {
  const {
    snapshot,
    visibleFields,
    steps,
    answers,
    isStepped,
    mode,
    showcase,
    honeypot,
    onSubmit,
    filesRef,
    startedAt,
    setErrors,
    setStep,
  } = opts;
  const { submitState, errorMessage, succeed, dispatch } =
    useSubmitDispatch(onSubmit);

  const submit = useCallback(() => {
    if (showcase) {
      // Display-only: show the template's success moment, dispatch nothing.
      setErrors({});
      succeed();
      return;
    }
    const all = collectErrors(snapshot.flow, visibleFields, steps, answers);
    if (Object.keys(all).length > 0) {
      setErrors(all);
      // Jump the stepped flow to the first step that failed.
      const idx = firstFailingStep(steps, all);
      if (isStepped && idx >= 0) setStep(idx);
      return;
    }
    setErrors({});
    dispatch(
      buildSubmitPayload({
        snapshot,
        answers,
        startedAt: startedAt.current,
        honeypot,
        mode,
        files: filesRef.current,
      }),
    );
  }, [
    showcase,
    snapshot,
    visibleFields,
    steps,
    answers,
    isStepped,
    honeypot,
    mode,
    succeed,
    dispatch,
    setErrors,
    setStep,
    filesRef,
    startedAt,
  ]);

  return { submit, submitState, errorMessage };
}

export function useFormController(
  options: UseFormControllerOptions,
): FormController {
  const { snapshot, initialAnswers, onSubmit, mode = "live" } = options;
  const { answers, errors, setErrors, setAnswer } = useAnswerState(
    snapshot,
    initialAnswers,
  );
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef<number>(Date.now());
  const { filesRef, setFieldFiles } = useFieldFiles();

  const rules = snapshot.flow.conditionalRules;
  const visibleFields = useMemo(
    () =>
      snapshot.fields.filter(
        (f) => f.type !== "hidden" && isFieldVisible(f.id, rules, answers),
      ),
    [snapshot.fields, rules, answers],
  );

  const steps = useMemo(() => groupIntoSteps(visibleFields), [visibleFields]);

  // Showcase is display-only: browsing steps must never be blocked by
  // validation — the viewer is looking at the form, not answering it.
  const showcase = mode === "showcase";

  const { geometry, next, advance, back, setStep } = useStepNavigation({
    steps,
    pacing: snapshot.template.pacing,
    flow: snapshot.flow,
    answers,
    showcase,
    setErrors,
  });

  const { submit, submitState, errorMessage } = useSubmitAction({
    snapshot,
    visibleFields,
    steps,
    answers,
    isStepped: geometry.isStepped,
    mode,
    showcase,
    honeypot,
    onSubmit,
    filesRef,
    startedAt,
    setErrors,
    setStep,
  });

  return {
    answers,
    setAnswer,
    errors,
    visibleFields,
    steps,
    ...geometry,
    submitState,
    errorMessage,
    next,
    advance,
    back,
    submit,
    honeypot,
    setHoneypot,
    setFieldFiles,
  };
}
