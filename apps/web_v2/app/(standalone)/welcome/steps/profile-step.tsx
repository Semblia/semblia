"use client";

import * as React from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { AuthField } from "@/components/auth/auth-field";
import { AuthPrimaryBtn } from "@/components/auth/auth-primary-btn";
import { StepFrame } from "../_step-frame";
import { ROLE_OPTIONS } from "./constants";

interface ProfileStepProps {
  firstName: string;
  lastName: string;
  role: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setRole: (v: string) => void;
  loading: boolean;
  onContinue: () => void;
}

export function ProfileStep({
  firstName,
  lastName,
  role,
  setFirstName,
  setLastName,
  setRole,
  loading,
  onContinue,
}: ProfileStepProps) {
  const firstNameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!firstName.trim()) firstNameRef.current?.focus();
    }, 250);
    return () => clearTimeout(t);
  }, [firstName]);

  const greeting = firstName.trim()
    ? `Welcome, ${firstName.trim().split(/\s+/)[0]}.`
    : "Welcome to Semblia.";

  return (
    <StepFrame
      title={greeting}
      description="Your name appears on the work you share and helps teammates recognize you."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onContinue();
        }}
        className="space-y-5"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <AuthField
            id="onboard-firstname"
            label="First name"
            value={firstName}
            onChange={setFirstName}
            placeholder="Ada"
            required
            autoComplete="given-name"
            inputRef={firstNameRef}
          />
          <AuthField
            id="onboard-lastname"
            label="Last name"
            value={lastName}
            onChange={setLastName}
            placeholder="Lovelace"
            autoComplete="family-name"
          />
        </div>

        {/* Optional role — captured as profile.jobTitle to tailor defaults later */}
        <div className="space-y-2">
          <span className="text-[13px] font-medium text-foreground">
            Your role{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_OPTIONS.map((r) => {
              const selected = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setRole(selected ? "" : r)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[12.5px] font-medium transition-colors duration-150",
                    selected
                      ? "border-foreground/30 bg-foreground/[0.04] text-foreground"
                      : "border-border/70 bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                  )}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <AuthPrimaryBtn
          type="submit"
          loading={loading}
          loadingLabel="Saving…"
          disabled={!firstName.trim() || loading}
        >
          Continue
          <ArrowRight className="size-4" />
        </AuthPrimaryBtn>
      </form>
    </StepFrame>
  );
}
