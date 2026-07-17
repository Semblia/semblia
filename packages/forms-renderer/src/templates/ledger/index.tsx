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
import { ledgerStylesheet } from "./styles.js";

/**
 * Ledger — the letter.
 *
 * Written stories deserve a written page (research anchor: Tally's
 * form-as-document idiom). Hosted, Ledger is a paper sheet on a desk: a
 * letterhead (monogram, small-caps brand name, hairline rule), serif title,
 * prose lede, numbered asks set as manuscript run-ins, writing-line inputs
 * (ruled paper for long text), letter-keycap option chips, and a centered
 * folio footer that ends on a signature moment. The body sits vertically
 * centered between letterhead and footer, so one question never floats in a
 * void. Embedded, the sheet keeps a hairline frame and a ribbon rule and
 * flows with the host page.
 */

/** Fields that receive a manuscript number (consent/hidden stay unnumbered). */
function isNumbered(step: FormStep): number {
  return step.fields.filter((f) => f.type !== "consent" && f.type !== "hidden")
    .length;
}

function Moment({
  variant,
  snapshot,
}: {
  variant: "success" | "closed";
  snapshot: PublicSnapshot;
}) {
  return (
    <div className="ldg-moment" role="status">
      <p className="ldg-moment-mark" aria-hidden="true">
        ⁂
      </p>
      <p className="ldg-moment-title">
        {variant === "success" ? "Received, with thanks" : "This ledger is closed"}
      </p>
      <p className="ldg-moment-text">
        {variant === "success"
          ? snapshot.content.successMessage
          : snapshot.content.closedMessage}
      </p>
    </div>
  );
}

function Masthead({ snapshot }: { snapshot: PublicSnapshot }) {
  const { content } = snapshot;
  return (
    <header className="ldg-mast">
      <div className="ldg-mast-row">
        <LogoMark snapshot={snapshot} />
        <span className="ldg-mast-brand">{snapshot.brand.name}</span>
      </div>
      <hr className="ldg-rule" />
      <h1 className="ldg-title">{content.title}</h1>
      {content.description ? (
        <p className="ldg-lede">{content.description}</p>
      ) : null}
    </header>
  );
}

function LedgerComposition({
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

  // Manuscript numbering is global across pages: offset the CSS counter by
  // everything already answered on previous pages.
  const numberOffset = ctrl.steps
    .slice(0, ctrl.isStepped ? ctrl.step : 0)
    .reduce((n, s) => n + isNumbered(s), 0);

  const body = moment ?? (
    <>
      <Masthead snapshot={snapshot} />
      <FlowForm ctrl={ctrl} preview={preview}>
        <StepAnnouncer ctrl={ctrl} />
        {snapshot.content.introText && (!ctrl.isStepped || ctrl.step === 0) ? (
          <p className="ldg-intro">{snapshot.content.introText}</p>
        ) : null}
        <div
          className="ldg-body"
          key={ctrl.isStepped ? ctrl.step : "all"}
          style={{ counterReset: `ask ${numberOffset}` }}
        >
          {ctrl.isStepped && ctrl.currentStep ? (
            <StepFields step={ctrl.currentStep} ctrl={ctrl} autoFocus />
          ) : (
            ctrl.steps.map((step) => (
              <StepFields key={step.fields[0]!.id} step={step} ctrl={ctrl} />
            ))
          )}
        </div>
        <footer className="ldg-foot" data-signature={ctrl.isLastStep}>
          <StagedControls
            snapshot={snapshot}
            ctrl={ctrl}
            nextLabel="Next page"
            backLabel="Previous page"
          />
          {ctrl.isStepped && ctrl.totalSteps > 1 ? (
            <div className="ldg-folio" aria-hidden="true">
              <span className="ldg-folio-rule" />
              <p className="ldg-page">
                Page {ctrl.step + 1} of {ctrl.totalSteps}
              </p>
            </div>
          ) : null}
        </footer>
      </FlowForm>
    </>
  );

  return (
    <div className="ldg-desk" data-ldg-surface={surface}>
      <article className="ldg-sheet">{body}</article>
      <PackAttribution snapshot={snapshot} />
    </div>
  );
}

function LedgerLoader({ logoUrl, name }: TemplateLoaderProps) {
  return (
    <div className="tf-loader ldg-loader" role="status" aria-label="Loading form">
      {logoUrl ? (
        <img className="ldg-loader-logo" src={logoUrl} alt="" />
      ) : (
        <span className="ldg-loader-mark" aria-hidden="true">
          {(name || "•").charAt(0).toUpperCase()}
        </span>
      )}
      <span className="ldg-loader-line" aria-hidden="true" />
    </div>
  );
}

export const ledgerPack: TemplatePack = {
  id: "ledger",
  Composition: LedgerComposition,
  stylesheet: ledgerStylesheet,
  Loader: LedgerLoader,
};
