"use client";

import * as React from "react";
import type { StudioQuestion } from "@/lib/collect/studio-types";
import { validateQuestion } from "./validation";
import { useFormContext } from "./form-context";
import { Field } from "./fields";
import { SubmitButton } from "./submit-button";

/* ─── Shared types ────────────────────────────────────────────────────────── */

interface FlowProps {
  questions: StudioQuestion[]; // already filtered by showIf + sorted
  stickyProgress?: boolean;
}

/* ─── Progress bar ────────────────────────────────────────────────────────── */

function ProgressBar({
  current,
  total,
  sticky,
}: {
  current: number;
  total: number;
  sticky?: boolean;
}) {
  const pct = total > 0 ? Math.min(((current + 1) / total) * 100, 100) : 0;
  return (
    <div
      style={
        sticky
          ? {
              position: "sticky",
              top: 0,
              zIndex: 10,
              marginBottom: "var(--f-flow-gap)",
              paddingTop: 4,
              // Uses --f-sticky-bg set by container (surface in boxed, bg elsewhere)
              background: "var(--f-sticky-bg, var(--f-bg))",
            }
          : { marginBottom: "var(--f-flow-gap)" }
      }
    >
      <div
        style={{
          height: 3,
          background: "var(--f-line-30)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "var(--f-accent)",
            borderRadius: 999,
            transition: "width .35s ease",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Nav button ──────────────────────────────────────────────────────────── */

function NavBtn({
  onClick,
  disabled,
  children,
  secondary,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "var(--f-font-body)",
        fontSize: "var(--f-size-sm)",
        fontWeight: secondary ? 400 : 600,
        color: secondary
          ? disabled
            ? "var(--f-ink-soft-30)"
            : "var(--f-ink-soft)"
          : "var(--f-accent)",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        padding: "var(--f-label-gap) 0",
        opacity: disabled ? 0.4 : 1,
        transition: "opacity .15s",
      }}
    >
      {children}
    </button>
  );
}

/* ─── Auto-advance question types ─────────────────────────────────────────── */

const AUTO_ADVANCE_TYPES: StudioQuestion["type"][] = [
  "stars",
  "nps",
  "emoji",
  "radio",
  "dropdown",
];

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

/* ─── FlowStepped — one question per step ─────────────────────────────────── */

export function FlowStepped({ questions, stickyProgress }: FlowProps) {
  const { step, goNext, goBack } = useFormContext();
  const total = questions.length;
  const current = questions[step];
  const isLast = step >= total - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--f-flow-gap)" }}>
      <ProgressBar current={step} total={total} sticky={stickyProgress} />

      <div
        key={current?.id ?? step}
        style={{
          minHeight: "calc(var(--f-size-base) * 7)",
          animation: "step-fade-in .25s ease-out",
        }}
      >
        {current && <Field key={current.id} question={current} />}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "var(--f-label-gap)",
        }}
      >
        <NavBtn onClick={goBack} disabled={step === 0} secondary>
          ← Back
        </NavBtn>

        {isLast ? (
          <SubmitButton />
        ) : (
          <NavBtn onClick={() => goNext()}>Next →</NavBtn>
        )}
      </div>

      <p
        style={{
          textAlign: "center",
          fontFamily: "var(--f-font-mono)",
          fontSize: "var(--f-size-xs)",
          color: "var(--f-ink-soft-50)",
          margin: 0,
        }}
      >
        {step + 1} / {total}
      </p>
    </div>
  );
}

/* ─── FlowCards — stacked card visual ────────────────────────────────────── */

export function FlowCards({ questions, stickyProgress }: FlowProps) {
  const { step, goNext, goBack } = useFormContext();
  const total = questions.length;
  const isLast = step >= total - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--f-flow-gap)" }}>
      <ProgressBar current={step} total={total} sticky={stickyProgress} />

      {/* Card stack — top 3 cards shown */}
      <div style={{ position: "relative", minHeight: "calc(var(--f-size-base) * 12)" }}>
        {questions.slice(step, step + 3).map((q, i) => (
          <div
            key={q.id}
            style={{
              position: i === 0 ? "relative" : "absolute",
              inset: i === 0
                ? undefined
                : `calc(${i} * var(--f-gap) * 0.3) calc(${i} * var(--f-gap) * -0.15) auto`,
              zIndex: 10 - i,
              background: "var(--f-surface)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--f-line-30)",
              borderRadius: "var(--f-radius)",
              padding: "var(--f-container-pad-y) var(--f-container-pad-x)",
              opacity: i === 0 ? 1 : 0.55 - i * 0.15,
              transform: `scale(${1 - i * 0.03})`,
              transformOrigin: "top center",
              transition: "all .3s ease",
              boxShadow: i === 0 ? "var(--f-shadow)" : "none",
              pointerEvents: i === 0 ? "auto" : "none",
            }}
          >
            {i === 0 && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "var(--f-flow-gap)" }}
              >
                <Field question={q} />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {step > 0 ? (
                    <NavBtn onClick={goBack} secondary>
                      ← Back
                    </NavBtn>
                  ) : (
                    <span />
                  )}
                  {isLast ? (
                    <SubmitButton />
                  ) : (
                    <NavBtn onClick={() => goNext()}>Next →</NavBtn>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        {questions.map((_, i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: i === step ? "var(--f-accent)" : "var(--f-line-50)",
              transition: "background .2s",
            }}
          />
        ))}
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

  // Auto-advance for single-select types when a value is set
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

  // Scroll to bottom when a new question is revealed
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
          <div
            key={q.id}
            style={{
              opacity: 1,
              transition: "opacity .3s ease",
            }}
          >
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
