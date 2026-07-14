import type { KeyboardEvent } from "react";
import type { FormField, PublicSnapshot } from "@workspace/forms-core";
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
import { terminalStylesheet } from "./styles.js";

/**
 * Terminal — the instrument.
 *
 * Product feedback for technical audiences (research anchors: Supabase's
 * authenticity-first aesthetic, Typeform's keycap idiom). The form is a
 * session: answered asks accumulate above the prompt as dimmed log lines, the
 * current ask sits at a caret, options carry digit keycaps selectable from the
 * keyboard, and a mono status bar tracks progress. No theatre — the tool
 * responds, it doesn't perform.
 */

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function formatAnswer(field: FormField, value: unknown): string {
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) {
    return "—";
  }
  switch (field.type) {
    case "rating":
      return `${Number(value)}/${field.ratingScale ?? 5}`;
    case "singleSelect": {
      const opt = field.options?.find((o) => o.value === value);
      return truncate(opt?.label ?? String(value), 42);
    }
    case "multiSelect": {
      const picked = Array.isArray(value) ? (value as string[]) : [];
      const labels = picked.map(
        (v) => field.options?.find((o) => o.value === v)?.label ?? v,
      );
      return truncate(labels.join(", "), 42);
    }
    case "consent":
      return value === true || value === "true" ? "yes" : "no";
    case "videoUpload":
    case "audioUpload":
    case "imageUpload":
    case "fileUpload":
      return "attached";
    default:
      return truncate(String(value), 42);
  }
}

/** The session log: everything already answered, dimmed, above the prompt. */
function Transcript({ ctrl }: { ctrl: FormController }) {
  if (!ctrl.isStepped || ctrl.step === 0) return null;
  const answered = ctrl.steps.slice(0, ctrl.step);
  return (
    <ol className="trm-log" aria-label="Your answers so far">
      {answered.flatMap((step) =>
        step.fields
          .filter((f) => f.type !== "hidden")
          .map((f) => (
            <li key={f.id} className="trm-line">
              <span className="trm-prompt" aria-hidden="true">
                ›
              </span>
              <span className="trm-key">{truncate(f.label, 34)}</span>
              <span className="trm-val">{formatAnswer(f, ctrl.answers[f.id])}</span>
            </li>
          )),
      )}
    </ol>
  );
}

function stepSelectField(step: FormStep | undefined): FormField | null {
  const f = step?.fields.find(
    (x) => x.type === "singleSelect" || x.type === "multiSelect",
  );
  return f && f.options?.length ? f : null;
}

function Moment({
  variant,
  snapshot,
}: {
  variant: "success" | "closed";
  snapshot: PublicSnapshot;
}) {
  return (
    <div className="trm-moment" role="status">
      <p className="trm-stamp">
        {variant === "success" ? "› response recorded ✓" : "› form closed"}
      </p>
      <p className="trm-moment-text">
        {variant === "success"
          ? snapshot.content.successMessage
          : snapshot.content.closedMessage}
      </p>
    </div>
  );
}

function TerminalComposition({
  snapshot,
  ctrl,
  preview,
  closed,
  surface,
}: TemplateCompositionProps) {
  const done = ctrl.submitState === "success";
  const live = !closed && !done;
  const selectField = live ? stepSelectField(ctrl.currentStep) : null;

  // Digit keys operate select options — the keyboard is the instrument.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!selectField?.options) return;
    const target = e.target as HTMLInputElement;
    const tag = target.tagName;
    if (
      (tag === "INPUT" && target.type !== "radio" && target.type !== "checkbox") ||
      tag === "TEXTAREA"
    ) {
      return;
    }
    const n = Number(e.key);
    if (!Number.isInteger(n) || n < 1 || n > selectField.options.length) return;
    const opt = selectField.options[n - 1]!;
    if (selectField.type === "singleSelect") {
      ctrl.setAnswer(selectField.id, opt.value);
    } else {
      const cur = Array.isArray(ctrl.answers[selectField.id])
        ? (ctrl.answers[selectField.id] as string[])
        : [];
      ctrl.setAnswer(
        selectField.id,
        cur.includes(opt.value)
          ? cur.filter((v) => v !== opt.value)
          : [...cur, opt.value],
      );
    }
    e.preventDefault();
  };

  return (
    <div className="trm-field" data-trm-surface={surface}>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- digit shortcuts augment (never replace) the radio/checkbox controls inside */}
      <section className="trm-panel" onKeyDown={onKeyDown}>
        <header className="trm-bar">
          <LogoMark snapshot={snapshot} />
          <span className="trm-path">
            ~/{snapshot.slug ?? "feedback"}
          </span>
          <span className="trm-count" aria-hidden="true">
            {closed ? "[closed]" : done ? "[done]" : ctrl.isStepped ? `[${ctrl.step + 1}/${ctrl.totalSteps}]` : "[1/1]"}
          </span>
        </header>
        <div className="trm-body">
          {live ? (
            <>
              <div className="trm-head">
                <h1 className="trm-title">{snapshot.content.title}</h1>
                {snapshot.content.description ? (
                  <p className="trm-desc">{snapshot.content.description}</p>
                ) : null}
              </div>
              <Transcript ctrl={ctrl} />
              <FlowForm ctrl={ctrl} preview={preview}>
                <StepAnnouncer ctrl={ctrl} />
                <div
                  className="trm-ask"
                  key={ctrl.isStepped ? ctrl.step : "all"}
                >
                  {ctrl.isStepped && ctrl.currentStep ? (
                    <StepFields step={ctrl.currentStep} ctrl={ctrl} autoFocus />
                  ) : (
                    ctrl.steps.map((step) => (
                      <StepFields
                        key={step.fields[0]!.id}
                        step={step}
                        ctrl={ctrl}
                      />
                    ))
                  )}
                </div>
                <p className="trm-hint" aria-hidden="true">
                  <kbd>↵</kbd> continue
                  {selectField ? (
                    <>
                      {" · "}
                      <kbd>1</kbd>–<kbd>{selectField.options!.length}</kbd> select
                    </>
                  ) : null}
                </p>
                <StagedControls snapshot={snapshot} ctrl={ctrl} nextLabel="Enter" />
              </FlowForm>
            </>
          ) : closed ? (
            <Moment variant="closed" snapshot={snapshot} />
          ) : (
            <Moment variant="success" snapshot={snapshot} />
          )}
        </div>
      </section>
      <PackAttribution snapshot={snapshot} />
    </div>
  );
}

function TerminalLoader({ logoUrl, name }: TemplateLoaderProps) {
  return (
    <div className="tf-loader trm-loader" role="status" aria-label="Loading form">
      {logoUrl ? (
        <img className="trm-loader-logo" src={logoUrl} alt="" />
      ) : (
        <span className="trm-loader-mark" aria-hidden="true">
          {(name || "•").charAt(0).toUpperCase()}
        </span>
      )}
      <span className="trm-caret" aria-hidden="true" />
    </div>
  );
}

export const terminalPack: TemplatePack = {
  id: "terminal",
  Composition: TerminalComposition,
  stylesheet: terminalStylesheet,
  Loader: TerminalLoader,
};
