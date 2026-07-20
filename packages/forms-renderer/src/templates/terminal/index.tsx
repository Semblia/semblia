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

function isBlankAnswer(value: unknown): boolean {
  return (
    value == null || value === "" || (Array.isArray(value) && !value.length)
  );
}

function optionLabel(field: FormField, value: unknown): string {
  const opt = field.options?.find((o) => o.value === value);
  return opt?.label ?? String(value);
}

function multiSelectLabels(field: FormField, value: unknown): string {
  const picked = Array.isArray(value) ? (value as string[]) : [];
  return picked.map((v) => optionLabel(field, v)).join(", ");
}

const ANSWER_FORMATTERS: Partial<
  Record<FormField["type"], (field: FormField, value: unknown) => string>
> = {
  rating: (field, value) => `${Number(value)}/${field.ratingScale ?? 5}`,
  singleSelect: (field, value) => truncate(optionLabel(field, value), 42),
  multiSelect: (field, value) => truncate(multiSelectLabels(field, value), 42),
  consent: (_field, value) =>
    value === true || value === "true" ? "yes" : "no",
  videoUpload: () => "attached",
  audioUpload: () => "attached",
  imageUpload: () => "attached",
  fileUpload: () => "attached",
};

export function formatAnswer(field: FormField, value: unknown): string {
  if (isBlankAnswer(value)) return "—";
  const format = ANSWER_FORMATTERS[field.type];
  return format ? format(field, value) : truncate(String(value), 42);
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
                ▸
              </span>
              <span className="trm-key">{truncate(f.label, 34)}</span>
              <span className="trm-val">
                {formatAnswer(f, ctrl.answers[f.id])}
              </span>
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

/** Text-entry targets keep their digits; the shortcuts stand down. */
export function isTypingTarget(target: HTMLInputElement): boolean {
  if (target.tagName === "TEXTAREA") return true;
  return (
    target.tagName === "INPUT" &&
    target.type !== "radio" &&
    target.type !== "checkbox"
  );
}

/** The option a digit key addresses, or null when the key isn't one. */
export function digitOption(
  options: NonNullable<FormField["options"]>,
  key: string,
): { value: string; label: string } | null {
  const n = Number(key);
  const addressable = Number.isInteger(n) && n >= 1 && n <= options.length;
  return addressable ? options[n - 1]! : null;
}

/** The next answer after a keycap press: replace for single, toggle for multi. */
export function nextSelectValue(
  field: FormField,
  current: unknown,
  value: string,
): string | string[] {
  if (field.type === "singleSelect") return value;
  const cur = Array.isArray(current) ? (current as string[]) : [];
  return cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
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
        {variant === "success" ? "▸ response recorded ✓" : "▸ form closed"}
      </p>
      <p className="trm-moment-text">
        {variant === "success"
          ? snapshot.content.successMessage
          : snapshot.content.closedMessage}
      </p>
    </div>
  );
}

function SessionCount({
  ctrl,
  closed,
  done,
}: {
  ctrl: FormController;
  closed: boolean;
  done: boolean;
}) {
  return (
    <span className="trm-count" aria-hidden="true">
      {closed
        ? "[closed]"
        : done
          ? "[done]"
          : ctrl.isStepped
            ? `[${ctrl.step + 1}/${ctrl.totalSteps}]`
            : "[1/1]"}
    </span>
  );
}

function TitleBar({
  snapshot,
  ctrl,
  closed,
  done,
}: {
  snapshot: PublicSnapshot;
  ctrl: FormController;
  closed: boolean;
  done: boolean;
}) {
  return (
    <header className="trm-bar">
      <span className="trm-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <LogoMark snapshot={snapshot} />
      <span className="trm-path">~/{snapshot.slug ?? "feedback"}</span>
      <SessionCount ctrl={ctrl} closed={closed} done={done} />
    </header>
  );
}

function KeyHint({ selectField }: { selectField: FormField | null }) {
  return (
    <p className="trm-hint" aria-hidden="true">
      <kbd>↵</kbd> enter to continue
      {selectField ? (
        <>
          {" · "}
          <kbd>1</kbd>–<kbd>{selectField.options!.length}</kbd> select
        </>
      ) : null}
    </p>
  );
}

/** The live session: title, transcript of answers, and the ask at the caret. */
function Session({
  snapshot,
  ctrl,
  preview,
  selectField,
}: {
  snapshot: PublicSnapshot;
  ctrl: FormController;
  preview: boolean;
  selectField: FormField | null;
}) {
  return (
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
        <div className="trm-ask" key={ctrl.isStepped ? ctrl.step : "all"}>
          {ctrl.isStepped && ctrl.currentStep ? (
            <StepFields step={ctrl.currentStep} ctrl={ctrl} autoFocus />
          ) : (
            ctrl.steps.map((step) => (
              <StepFields key={step.fields[0]!.id} step={step} ctrl={ctrl} />
            ))
          )}
        </div>
        <KeyHint selectField={selectField} />
        <StagedControls snapshot={snapshot} ctrl={ctrl} nextLabel="Enter" />
      </FlowForm>
    </>
  );
}

/** Digit keys operate select options — the keyboard is the instrument. */
function digitKeyHandler(
  ctrl: FormController,
  selectField: FormField | null,
): (e: KeyboardEvent<HTMLDivElement>) => void {
  return (e) => {
    if (!selectField?.options) return;
    if (isTypingTarget(e.target as HTMLInputElement)) return;
    const opt = digitOption(selectField.options, e.key);
    if (!opt) return;
    ctrl.setAnswer(
      selectField.id,
      nextSelectValue(selectField, ctrl.answers[selectField.id], opt.value),
    );
    e.preventDefault();
  };
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
  // The dotted progress line under the title bar — full once the session ends.
  const progressPct = done || closed ? 100 : Math.round(ctrl.progress * 100);
  const onKeyDown = digitKeyHandler(ctrl, selectField);

  return (
    <div className="trm-field" data-trm-surface={surface}>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- digit shortcuts augment (never replace) the radio/checkbox controls inside */}
      <section className="trm-panel" onKeyDown={onKeyDown}>
        <TitleBar snapshot={snapshot} ctrl={ctrl} closed={closed} done={done} />
        <div className="trm-progress" aria-hidden="true">
          <span
            className="trm-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="trm-body">
          {live ? (
            <Session
              snapshot={snapshot}
              ctrl={ctrl}
              preview={preview}
              selectField={selectField}
            />
          ) : (
            <Moment
              variant={closed ? "closed" : "success"}
              snapshot={snapshot}
            />
          )}
        </div>
      </section>
      <PackAttribution snapshot={snapshot} />
    </div>
  );
}

function TerminalLoader({ logoUrl, name }: TemplateLoaderProps) {
  return (
    <div
      className="tf-loader trm-loader"
      role="status"
      aria-label="Loading form"
    >
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
