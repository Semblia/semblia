"use client";

import * as React from "react";
import { useFormContext } from "./form-context";

interface SubmitButtonProps {
  label?: string;
  /** When true, calls context.submit(); when false, calls goNext(). */
  isFinal?: boolean;
}

export const SubmitButton = React.memo(function SubmitButton({
  label = "Submit",
  isFinal = true,
}: SubmitButtonProps) {
  const { submit, status } = useFormContext();
  const loading = status === "submitting";

  return (
    <button
      type="button"
      disabled={loading}
      onClick={isFinal ? submit : undefined}
      style={{
        fontFamily: "var(--f-font-body)",
        fontSize: "var(--f-size-base)",
        fontWeight: 600,
        padding: "var(--f-btn-pad-y) var(--f-btn-pad-x)",
        borderRadius: "var(--f-btn-radius)",
        cursor: loading ? "wait" : "pointer",
        transition: "all .2s",
        width: "var(--f-btn-width)",
        borderWidth:
          "var(--f-btn-border-w)" as unknown as React.CSSProperties["borderWidth"],
        borderStyle:
          "var(--f-btn-border-s)" as unknown as React.CSSProperties["borderStyle"],
        borderColor:
          "var(--f-btn-border-c)" as unknown as React.CSSProperties["borderColor"],
        textTransform:
          "var(--f-btn-uppercase)" as React.CSSProperties["textTransform"],
        letterSpacing: "var(--f-btn-tracking)",
        backgroundColor: "var(--f-btn-bg)",
        color: "var(--f-btn-color)",
        boxShadow: "var(--f-btn-shadow)",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? "Submitting…" : label}
    </button>
  );
});
