import type { ReactNode } from "react";
import type { FormField, PublicSnapshot } from "@workspace/forms-core";
import { Attribution, Honeypot } from "../components.js";
import { FieldControl } from "../fields.js";
import type { FormController, FormStep } from "../use-form-controller.js";

/**
 * Shared *bones* template packs may compose — deliberately unstyled beyond
 * class hooks. Everything here is commodity (a logo slot, a step's controls,
 * an honest time estimate); page structure, chrome, and moments stay
 * pack-owned.
 */

/** Logo image or an initial monogram derived from the brand name. */
export function LogoMark({
  snapshot,
  className,
}: {
  snapshot: PublicSnapshot;
  className?: string;
}) {
  const { logoUrl } = snapshot.assets;
  const name = snapshot.brand.name || snapshot.content.title;
  const cls = className ? `tf-logomark ${className}` : "tf-logomark";
  if (logoUrl) return <img className={cls} src={logoUrl} alt={name || ""} />;
  const initial = (name || "•").trim().charAt(0).toUpperCase();
  return (
    <span className={cls} data-monogram aria-hidden="true">
      {initial}
    </span>
  );
}

/**
 * The honest time contract (research: stating expected effort reduces
 * abandonment). Rough but truthful: ~8s per ask, +60s when video is invited.
 */
export function estimateSeconds(fields: FormField[]): number {
  let s = 0;
  for (const f of fields) {
    if (f.type === "videoUpload") s += 60;
    else if (f.type === "audioUpload") s += 30;
    else if (f.type === "longText") s += 25;
    else if (f.type === "consent" || f.type === "hidden") s += 3;
    else s += 8;
  }
  return s;
}

export function TimeContract({ fields }: { fields: FormField[] }) {
  const sec = estimateSeconds(fields);
  const label =
    sec <= 45
      ? "Takes under a minute"
      : sec <= 90
        ? "Takes about a minute"
        : `Takes about ${Math.round(sec / 60)} minutes`;
  return <p className="tf-time-contract">{label}</p>;
}

/** Render one step's fields via the commodity controls. */
export function StepFields({
  step,
  ctrl,
  autoFocus,
}: {
  step: FormStep;
  ctrl: FormController;
  autoFocus?: boolean;
}) {
  return (
    <>
      {step.fields.map((field, i) => (
        <FieldControl
          key={field.id}
          field={field}
          value={ctrl.answers[field.id]}
          error={ctrl.errors[field.id]}
          onChange={(v) => ctrl.setAnswer(field.id, v)}
          onCommit={
            field.type === "rating" && ctrl.isStepped && !ctrl.isLastStep
              ? ctrl.advance
              : undefined
          }
          autoFocus={autoFocus && i === 0}
        />
      ))}
    </>
  );
}

/** All fields at once (calm pacing). */
export function AllFields({ ctrl }: { ctrl: FormController }) {
  return (
    <>
      {ctrl.steps.map((step) => (
        <StepFields key={step.fields[0]!.id} step={step} ctrl={ctrl} />
      ))}
    </>
  );
}

/**
 * The staged flow engine: current-step fields + back/next/submit choreography.
 * Packs wrap it in their own chrome and style everything via their stylesheet;
 * `trail` (Ledger) renders completed steps above as static prose.
 */
export function StagedControls({
  snapshot,
  ctrl,
  nextLabel = "Continue",
  backLabel = "Back",
}: {
  snapshot: PublicSnapshot;
  ctrl: FormController;
  nextLabel?: string;
  backLabel?: string;
}) {
  const submitting = ctrl.submitState === "submitting";
  return (
    <div className="tf-actions">
      {ctrl.step > 0 ? (
        <button type="button" className="tf-btn tf-btn-ghost" onClick={ctrl.back}>
          {backLabel}
        </button>
      ) : null}
      {ctrl.isLastStep ? (
        <button type="submit" className="tf-btn tf-btn-primary" disabled={submitting}>
          {submitting ? "Sending…" : snapshot.content.submitButtonText}
        </button>
      ) : (
        <button type="submit" className="tf-btn tf-btn-primary">
          {nextLabel}
        </button>
      )}
    </div>
  );
}

export function SubmitControls({
  snapshot,
  ctrl,
}: {
  snapshot: PublicSnapshot;
  ctrl: FormController;
}) {
  const submitting = ctrl.submitState === "submitting";
  return (
    <div className="tf-actions">
      <button type="submit" className="tf-btn tf-btn-primary" disabled={submitting}>
        {submitting ? "Sending…" : snapshot.content.submitButtonText}
      </button>
    </div>
  );
}

/**
 * Form-element plumbing every pack needs: submit routing (next vs submit),
 * honeypot on live forms, and the submit error line. Chrome-free.
 */
export function FlowForm({
  ctrl,
  preview,
  children,
}: {
  ctrl: FormController;
  preview: boolean;
  children: ReactNode;
}) {
  return (
    <form
      className="tf-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (ctrl.isStepped && !ctrl.isLastStep) ctrl.next();
        else ctrl.submit();
      }}
    >
      {children}
      {!preview ? <Honeypot value={ctrl.honeypot} onChange={ctrl.setHoneypot} /> : null}
      {ctrl.errorMessage ? (
        <p className="tf-error tf-submit-error" role="alert">
          {ctrl.errorMessage}
        </p>
      ) : null}
    </form>
  );
}

export function PackAttribution({ snapshot }: { snapshot: PublicSnapshot }) {
  return <Attribution show={snapshot.settings.attribution} />;
}
