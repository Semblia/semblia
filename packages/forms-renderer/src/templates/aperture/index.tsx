import type { PublicSnapshot } from "@workspace/forms-core";
import type {
  TemplateCompositionProps,
  TemplateLoaderProps,
  TemplatePack,
} from "../registry.js";
import type { FormController } from "../../use-form-controller.js";
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
 * brand-colored glow; every prompt is a cue card in display type; options
 * float as pills; the record action is the protagonist. A film-strip progress
 * runs along the top. Embedded, the stage becomes a contained portrait panel.
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
      {live && ctrl.isStepped && ctrl.step > 0 ? (
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
      ) : null}
      <div className="apt-scene-wrap">
        {closed ? (
          <Moment variant="closed" snapshot={snapshot} />
        ) : done ? (
          <Moment variant="success" snapshot={snapshot} />
        ) : (
          <FlowForm ctrl={ctrl} preview={preview}>
            <StepAnnouncer ctrl={ctrl} />
            <section className="apt-scene" key={ctrl.step}>
              {ctrl.step === 0 && content.description ? (
                <p className="apt-lede">{content.description}</p>
              ) : null}
              {ctrl.step === 0 && content.introText ? (
                <p className="apt-lede">{content.introText}</p>
              ) : null}
              {ctrl.isStepped && ctrl.currentStep ? (
                <StepFields step={ctrl.currentStep} ctrl={ctrl} autoFocus />
              ) : (
                ctrl.steps.map((step) => (
                  <StepFields key={step.fields[0]!.id} step={step} ctrl={ctrl} />
                ))
              )}
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
