"use client";

import { ArrowRight, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { AuthField } from "@/components/auth/auth-field";
import { AuthPrimaryBtn } from "@/components/auth/auth-primary-btn";
import { StepFrame, StepSkipButton } from "../_step-frame";
import { INTENT_OPTIONS, REFERRAL_SOURCES } from "./constants";

interface GoalsStepProps {
  intents: string[];
  intentOther: string;
  referralSource: string;
  referralOther: string;
  setIntents: (v: string[]) => void;
  setIntentOther: (v: string) => void;
  setReferralSource: (v: string) => void;
  setReferralOther: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}

/**
 * Combined "goals" step. Intent is the primary, functional signal — it's what
 * lets us tailor the new project's defaults. Referral is a small, optional
 * secondary (attribution). Both persist together so the user reaches their
 * project in fewer steps.
 */
export function GoalsStep({
  intents,
  intentOther,
  referralSource,
  referralOther,
  setIntents,
  setIntentOther,
  setReferralSource,
  setReferralOther,
  onContinue,
  onSkip,
}: GoalsStepProps) {
  function toggleIntent(id: string) {
    setIntents(
      intents.includes(id) ? intents.filter((x) => x !== id) : [...intents, id],
    );
  }

  const hasOtherIntent = intents.includes("other");
  const hasOtherReferral = referralSource === "other";
  const isValid =
    intents.length > 0 && (!hasOtherIntent || intentOther.trim().length > 0);

  return (
    <StepFrame
      title="What brings you to Semblia?"
      description="Pick what you'll use it for — we'll tailor your project's defaults to match."
    >
      {/* ── Primary: intent (functional) ── */}
      <div role="group" aria-label="Use cases">
        <ul className="space-y-1.5">
          {INTENT_OPTIONS.map(({ id, label, hint, Icon }) => {
            const selected = intents.includes(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => toggleIntent(id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-left transition-colors duration-150",
                    selected
                      ? "border-brand/40 bg-brand/[0.04]"
                      : "border-border/70 hover:border-foreground/20 hover:bg-muted/40",
                  )}
                >
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
                  <span
                    className={cn(
                      "ml-auto flex size-[15px] shrink-0 items-center justify-center rounded border-2 transition-colors duration-150",
                      selected
                        ? "border-brand bg-brand text-brand-foreground"
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

        {hasOtherIntent && (
          <div className="auth-notice-in mt-2.5">
            <AuthField
              id="onboard-intent-other"
              label="What's the goal?"
              value={intentOther}
              onChange={setIntentOther}
              placeholder="A few words about what you're after…"
            />
          </div>
        )}
      </div>

      {/* ── Secondary: referral (optional, attribution) ── */}
      <div className="mt-6 border-t border-border/60 pt-5">
        <p className="text-[13px] font-medium text-foreground">
          How did you hear about us?{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {REFERRAL_SOURCES.map(({ id, label }) => {
            const selected = referralSource === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setReferralSource(selected ? "" : id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[12.5px] font-medium transition-colors duration-150",
                  selected
                    ? "border-foreground/30 bg-foreground/[0.04] text-foreground"
                    : "border-border/70 bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {hasOtherReferral && (
          <div className="auth-notice-in mt-2.5">
            <AuthField
              id="onboard-referral-other"
              label="Where exactly?"
              value={referralOther}
              onChange={setReferralOther}
              placeholder="A friend, a podcast, a particular ad…"
            />
          </div>
        )}
      </div>

      <AuthPrimaryBtn onClick={onContinue} disabled={!isValid} className="mt-6">
        Continue
        <ArrowRight className="size-4" />
      </AuthPrimaryBtn>

      <StepSkipButton onClick={onSkip} />
    </StepFrame>
  );
}
