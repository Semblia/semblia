import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import type { PublicSnapshot } from "@workspace/forms-core";
import {
  Attribution,
  Honeypot,
  ProgressBar,
  StatusNotice,
} from "./components.js";
import { buildFormStylesheet, rootDataAttributes } from "./css.js";
import { FieldControl } from "./fields.js";
import type { FormRendererProps } from "./types.js";
import {
  useFormController,
  type FormController,
} from "./use-form-controller.js";

function Header({ snapshot }: { snapshot: PublicSnapshot }) {
  const { assets, content } = snapshot;
  if (!assets.logoUrl && !content.title && !content.description) return null;
  return (
    <div className="tf-header">
      {assets.logoUrl ? (
        <img className="tf-logo" src={assets.logoUrl} alt="" />
      ) : null}
      {content.title ? <h1 className="tf-title">{content.title}</h1> : null}
      {content.description ? (
        <p className="tf-description">{content.description}</p>
      ) : null}
    </div>
  );
}

function SubmitButton({
  ctrl,
  label,
}: {
  ctrl: FormController;
  label: string;
}) {
  const submitting = ctrl.submitState === "submitting";
  return (
    <button
      type="submit"
      className="tf-btn tf-btn-primary"
      disabled={submitting}
    >
      {submitting ? "Submitting…" : label}
    </button>
  );
}

function SinglePageBody({
  snapshot,
  ctrl,
  preview,
}: {
  snapshot: PublicSnapshot;
  ctrl: FormController;
  preview: boolean;
}) {
  return (
    <form
      className="tf-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        ctrl.submit();
      }}
    >
      {snapshot.content.introText ? (
        <p className="tf-intro">{snapshot.content.introText}</p>
      ) : null}
      <div className="tf-fields">
        {ctrl.visibleFields.map((field) => (
          <FieldControl
            key={field.id}
            field={field}
            value={ctrl.answers[field.id]}
            error={ctrl.errors[field.id]}
            onChange={(v) => ctrl.setAnswer(field.id, v)}
          />
        ))}
      </div>
      {!preview ? (
        <Honeypot value={ctrl.honeypot} onChange={ctrl.setHoneypot} />
      ) : null}
      <div className="tf-actions">
        <SubmitButton ctrl={ctrl} label={snapshot.content.submitButtonText} />
      </div>
      {ctrl.errorMessage ? (
        <p className="tf-error" role="alert">
          {ctrl.errorMessage}
        </p>
      ) : null}
      <Attribution show={snapshot.settings.attribution} />
    </form>
  );
}

function SteppedBody({
  snapshot,
  ctrl,
  preview,
}: {
  snapshot: PublicSnapshot;
  ctrl: FormController;
  preview: boolean;
}) {
  const field = ctrl.currentField;
  const autoAdvance = snapshot.flow.autoAdvance && !ctrl.isLastStep;
  return (
    <div className="tf-form">
      {snapshot.flow.progressIndicator ? (
        <ProgressBar
          progress={ctrl.progress}
          step={ctrl.step}
          totalSteps={ctrl.totalSteps}
        />
      ) : null}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (ctrl.isLastStep) ctrl.submit();
          else ctrl.next();
        }}
      >
        {field ? (
          <FieldControl
            key={field.id}
            field={field}
            value={ctrl.answers[field.id]}
            error={ctrl.errors[field.id]}
            onChange={(v) => ctrl.setAnswer(field.id, v)}
            onCommit={
              autoAdvance && field.type === "rating" ? ctrl.advance : undefined
            }
            autoFocus
          />
        ) : null}
        {!preview ? (
          <Honeypot value={ctrl.honeypot} onChange={ctrl.setHoneypot} />
        ) : null}
        <div className="tf-actions">
          {ctrl.step > 0 ? (
            <button
              type="button"
              className="tf-btn tf-btn-ghost"
              onClick={ctrl.back}
            >
              Back
            </button>
          ) : null}
          {ctrl.isLastStep ? (
            <SubmitButton
              ctrl={ctrl}
              label={snapshot.content.submitButtonText}
            />
          ) : (
            <button type="submit" className="tf-btn tf-btn-primary">
              Next
            </button>
          )}
        </div>
        {ctrl.errorMessage ? (
          <p className="tf-error" role="alert">
            {ctrl.errorMessage}
          </p>
        ) : null}
      </form>
      <Attribution show={snapshot.settings.attribution} />
    </div>
  );
}

/** Arrange the header + interactive body according to the layout preset. */
function LayoutShell({
  snapshot,
  header,
  body,
}: {
  snapshot: PublicSnapshot;
  header: ReactNode;
  body: ReactNode;
}) {
  switch (snapshot.layoutPreset) {
    case "splitHero":
      return (
        <div className="tf-shell">
          <div className="tf-hero">{header}</div>
          <div className="tf-form-pane">
            <div className="tf-shell-inner">
              <div className="tf-card">{body}</div>
            </div>
          </div>
        </div>
      );
    case "fullPage":
      return (
        <div className="tf-shell">
          {header}
          <div className="tf-card">{body}</div>
        </div>
      );
    case "oneQuestion":
      return (
        <div className="tf-shell">
          {header}
          {body}
        </div>
      );
    case "centeredCard":
    default:
      return (
        <div className="tf-shell">
          {header}
          <div className="tf-card">{body}</div>
        </div>
      );
  }
}

/**
 * The single React renderer for a published (or preview) snapshot. The same
 * component backs the dashboard preview, hosted pages (via renderFormToString),
 * iframe embeds, and native injection — it never cares about the snapshot's
 * origin (spec §27).
 */
export function FormRenderer({
  snapshot,
  onSubmit,
  mode = "live",
  forcedScheme,
  initialAnswers,
  forceClosed,
  className,
}: FormRendererProps) {
  const ctrl = useFormController({ snapshot, initialAnswers, onSubmit, mode });
  const css = useMemo(() => buildFormStylesheet(snapshot), [snapshot]);
  const scheme = forcedScheme ?? snapshot.design.mode;
  const rootAttrs = rootDataAttributes(snapshot, scheme);
  const preview = mode === "preview";
  const closed = forceClosed || snapshot.status !== "published";

  // Honor the studio's "redirect" success action on live submissions. The
  // thank-you notice below still renders as the fallback while navigating
  // (and for previews, which never leave the page). `redirectUrl` is
  // schema-validated as http(s), so it can't carry a javascript: URL.
  const { successAction, redirectUrl } = snapshot.content;
  useEffect(() => {
    if (preview || ctrl.submitState !== "success") return;
    if (successAction === "redirect" && redirectUrl) {
      window.location.assign(redirectUrl);
    }
  }, [preview, ctrl.submitState, successAction, redirectUrl]);

  let inner: ReactNode;
  if (closed)
    inner = <StatusNotice variant="closed" content={snapshot.content} />;
  else if (ctrl.submitState === "success")
    inner = <StatusNotice variant="thankyou" content={snapshot.content} />;
  else if (ctrl.isStepped)
    inner = <SteppedBody snapshot={snapshot} ctrl={ctrl} preview={preview} />;
  else
    inner = (
      <SinglePageBody snapshot={snapshot} ctrl={ctrl} preview={preview} />
    );

  return (
    <div
      className={className ? `tf-root ${className}` : "tf-root"}
      {...rootAttrs}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="tf-page">
        <LayoutShell
          snapshot={snapshot}
          header={<Header snapshot={snapshot} />}
          body={inner}
        />
      </div>
    </div>
  );
}
