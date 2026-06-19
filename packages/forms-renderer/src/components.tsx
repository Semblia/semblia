import type { FormContent } from "@workspace/forms-core";

export function ProgressBar({
  progress,
  step,
  totalSteps,
}: {
  progress: number;
  step: number;
  totalSteps: number;
}) {
  return (
    <div>
      <div className="tf-step-count">
        Step {Math.min(step + 1, totalSteps)} of {totalSteps}
      </div>
      <div
        className="tf-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        aria-valuenow={Math.min(step + 1, totalSteps)}
      >
        <div
          className="tf-progress-bar"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function ThankYou({ content }: { content: FormContent }) {
  return (
    <div className="tf-thankyou" role="status">
      <div className="tf-thankyou-icon" aria-hidden="true">
        ✓
      </div>
      <p className="tf-thankyou-title">All done</p>
      <p className="tf-thankyou-message">{content.successMessage}</p>
    </div>
  );
}

export function ClosedNotice({ content }: { content: FormContent }) {
  return (
    <div className="tf-closed" role="status">
      <p className="tf-thankyou-title">Form closed</p>
      <p className="tf-closed-message">{content.closedMessage}</p>
    </div>
  );
}

export function Attribution({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="tf-attribution">
      Powered by{" "}
      <a href="https://semblia.com" target="_blank" rel="noopener noreferrer">
        Semblia
      </a>
    </p>
  );
}

/**
 * An off-screen text input. Real users never see or fill it; an automated bot
 * that fills every field trips it, so the API can reject the submission.
 */
export function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="tf-hp" aria-hidden="true">
      <label>
        Leave this field empty
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
