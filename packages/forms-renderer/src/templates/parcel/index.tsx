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
import { parcelStylesheet } from "./styles.js";

/**
 * Parcel — post-purchase show-and-tell for commerce. A product hero leads,
 * the star rating is the giant zero-typing first tap, photo upload is the
 * celebrated "show it in the wild" moment, and the motion is springy-warm.
 */

function Hero({ snapshot }: { snapshot: PublicSnapshot }) {
  const { heroImageUrl } = snapshot.assets;
  return (
    <header className="pcl-hero" data-has-image={!!heroImageUrl}>
      {heroImageUrl ? (
        <img className="pcl-hero-img" src={heroImageUrl} alt="" />
      ) : (
        <div className="pcl-hero-band" aria-hidden="true" />
      )}
      <div className="pcl-hero-brand">
        <LogoMark snapshot={snapshot} />
      </div>
    </header>
  );
}

function SuccessMoment({ snapshot }: { snapshot: PublicSnapshot }) {
  return (
    <div className="pcl-moment" role="status">
      <span className="pcl-burst" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M15 3l2.9 7.4L26 12l-7.1 3.6L15 27l-3.9-11.4L4 12l8.1-1.6L15 3z" fill="currentColor" />
        </svg>
      </span>
      <p className="pcl-moment-title">You're a star</p>
      <p className="pcl-moment-text">{snapshot.content.successMessage}</p>
    </div>
  );
}

function ParcelComposition({
  snapshot,
  ctrl,
  preview,
  closed,
}: TemplateCompositionProps) {
  const done = ctrl.submitState === "success";
  return (
    <div className="pcl-page">
      <main className="pcl-card">
        <Hero snapshot={snapshot} />
        <div className="pcl-body">
          {closed ? (
            <div className="pcl-moment" role="status">
              <p className="pcl-moment-title">Reviews are closed</p>
              <p className="pcl-moment-text">{snapshot.content.closedMessage}</p>
            </div>
          ) : done ? (
            <SuccessMoment snapshot={snapshot} />
          ) : (
            <>
              {snapshot.content.title ? (
                <h1 className="pcl-title">{snapshot.content.title}</h1>
              ) : null}
              {snapshot.content.description ? (
                <p className="pcl-desc">{snapshot.content.description}</p>
              ) : null}
              <TimeContract fields={snapshot.fields} />
              <FlowForm ctrl={ctrl} preview={preview}>
                {ctrl.isStepped && ctrl.currentStep ? (
                  <div className="pcl-step" key={ctrl.step}>
                    <p className="pcl-step-count">
                      {ctrl.step + 1} of {ctrl.totalSteps}
                    </p>
                    <StepFields step={ctrl.currentStep} ctrl={ctrl} autoFocus />
                    <StagedControls snapshot={snapshot} ctrl={ctrl} />
                  </div>
                ) : (
                  <>
                    <div className="pcl-fields">
                      <AllFields ctrl={ctrl} />
                    </div>
                    <SubmitControls snapshot={snapshot} ctrl={ctrl} />
                  </>
                )}
              </FlowForm>
            </>
          )}
        </div>
      </main>
      <PackAttribution snapshot={snapshot} />
    </div>
  );
}

function ParcelLoader({ logoUrl, name }: TemplateLoaderProps) {
  return (
    <div className="tf-loader pcl-loader" role="status" aria-label="Loading form">
      <span className="pcl-loader-box" aria-hidden="true">
        {logoUrl ? (
          <img src={logoUrl} alt="" />
        ) : (
          <span>{(name || "•").charAt(0).toUpperCase()}</span>
        )}
      </span>
    </div>
  );
}

export const parcelPack: TemplatePack = {
  id: "parcel",
  Composition: ParcelComposition,
  stylesheet: parcelStylesheet,
  Loader: ParcelLoader,
};
