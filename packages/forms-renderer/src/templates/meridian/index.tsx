import type { PublicSnapshot } from "@workspace/forms-core";
import type {
  TemplateCompositionProps,
  TemplateLoaderProps,
  TemplatePack,
} from "../registry.js";
import {
  AllFields,
  FlowForm,
  LogoMark,
  PackAttribution,
  StagedControls,
  StepFields,
  SubmitControls,
  TimeContract,
} from "../shared.js";
import { meridianStylesheet } from "./styles.js";

/**
 * Meridian — the quiet universal default. A calm lifted card, restrained ink
 * motion, precise type. Designed to sit comfortably next to any brand without
 * imitating one.
 */

function Header({ snapshot }: { snapshot: PublicSnapshot }) {
  const { content } = snapshot;
  return (
    <header className="mrd-header">
      <LogoMark snapshot={snapshot} />
      {content.title ? <h1 className="mrd-title">{content.title}</h1> : null}
      {content.description ? (
        <p className="mrd-description">{content.description}</p>
      ) : null}
      <TimeContract fields={snapshot.fields} />
    </header>
  );
}

function SuccessMoment({ snapshot }: { snapshot: PublicSnapshot }) {
  return (
    <div className="mrd-moment" role="status">
      <span className="mrd-check" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.5" className="mrd-check-ring" />
          <polyline points="8,15 12.5,20 20,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mrd-check-tick" />
        </svg>
      </span>
      <p className="mrd-moment-title">Thank you</p>
      <p className="mrd-moment-text">{snapshot.content.successMessage}</p>
    </div>
  );
}

function ClosedMoment({ snapshot }: { snapshot: PublicSnapshot }) {
  return (
    <div className="mrd-moment" role="status">
      <p className="mrd-moment-title">This form is closed</p>
      <p className="mrd-moment-text">{snapshot.content.closedMessage}</p>
    </div>
  );
}

function MeridianComposition({
  snapshot,
  ctrl,
  preview,
  closed,
}: TemplateCompositionProps) {
  const done = ctrl.submitState === "success";
  return (
    <div className="mrd-page">
      <main className="mrd-card">
        {closed ? (
          <ClosedMoment snapshot={snapshot} />
        ) : done ? (
          <SuccessMoment snapshot={snapshot} />
        ) : (
          <>
            <Header snapshot={snapshot} />
            <FlowForm ctrl={ctrl} preview={preview}>
              {snapshot.content.introText ? (
                <p className="mrd-intro">{snapshot.content.introText}</p>
              ) : null}
              {ctrl.isStepped && ctrl.currentStep ? (
                <div className="mrd-step" key={ctrl.step}>
                  <p className="mrd-step-count">
                    {ctrl.step + 1} of {ctrl.totalSteps}
                  </p>
                  <StepFields step={ctrl.currentStep} ctrl={ctrl} autoFocus />
                  <StagedControls snapshot={snapshot} ctrl={ctrl} />
                </div>
              ) : (
                <>
                  <div className="mrd-fields">
                    <AllFields ctrl={ctrl} />
                  </div>
                  <SubmitControls snapshot={snapshot} ctrl={ctrl} />
                </>
              )}
            </FlowForm>
          </>
        )}
      </main>
      <PackAttribution snapshot={snapshot} />
    </div>
  );
}

function MeridianLoader({ logoUrl, name }: TemplateLoaderProps) {
  return (
    <div className="tf-loader mrd-loader" role="status" aria-label="Loading form">
      {logoUrl ? (
        <img className="mrd-loader-logo" src={logoUrl} alt="" />
      ) : (
        <span className="mrd-loader-mark" aria-hidden="true">
          {(name || "•").charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export const meridianPack: TemplatePack = {
  id: "meridian",
  Composition: MeridianComposition,
  stylesheet: meridianStylesheet,
  Loader: MeridianLoader,
};
