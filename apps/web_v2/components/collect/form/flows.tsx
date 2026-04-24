"use client";

import * as React from "react";
import { validateQuestion } from "./validation";
import { useFormContext } from "./form-context";
import { Field } from "./fields";
import { SubmitButton } from "./submit-button";
import {
  AUTO_ADVANCE_TYPES,
  type FlowProps,
} from "./flow-primitives";
import { FlowStepped, FlowCards } from "./flow-stepped-cards";

/* ─── FlowAll — everything on one page ───────────────────────────────────── */

export function FlowAll({ questions }: FlowProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--f-gap)",
      }}
    >
      {questions.map((q) => (
        <Field key={q.id} question={q} />
      ))}
      <div style={{ paddingTop: "var(--f-label-gap)" }}>
        <SubmitButton />
      </div>
    </div>
  );
}

/* ─── FlowConvo — progressive reveal ─────────────────────────────────────── */

export function FlowConvo({ questions }: FlowProps) {
  const { values } = useFormContext();
  const [revealed, setRevealed] = React.useState(1);
  const shown = questions.slice(0, revealed);
  const isComplete = revealed >= questions.length;
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const tryRevealNext = React.useCallback(
    (qId: string) => {
      const q = questions.find((q) => q.id === qId);
      if (!q) return;
      const err = validateQuestion(q, values[qId]);
      if (err) return;
      setRevealed((r) => Math.min(r + 1, questions.length));
    },
    [questions, values],
  );

  const prevValues = React.useRef<typeof values>({});
  React.useEffect(() => {
    const lastShown = shown[shown.length - 1];
    if (!lastShown) return;
    if (!AUTO_ADVANCE_TYPES.includes(lastShown.type)) return;
    const prev = prevValues.current[lastShown.id];
    const curr = values[lastShown.id];
    if (curr !== prev && curr !== null && curr !== undefined) {
      const timer = setTimeout(() => {
        tryRevealNext(lastShown.id);
      }, 400);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  React.useEffect(() => {
    prevValues.current = values;
  });

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [revealed]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "calc(var(--f-gap) * 1.4)",
      }}
    >
      {shown.map((q, i) => {
        const isLast = i === shown.length - 1;
        const canContinue = isLast && !isComplete;
        return (
          <div key={q.id} style={{ opacity: 1, transition: "opacity .3s ease" }}>
            <Field question={q} />
            {canContinue && !AUTO_ADVANCE_TYPES.includes(q.type) && (
              <button
                type="button"
                onClick={() => tryRevealNext(q.id)}
                style={{
                  display: "block",
                  marginTop: "var(--f-label-gap)",
                  fontFamily: "var(--f-font-body)",
                  fontSize: "var(--f-size-sm)",
                  fontWeight: 600,
                  color: "var(--f-accent)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Continue ↓
              </button>
            )}
          </div>
        );
      })}

      {isComplete && (
        <div style={{ marginTop: "var(--f-label-gap)" }}>
          <SubmitButton />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

/* ─── Flow dispatcher ─────────────────────────────────────────────────────── */

interface FlowRendererProps extends FlowProps {
  flow: "all" | "stepped" | "cards" | "conversational";
}

export function Flow({ flow, questions, stickyProgress }: FlowRendererProps) {
  switch (flow) {
    case "stepped":
      return (
        <FlowStepped questions={questions} stickyProgress={stickyProgress} />
      );
    case "cards":
      return (
        <FlowCards questions={questions} stickyProgress={stickyProgress} />
      );
    case "conversational":
      return <FlowConvo questions={questions} />;
    default:
      return <FlowAll questions={questions} />;
  }
}
