import type { PublicSnapshot } from "@workspace/forms-core";
import type { FormController } from "../../use-form-controller.js";
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
import { ledgerStylesheet } from "./styles.js";

/**
 * Ledger — an editorial letter. Serif, paper-warm, generous whitespace. Its
 * signature move: as the respondent answers, completed questions settle into
 * the page above as written prose, so finishing the form reads like having
 * written a letter.
 */

function answerText(ctrl: FormController, fieldId: string): string {
  const v = ctrl.answers[fieldId];
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.join(", ");
  return "";
}

/** Completed steps render as prose above the live question. */
function Trail({ ctrl }: { ctrl: FormController }) {
  const settled = ctrl.steps.slice(0, ctrl.step);
  if (settled.length === 0) return null;
  return (
    <div className="ldg-trail">
      {settled.map((step) =>
        step.fields
          .filter((f) => f.type !== "consent")
          .map((f) => {
            const a = answerText(ctrl, f.id);
            if (!a) return null;
            return (
              <div className="ldg-trail-entry" key={f.id}>
                <p className="ldg-trail-q">{f.label}</p>
                <p className="ldg-trail-a">{a}</p>
              </div>
            );
          }),
      )}
    </div>
  );
}

function Letterhead({ snapshot }: { snapshot: PublicSnapshot }) {
  const name = snapshot.brand.name || snapshot.content.title;
  return (
    <header className="ldg-letterhead">
      <LogoMark snapshot={snapshot} />
      {name ? <p className="ldg-house">{name}</p> : null}
      <hr className="ldg-rule" />
    </header>
  );
}

function SuccessMoment({ snapshot }: { snapshot: PublicSnapshot }) {
  return (
    <div className="ldg-moment" role="status">
      <span className="ldg-seal" aria-hidden="true">✓</span>
      <p className="ldg-moment-title">With thanks</p>
      <p className="ldg-moment-text">{snapshot.content.successMessage}</p>
      <hr className="ldg-rule" />
    </div>
  );
}

function LedgerComposition({
  snapshot,
  ctrl,
  preview,
  closed,
}: TemplateCompositionProps) {
  const done = ctrl.submitState === "success";
  return (
    <div className="ldg-page">
      <main className="ldg-sheet">
        <Letterhead snapshot={snapshot} />
        {closed ? (
          <div className="ldg-moment" role="status">
            <p className="ldg-moment-title">This letter is closed</p>
            <p className="ldg-moment-text">{snapshot.content.closedMessage}</p>
          </div>
        ) : done ? (
          <SuccessMoment snapshot={snapshot} />
        ) : (
          <>
            {ctrl.step === 0 ? (
              <div className="ldg-opening">
                {snapshot.content.title ? (
                  <h1 className="ldg-title">{snapshot.content.title}</h1>
                ) : null}
                {snapshot.content.description ? (
                  <p className="ldg-desc">{snapshot.content.description}</p>
                ) : null}
                <TimeContract fields={snapshot.fields} />
              </div>
            ) : null}
            <FlowForm ctrl={ctrl} preview={preview}>
              {ctrl.isStepped && ctrl.currentStep ? (
                <>
                  <Trail ctrl={ctrl} />
                  <div className="ldg-live" key={ctrl.step}>
                    <p className="ldg-count">
                      Question {ctrl.step + 1} of {ctrl.totalSteps}
                    </p>
                    <StepFields step={ctrl.currentStep} ctrl={ctrl} autoFocus />
                  </div>
                  <StagedControls
                    snapshot={snapshot}
                    ctrl={ctrl}
                    nextLabel="Continue writing"
                  />
                </>
              ) : (
                <>
                  <AllFields ctrl={ctrl} />
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

function LedgerLoader({ logoUrl, name }: TemplateLoaderProps) {
  return (
    <div className="tf-loader ldg-loader" role="status" aria-label="Loading form">
      {logoUrl ? (
        <img className="ldg-loader-logo" src={logoUrl} alt="" />
      ) : (
        <span className="ldg-loader-mark">{(name || "•").charAt(0).toUpperCase()}</span>
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
