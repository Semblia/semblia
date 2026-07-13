import { useEffect } from "react";
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
} from "../shared.js";
import { terminalStylesheet } from "./styles.js";

/**
 * Terminal — a precise instrument for developer-tool feedback. Grid paper,
 * mono metadata, keyboard-first: digits pick options and ratings, transitions
 * are instant. Reads like a tool, not a survey.
 */

/** Digits 1–9 answer the current select/rating ask without touching the mouse. */
function useDigitKeys(ctrl: FormController) {
  useEffect(() => {
    if (!ctrl.isStepped) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      const n = Number.parseInt(e.key, 10);
      if (!Number.isFinite(n) || n < 1 || n > 9) return;
      const field = ctrl.currentStep?.fields[0];
      if (!field) return;
      if (field.type === "rating" && n <= (field.ratingScale ?? 5)) {
        ctrl.setAnswer(field.id, n);
        e.preventDefault();
      } else if (field.type === "singleSelect") {
        const opt = (field.options ?? [])[n - 1];
        if (opt) {
          ctrl.setAnswer(field.id, opt.value);
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctrl]);
}

function SuccessMoment({ snapshot }: { snapshot: PublicSnapshot }) {
  return (
    <div className="trm-moment" role="status">
      <p className="trm-stamp">
        <span aria-hidden="true">✓</span> logged
      </p>
      <p className="trm-moment-text">{snapshot.content.successMessage}</p>
    </div>
  );
}

function TerminalComposition({
  snapshot,
  ctrl,
  preview,
  closed,
}: TemplateCompositionProps) {
  useDigitKeys(ctrl);
  const done = ctrl.submitState === "success";
  const name = snapshot.brand.name || snapshot.content.title || "feedback";
  return (
    <div className="trm-page">
      <main className="trm-panel">
        <header className="trm-bar">
          <LogoMark snapshot={snapshot} />
          <span className="trm-bar-name">{name.toLowerCase()}</span>
          {!closed && !done && ctrl.isStepped ? (
            <span className="trm-bar-count">
              {ctrl.step + 1}/{ctrl.totalSteps}
            </span>
          ) : null}
        </header>
        <div className="trm-body">
          {closed ? (
            <div className="trm-moment" role="status">
              <p className="trm-stamp" data-closed>
                — closed
              </p>
              <p className="trm-moment-text">{snapshot.content.closedMessage}</p>
            </div>
          ) : done ? (
            <SuccessMoment snapshot={snapshot} />
          ) : (
            <>
              {ctrl.step === 0 ? (
                <div className="trm-head">
                  {snapshot.content.title ? (
                    <h1 className="trm-title">{snapshot.content.title}</h1>
                  ) : null}
                  {snapshot.content.description ? (
                    <p className="trm-desc">{snapshot.content.description}</p>
                  ) : null}
                </div>
              ) : null}
              <FlowForm ctrl={ctrl} preview={preview}>
                {ctrl.isStepped && ctrl.currentStep ? (
                  <div className="trm-step" key={ctrl.step}>
                    <StepFields step={ctrl.currentStep} ctrl={ctrl} autoFocus />
                    <p className="trm-kbd-hint" aria-hidden="true">
                      <kbd>1</kbd>–<kbd>9</kbd> to pick · <kbd>enter</kbd> to continue
                    </p>
                    <StagedControls snapshot={snapshot} ctrl={ctrl} nextLabel="Next" />
                  </div>
                ) : (
                  <>
                    <div className="trm-fields">
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

function TerminalLoader({ logoUrl, name }: TemplateLoaderProps) {
  return (
    <div className="tf-loader trm-loader" role="status" aria-label="Loading form">
      <span className="trm-loader-line">
        {logoUrl ? <img src={logoUrl} alt="" /> : null}
        <span aria-hidden="true">
          loading {(name || "form").toLowerCase()}
          <span className="trm-caret" />
        </span>
      </span>
    </div>
  );
}

export const terminalPack: TemplatePack = {
  id: "terminal",
  Composition: TerminalComposition,
  stylesheet: terminalStylesheet,
  Loader: TerminalLoader,
};
