"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { AuthField } from "@/components/auth/auth-field";
import { AuthPrimaryBtn } from "@/components/auth/auth-primary-btn";
import { StepFrame, StepSkipButton } from "../_step-frame";
import { REFERRAL_SOURCES, stepDescriptor } from "./constants";

interface ReferralStepProps {
  referralSource: string;
  referralOther: string;
  setReferralSource: (v: string) => void;
  setReferralOther: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}

const descriptor = stepDescriptor("referral");

export function ReferralStep({
  referralSource,
  referralOther,
  setReferralSource,
  setReferralOther,
  onContinue,
  onSkip,
}: ReferralStepProps) {
  const isValid =
    referralSource && (referralSource !== "other" || referralOther.trim());

  return (
    <StepFrame
      ordinal={descriptor.ordinal}
      title="How did you find us?"
      description="An honest answer helps us spend our time where you found us."
    >
      <div role="radiogroup" aria-label="Referral source" className="mb-5">
        <ul className="space-y-1.5">
          {REFERRAL_SOURCES.map(({ id, label, hint, Icon }) => {
            const selected = referralSource === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setReferralSource(id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-150",
                    selected
                      ? "border-brand/40 bg-brand/[0.05] shadow-[0_0_0_1px_var(--color-brand)/20]"
                      : "border-border/70 hover:border-foreground/18 hover:bg-muted/40",
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
                  {/* Amber dot indicator */}
                  <span
                    className={cn(
                      "ml-auto h-[15px] w-[15px] shrink-0 rounded-full border-2 transition-[colors,transform] duration-150",
                      selected
                        ? "border-brand bg-brand scale-105"
                        : "border-border bg-card",
                    )}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {referralSource === "other" && (
        <div className="auth-notice-in mb-5">
          <AuthField
            id="onboard-referral-other"
            label="Where exactly?"
            value={referralOther}
            onChange={setReferralOther}
            placeholder="A friend, a podcast, a particular ad…"
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
