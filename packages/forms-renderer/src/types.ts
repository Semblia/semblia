import type {
  FormResponseConsent,
  PublicSnapshot,
} from "@workspace/forms-core";

/** Raw `{ fieldId: value }` map the renderer collects as the user fills the form. */
export type AnswerMap = Record<string, unknown>;

/** What the renderer hands back on a valid submit; the host owns the network call. */
export interface FormSubmitPayload {
  answers: AnswerMap;
  consent: FormResponseConsent;
  /** Milliseconds the respondent spent on the form — feeds the min-time anti-bot check. */
  elapsedMs: number;
  /** Honeypot field value; a non-empty string means a bot filled a hidden trap. */
  honeypot: string;
}

export type SubmitState = "idle" | "submitting" | "success" | "error";

export type RenderScheme = "light" | "dark";

export interface FormRendererProps {
  /** The immutable, public-safe snapshot produced by forms-core's compiler. */
  snapshot: PublicSnapshot;
  /**
   * Called when the user submits a structurally-valid form. Return a promise to
   * drive the submitting → success/error states. Omit in studio preview.
   */
  onSubmit?: (payload: FormSubmitPayload) => void | Promise<void>;
  /** `preview` disables the honeypot/min-time gating used on live public forms. */
  mode?: "live" | "preview";
  /** Force a color scheme when the snapshot resolved both (preview toggle). */
  forcedScheme?: RenderScheme;
  /** Seed initial answers (preview seeding or resubmission). */
  initialAnswers?: AnswerMap;
  /** Render the closed-form state regardless of snapshot status (preview). */
  forceClosed?: boolean;
  /** Extra class on the root element. */
  className?: string;
}
