"use client";

import { ArrowRight, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { AuthField } from "@/components/auth/auth-field";
import { AuthPrimaryBtn } from "@/components/auth/auth-primary-btn";
import { StepFrame, StepSkipButton } from "../_step-frame";
import { INTENT_OPTIONS, stepDescriptor } from "./constants";

interface IntentStepProps {
  intents: string[];
  intentOther: string;
  setIntents: (v: string[]) => void;
  setIntentOther: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}

const descriptor = stepDescriptor("intent");

export function IntentStep({
  intents,
  intentOther,
  setIntents,
  setIntentOther,
  onContinue,
  onSkip,
}: IntentStepProps) {
  function toggle(id: string) {
    setIntents(
      intents.includes(id) ? intents.filter((x) => x !== id) : [...intents, id],
    );
  }

  const hasOther = intents.includes("other");
  const isValid = intents.length > 0 && (!hasOther || intentOther.trim());

  return (
    <StepFrame
      ordinal={descriptor.ordinal}
      title={
        <>
          Where will Semblia
          <br />
          earn its keep?
        </>
      }
      description="Pick everything that applies. We'll prioritize the right surfaces and copy for what you're trying to do."
    >
      <div role="group" aria-label="Use cases" className="mb-5">
        <ul className="space-y-1.5">
          {INTENT_OPTIONS.map(({ id, label, hint, Icon }) => {
            const selected = intents.includes(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => toggle(id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-150",
                    selected
                      ? "border-brand/40 bg-brand/[0.05] shadow-[0_0_0_1px_var(--color-brand)/20]"
                      : "border-border/70 hover:border-foreground/18 hover:bg-muted/40",
                  )}
                >
                  {/* Icon */}
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
                      selected
                        ? "bg-brand/15 text-brand"
                        : "bg-muted text-muted-foreground group-hover:text-foreground",
                    )}
                    aria-hidden
                  >
                    <Icon className="size-3.5" weight="bold" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-[13px] font-medium leading-tight transition-colors duration-150",
                        selected ? "text-foreground" : "text-foreground/85",
                      )}
                    >
                      {label}
                    </p>
                    {hint && (
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground/75">
                        {hint}
                      </p>
                    )}
                  </div>
                  {/* Amber checkbox indicator */}
                  <span
                    className={cn(
                      "ml-auto flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded border-2 transition-[colors,transform] duration-150",
                      selected
                        ? "scale-105 border-brand bg-brand text-[oklch(0.98_0.008_75)]"
                        : "border-border bg-card",
                    )}
                    aria-hidden
                  >
                    {selected && <Check className="size-2.5" weight="bold" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {hasOther && (
        <div className="auth-notice-in mb-5">
          <AuthField
            id="onboard-intent-other"
            label="What's the goal?"
            value={intentOther}
            onChange={setIntentOther}
            placeholder="A few words about what you're after…"
          />
        </div>
      )}

      <AuthPrimaryBtn onClick={onContinue} disabled={!isValid}>
        Continue
        <ArrowRight className="size-4" />
      </AuthPrimaryBtn>

      <StepSkipButton onClick={onSkip} />
    </StepFrame>
  );
}
