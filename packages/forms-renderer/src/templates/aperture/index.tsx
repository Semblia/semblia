import { Fragment } from "react";
import type { PublicSnapshot } from "@workspace/forms-core";
import type {
  TemplateCompositionProps,
  TemplateLoaderProps,
  TemplatePack,
} from "../registry.js";
import type { FormController, FormStep } from "../../use-form-controller.js";
import {
  FlowForm,
  LogoMark,
  PackAttribution,
  StagedControls,
  StepAnnouncer,
  StepFields,
} from "../shared.js";
import { apertureStylesheet } from "./styles.js";

/**
 * Aperture — the stage.
 *
 * Built for video praise (research anchors: VideoAsk's portrait stage,
 * Senja's one-decision video step). The whole viewport is a dark stage with a
 * spotlight cone falling on the cue card; a mono cue number ("01 — 04") sits
 * above each question; options float as pills; the recorder is the protagonist
 * on a 16:9 stage with a reassurance line. A film-strip progress runs along
 * the top. Embedded, the stage becomes a compact contained card.
 */

function FilmStrip({ ctrl }: { ctrl: FormController }) {
  if (!ctrl.isStepped || ctrl.totalSteps < 2) return null;
  return (
    <div
      className="apt-strip"
      role="progressbar"
      aria-label="Progress"
      aria-valuemin={1}
      aria-valuemax={ctrl.totalSteps}
      aria-valuenow={ctrl.step + 1}
    >
      {Array.from({ length: ctrl.totalSteps }, (_, i) => (
        <span key={i} data-done={i <= ctrl.step} />
      ))}
    </div>
  );
}

/** Cue chrome above the question: "01 — 04". Functional, not decorative —
 *  the announcer already speaks progress, so this stays aria-hidden. */
function CueNumber({ ctrl }: { ctrl: FormController }) {
  if (!ctrl.isStepped || ctrl.totalSteps < 2) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <p className="apt-cue" aria-hidden="true">
      {pad(ctrl.step + 1)} — {pad(ctrl.totalSteps)}
    </p>
  );
}

function stepHasRecorder(step: FormStep): boolean {
  return step.fields.some(
    (f) => f.type === "videoUpload" || f.type === "audioUpload",
  );
}

/** Recorder reassurance (research: the take must never feel high-stakes). */
function Reassurance() {
  return (
    <p className="apt-reassure">
      It doesn&apos;t have to be perfect — unlimited takes.
    </p>
  );
}

function Moment({
  variant,
  snapshot,
}: {
  variant: "success" | "closed";
  snapshot: PublicSnapshot;
}) {
  return (
    <div className="apt-moment" role="status">
      <p className="apt-moment-title">
        {variant === "success" ? "That's a wrap" : "This form is closed"}
      </p>
      <p className="apt-moment-text">
        {variant === "success"
          ? snapshot.content.successMessage
          : snapshot.content.closedMessage}
      </p>
    </div>
  );
}

function BackButton({ ctrl }: { ctrl: FormController }) {
  if (!ctrl.isStepped || ctrl.step === 0) return null;
  return (
    <button
      type="button"
      className="apt-back"
      onClick={ctrl.back}
      aria-label="Previous question"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** The opening lede(s), spoken once before the first cue. */
function SceneLede({
  ctrl,
  content,
}: {
  ctrl: FormController;
  content: PublicSnapshot["content"];
}) {
  if (ctrl.step !== 0) return null;
  return (
    <>
      {content.description ? (
        <p className="apt-lede">{content.description}</p>
      ) : null}
      {content.introText ? (
        <p className="apt-lede">{content.introText}</p>
      ) : null}
    </>
  );
}

function SceneFields({ ctrl }: { ctrl: FormController }) {
  if (ctrl.isStepped && ctrl.currentStep) {
    return (
      <>
        <StepFields step={ctrl.currentStep} ctrl={ctrl} autoFocus />
        {stepHasRecorder(ctrl.currentStep) ? <Reassurance /> : null}
      </>
    );
  }
  return ctrl.steps.map((step) => (
    <Fragment key={step.fields[0]!.id}>
      <StepFields step={step} ctrl={ctrl} />
      {stepHasRecorder(step) ? <Reassurance /> : null}
    </Fragment>
  ));
}

function ApertureComposition({
  snapshot,
  ctrl,
  preview,
  closed,
  surface,
}: TemplateCompositionProps) {
  const done = ctrl.submitState === "success";
  const live = !closed && !done;
  const { content } = snapshot;
  return (
    <div className="apt-stage" data-apt-surface={surface}>
      {live ? <FilmStrip ctrl={ctrl} /> : null}
      {live ? <BackButton ctrl={ctrl} /> : null}
      <div className="apt-scene-wrap">
        {closed ? (
          <Moment variant="closed" snapshot={snapshot} />
        ) : done ? (
          <Moment variant="success" snapshot={snapshot} />
        ) : (
          <FlowForm ctrl={ctrl} preview={preview}>
            <StepAnnouncer ctrl={ctrl} />
            <section className="apt-scene" key={ctrl.step}>
              <CueNumber ctrl={ctrl} />
              <SceneLede ctrl={ctrl} content={content} />
              <SceneFields ctrl={ctrl} />
              <StagedControls snapshot={snapshot} ctrl={ctrl} />
            </section>
          </FlowForm>
        )}
      </div>
      <footer className="apt-foot">
        <div className="apt-foot-brand">
          <LogoMark snapshot={snapshot} />
          <span className="apt-foot-title">{content.title}</span>
        </div>
        <PackAttribution snapshot={snapshot} />
      </footer>
    </div>
  );
}

function ApertureLoader({ logoUrl, name }: TemplateLoaderProps) {
  return (
    <div className="tf-loader apt-loader" role="status" aria-label="Loading form">
      <span className="apt-loader-iris" aria-hidden="true" />
      {logoUrl ? (
        <img className="apt-loader-logo" src={logoUrl} alt="" />
      ) : (
        <span className="apt-loader-mark" aria-hidden="true">
          {(name || "•").charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export const aperturePack: TemplatePack = {
  id: "aperture",
  Composition: ApertureComposition,
  stylesheet: apertureStylesheet,
  Loader: ApertureLoader,
};
