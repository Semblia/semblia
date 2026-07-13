import type { PublicSnapshot } from "@workspace/forms-core";
import { FieldControl } from "../../fields.js";
import type { FormController, FormStep } from "../../use-form-controller.js";
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
import { apertureStylesheet } from "./styles.js";

/**
 * Aperture — a stage built for video praise. Near-black, one giant prompt at
 * a time, a cinematic record moment with an always-visible "write instead"
 * escape, luminous progress. Dark-native by contract (manifest clamps
 * appearance to dark).
 */

/** The record-or-write moment: camera leads, writing is a first-class escape. */
function RecordOrWrite({ step, ctrl }: { step: FormStep; ctrl: FormController }) {
  const [media, text] = step.fields;
  if (!media || !text) return null;
  const hasMedia = typeof ctrl.answers[media.id] === "string" && ctrl.answers[media.id] !== "";
  const writing =
    typeof ctrl.answers[text.id] === "string" && (ctrl.answers[text.id] as string) !== "";
  return (
    <div className="apt-row">
      <FieldControl
        field={media}
        value={ctrl.answers[media.id]}
        error={ctrl.errors[media.id]}
        onChange={(v) => ctrl.setAnswer(media.id, v)}
      />
      <p className="apt-or" aria-hidden="true">
        {hasMedia ? "add a written note too, if you like" : "or"}
      </p>
      <FieldControl
        field={{ ...text, label: writing || !hasMedia ? text.label : "" }}
        value={ctrl.answers[text.id]}
        error={ctrl.errors[text.id]}
        onChange={(v) => ctrl.setAnswer(text.id, v)}
      />
    </div>
  );
}

function StageStep({ ctrl }: { ctrl: TemplateCompositionProps["ctrl"] }) {
  const step = ctrl.currentStep;
  if (!step) return null;
  const prompt = step.fields[0]!;
  return (
    <div className="apt-step" key={ctrl.step}>
      <p className="apt-count">
        {String(ctrl.step + 1).padStart(2, "0")} / {String(ctrl.totalSteps).padStart(2, "0")}
      </p>
      {step.kind === "recordOrWrite" ? (
        <>
          <h2 className="apt-prompt">{prompt.label}</h2>
          {prompt.description ? <p className="apt-hint">{prompt.description}</p> : null}
          <RecordOrWrite step={step} ctrl={ctrl} />
        </>
      ) : (
        <StepFields step={step} ctrl={ctrl} autoFocus />
      )}
    </div>
  );
}

function SuccessMoment({ snapshot }: { snapshot: PublicSnapshot }) {
  return (
    <div className="apt-moment" role="status">
      <span className="apt-iris" aria-hidden="true" />
      <p className="apt-moment-title">That's a wrap</p>
      <p className="apt-moment-text">{snapshot.content.successMessage}</p>
    </div>
  );
}

function ApertureComposition({
  snapshot,
  ctrl,
  preview,
  closed,
}: TemplateCompositionProps) {
  const done = ctrl.submitState === "success";
  return (
    <div className="apt-page">
      {!closed && !done && ctrl.isStepped ? (
        <div
          className="apt-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={ctrl.totalSteps}
          aria-valuenow={ctrl.step + 1}
        >
          <span style={{ width: `${Math.round(ctrl.progress * 100)}%` }} />
        </div>
      ) : null}
      <header className="apt-top">
        <LogoMark snapshot={snapshot} />
      </header>
      <main className="apt-stage">
        {closed ? (
          <div className="apt-moment" role="status">
            <p className="apt-moment-title">This form is closed</p>
            <p className="apt-moment-text">{snapshot.content.closedMessage}</p>
          </div>
        ) : done ? (
          <SuccessMoment snapshot={snapshot} />
        ) : (
          <FlowForm ctrl={ctrl} preview={preview}>
            {ctrl.isStepped ? (
              <>
                {ctrl.step === 0 ? (
                  <div className="apt-welcome">
                    {snapshot.content.title ? (
                      <h1 className="apt-title">{snapshot.content.title}</h1>
                    ) : null}
                    {snapshot.content.description ? (
                      <p className="apt-desc">{snapshot.content.description}</p>
                    ) : null}
                    <TimeContract fields={snapshot.fields} />
                  </div>
                ) : null}
                <StageStep ctrl={ctrl} />
                <StagedControls snapshot={snapshot} ctrl={ctrl} />
              </>
            ) : (
              <>
                <h1 className="apt-title">{snapshot.content.title}</h1>
                <AllFields ctrl={ctrl} />
                <SubmitControls snapshot={snapshot} ctrl={ctrl} />
              </>
            )}
          </FlowForm>
        )}
      </main>
      <PackAttribution snapshot={snapshot} />
    </div>
  );
}

function ApertureLoader({ logoUrl, name }: TemplateLoaderProps) {
  return (
    <div className="tf-loader apt-loader" role="status" aria-label="Loading form">
      <span className="apt-loader-ring" aria-hidden="true">
        {logoUrl ? (
          <img src={logoUrl} alt="" />
        ) : (
          <span>{(name || "•").charAt(0).toUpperCase()}</span>
        )}
      </span>
    </div>
  );
}

export const aperturePack: TemplatePack = {
  id: "aperture",
  Composition: ApertureComposition,
  stylesheet: apertureStylesheet,
  Loader: ApertureLoader,
};
