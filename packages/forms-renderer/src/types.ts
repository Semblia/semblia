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
  /**
   * The actual File objects behind upload/capture answers, keyed by field id.
   * The host uploads these (presign + PUT) and rewrites each answer to the
   * resulting media asset id(s) before posting the submission.
   */
  files: Record<string, File[]>;
}

export type SubmitState = "idle" | "submitting" | "success" | "error";

export type RenderScheme = "light" | "dark";

/**
 * The delivery surface the renderer is mounted on. Hosted pages own the whole
 * viewport and compose accordingly (split panes, stages, backdrops); embeds
 * live inside someone else's page and must earn their boundary. Every template
 * pack designs both.
 */
export type RenderSurface = "hosted" | "embed";

export interface FormRendererProps {
  /** The immutable, public-safe snapshot produced by forms-core's compiler. */
  snapshot: PublicSnapshot;
  /**
   * Called when the user submits a structurally-valid form. Return a promise to
   * drive the submitting → success/error states. Omit in studio preview.
   */
  onSubmit?: (payload: FormSubmitPayload) => void | Promise<void>;
  /**
   * `preview` disables the honeypot/min-time gating used on live public forms.
   * `showcase` is display-only (studio canvas + preview route): fields are
   * inert, step navigation is free (no validation), submit shows the success
   * moment — the viewer sees how the form looks, they never fill it in.
   */
  mode?: "live" | "preview" | "showcase";
  /** Force a color scheme when the snapshot resolved both (preview toggle). */
  forcedScheme?: RenderScheme;
  /** Delivery surface; defaults to `hosted`. */
  surface?: RenderSurface;
  /** Seed initial answers (preview seeding or resubmission). */
  initialAnswers?: AnswerMap;
  /** Render the closed-form state regardless of snapshot status (preview). */
  forceClosed?: boolean;
  /** Extra class on the root element. */
  className?: string;
}
