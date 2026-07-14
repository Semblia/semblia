import type { PublicSnapshot } from "@workspace/forms-core";
import type {
  TemplateCompositionProps,
  TemplateLoaderProps,
  TemplatePack,
} from "../registry.js";
import type { FormController } from "../../use-form-controller.js";
import {
  AllFields,
  FlowForm,
  LogoMark,
  PackAttribution,
  StagedControls,
  StepAnnouncer,
  StepFields,
  SubmitControls,
  TimeContract,
  TrustLedger,
} from "../shared.js";
import { meridianStylesheet } from "./styles.js";

/**
 * Meridian — the considered ask.
 *
 * Hosted, it is a two-pane conversation (research anchors: Senja's hosted
 * collect page, Typeform's photography split): a sticky brand pane that makes
 * the ask personal — who is asking, why, what it costs, what the respondent
 * controls — and a flow pane where answering feels like typing a reply, not
 * filling a record (baseline-rule typographic inputs, one moment at a time).
 * Embedded, it earns a card boundary inside the host page and tightens up.
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function Moment({
  variant,
  snapshot,
}: {
  variant: "success" | "closed";
  snapshot: PublicSnapshot;
}) {
  return (
    <div className="mrd-moment" role="status">
      {variant === "success" ? (
        <span className="mrd-check" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.5" className="mrd-check-ring" />
            <polyline points="8,15 12.5,20 20,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mrd-check-tick" />
          </svg>
        </span>
      ) : null}
      <p className="mrd-moment-title">
        {variant === "success" ? "Thank you" : "This form is closed"}
      </p>
      <p className="mrd-moment-text">
        {variant === "success"
          ? snapshot.content.successMessage
          : snapshot.content.closedMessage}
      </p>
    </div>
  );
}

/** The answer journey — staged moments or the calm single pass. */
function Journey({
  snapshot,
  ctrl,
  preview,
}: {
  snapshot: PublicSnapshot;
  ctrl: FormController;
  preview: boolean;
}) {
  const { introText } = snapshot.content;
  return (
    <FlowForm ctrl={ctrl} preview={preview}>
      <StepAnnouncer ctrl={ctrl} />
      {ctrl.isStepped && ctrl.currentStep ? (
        <>
          <div className="mrd-track" aria-hidden="true">
            <span style={{ width: `${Math.round(ctrl.progress * 100)}%` }} />
          </div>
          <p className="mrd-count" aria-hidden="true">
            {pad2(ctrl.step + 1)} — {pad2(ctrl.totalSteps)}
          </p>
          {ctrl.step === 0 && introText ? (
            <p className="mrd-intro">{introText}</p>
          ) : null}
          <div className="mrd-scene" key={ctrl.step}>
            <StepFields step={ctrl.currentStep} ctrl={ctrl} autoFocus />
          </div>
          <StagedControls snapshot={snapshot} ctrl={ctrl} />
        </>
      ) : (
        <>
          {introText ? <p className="mrd-intro">{introText}</p> : null}
          <div className="mrd-fields">
            <AllFields ctrl={ctrl} />
          </div>
          <SubmitControls snapshot={snapshot} ctrl={ctrl} />
        </>
      )}
    </FlowForm>
  );
}

function MeridianComposition({
  snapshot,
  ctrl,
  preview,
  closed,
  surface,
}: TemplateCompositionProps) {
  const done = ctrl.submitState === "success";
  const moment = closed ? (
    <Moment variant="closed" snapshot={snapshot} />
  ) : done ? (
    <Moment variant="success" snapshot={snapshot} />
  ) : null;

  if (surface === "embed") {
    return (
      <div className="mrd-embed">
        {moment ?? (
          <>
            <header className="mrd-embed-head">
              <LogoMark snapshot={snapshot} />
              <div className="mrd-embed-id">
                <h2 className="mrd-embed-title">{snapshot.content.title}</h2>
                <TimeContract fields={snapshot.fields} />
              </div>
            </header>
            {snapshot.content.description ? (
              <p className="mrd-embed-desc">{snapshot.content.description}</p>
            ) : null}
            <Journey snapshot={snapshot} ctrl={ctrl} preview={preview} />
          </>
        )}
        <PackAttribution snapshot={snapshot} />
      </div>
    );
  }

  return (
    <div className="mrd-hosted">
      <aside className="mrd-brand">
        <div className="mrd-brand-body">
          <LogoMark snapshot={snapshot} />
          <h1 className="mrd-title">{snapshot.content.title}</h1>
          {snapshot.content.description ? (
            <p className="mrd-description">{snapshot.content.description}</p>
          ) : null}
          <TrustLedger snapshot={snapshot} />
        </div>
        <div className="mrd-brand-foot">
          <PackAttribution snapshot={snapshot} />
        </div>
      </aside>
      <main className="mrd-flow">
        <div className="mrd-flow-body">
          {moment ?? <Journey snapshot={snapshot} ctrl={ctrl} preview={preview} />}
        </div>
      </main>
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
