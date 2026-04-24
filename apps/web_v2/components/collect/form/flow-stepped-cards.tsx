"use client";

import * as React from "react";
import { useFormContext } from "./form-context";
import { Field } from "./fields";
import { SubmitButton } from "./submit-button";
import { ProgressBar, NavBtn, type FlowProps } from "./flow-primitives";

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
