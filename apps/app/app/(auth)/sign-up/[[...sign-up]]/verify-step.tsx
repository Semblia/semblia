"use client";

import { useEffect, useRef } from "react";
import { Envelope as Mail } from "@phosphor-icons/react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { AuthPrimaryBtn } from "@/components/auth/auth-primary-btn";
import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthBackBtn } from "@/components/auth/auth-back-btn";

interface VerifyStepProps {
  email: string;
  otp: string;
  setOtp: (v: string) => void;
  loading: boolean;
  error: string | null;
  resendCooldown: boolean;
  resendTimer: number;
  onSubmit: (e: React.FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
}

export function VerifyStep({
  email,
  otp,
  setOtp,
  loading,
  error,
  resendCooldown,
  resendTimer,
  onSubmit,
  onResend,
  onBack,
}: VerifyStepProps) {
  const hasAutoSubmitted = useRef(false);

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !loading && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      const syntheticEvent = {
        preventDefault: () => {},
      } as React.FormEvent;
      onSubmit(syntheticEvent);
    }
    if (otp.length < 6) {
      hasAutoSubmitted.current = false;
    }
  }, [otp, loading, onSubmit]);

  return (
    <>
      <AuthBackBtn onClick={onBack} className="mb-8" />

      <div className="mb-7">
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand/10">
          <Mail className="size-5 text-brand" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Check your inbox
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2.5">
          <label className="text-[13px] font-medium text-foreground">
            Verification code
          </label>
          <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className="size-11 text-base" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <AuthNotice error={error} />
        <AuthPrimaryBtn
          type="submit"
          loading={loading}
          loadingLabel="Verifying…"
          disabled={loading || otp.length !== 6}
        >
          Verify email
        </AuthPrimaryBtn>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        Didn&apos;t receive it?{" "}
        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown}
          className="text-foreground font-medium hover:text-brand transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendCooldown ? (
            <span className="tabular-nums">Resend in {resendTimer}s</span>
          ) : (
            "Resend code"
          )}
        </button>
      </p>
    </>
  );
}
