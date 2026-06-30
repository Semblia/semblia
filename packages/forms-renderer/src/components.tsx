import type { ReactNode } from "react";
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

function CheckIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points="5,14 10,20 21,7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 11V7a4 4 0 018 0v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type StatusVariant = "thankyou" | "closed";

const STATUS_VARIANTS: Record<
  StatusVariant,
  {
    containerClass: string;
    messageClass: string;
    title: string;
    icon: ReactNode;
    message: (content: FormContent) => ReactNode;
  }
> = {
  thankyou: {
    containerClass: "tf-thankyou",
    messageClass: "tf-thankyou-message",
    title: "All done",
    icon: <CheckIcon />,
    message: (content) => content.successMessage,
  },
  closed: {
    containerClass: "tf-closed",
    messageClass: "tf-closed-message",
    title: "Form closed",
    icon: <LockIcon />,
    message: (content) => content.closedMessage,
  },
};

/**
 * One terminal "status" screen for both the success and closed states; the
 * renderer selects the variant. A single component (rather than two near-
 * identical wrappers) is what keeps this DRY.
 */
export function StatusNotice({
  variant,
  content,
}: {
  variant: StatusVariant;
  content: FormContent;
}) {
  const v = STATUS_VARIANTS[variant];
  return (
    <div className={v.containerClass} role="status">
      <div className="tf-thankyou-icon">{v.icon}</div>
      <p className="tf-thankyou-title">{v.title}</p>
      <p className={v.messageClass}>{v.message(content)}</p>
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
