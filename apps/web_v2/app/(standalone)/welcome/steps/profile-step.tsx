"use client";

import * as React from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthPrimaryBtn } from "@/components/auth/auth-primary-btn";
import { StepFrame, StepSkipButton } from "../_step-frame";
import { stepDescriptor } from "./constants";

interface ProfileStepProps {
  firstName: string;
  lastName: string;
  jobTitle: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setJobTitle: (v: string) => void;
  loading: boolean;
  onContinue: () => void;
  onSkip: () => void;
}

const descriptor = stepDescriptor("profile");

export function ProfileStep({
  firstName,
  lastName,
  jobTitle,
  setFirstName,
  setLastName,
  setJobTitle,
  loading,
  onContinue,
  onSkip,
}: ProfileStepProps) {
  // Focus the first empty field. If both name fields are pre-filled (Clerk),
  // jump straight to job title — that's the only thing left to learn.
  const firstNameRef = React.useRef<HTMLInputElement>(null);
  const jobTitleRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      const target = !firstName.trim()
        ? firstNameRef.current
        : jobTitleRef.current;
      target?.focus();
    }, 300);
    return () => clearTimeout(t);
  }, [firstName]);

  const greeting = firstName.trim()
    ? `Glad you're here, ${firstName.trim().split(/\s+/)[0]}.`
    : "Glad you're here.";

  return (
    <StepFrame
      ordinal={descriptor.ordinal}
      title={greeting}
      description="A name and a role help us personalize what you see and how teammates recognize your work later."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onContinue();
        }}
        className="space-y-4"
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

        <AuthField
          id="onboard-jobtitle"
          label="What you do"
          value={jobTitle}
          onChange={setJobTitle}
          placeholder="Founder, Product Manager, Marketer…"
          autoComplete="organization-title"
          helperText="Optional. Helps us tune the defaults to your workflow."
          inputRef={jobTitleRef}
        />

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

      <StepSkipButton onClick={onSkip} label="I'll come back to this" />
    </StepFrame>
  );
}
