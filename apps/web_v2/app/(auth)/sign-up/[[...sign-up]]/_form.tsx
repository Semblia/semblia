"use client";

import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { errMsg } from "@/components/auth/clerk-error";
import { useAnimatedStep } from "@/hooks/use-animated-step";
import { DetailsStep } from "./details-step";
import { VerifyStep } from "./verify-step";

type Step = "details" | "verify";

export function SignUpForm() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const { activeStep, isLeaving, direction, go, isFirstRender } =
    useAnimatedStep<Step>("details");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const busy = loading || !!oauthLoading || fetchStatus === "fetching";

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!resendCooldown) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setResendCooldown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  async function handleDetails(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setLoading(true);
    setError(null);
    const { error: createErr } = await signUp.password({
      emailAddress: email,
      password,
    });
    if (createErr) {
      setError(errMsg(createErr));
      setLoading(false);
      return;
    }
    const { error: sendErr } = await signUp.verifications.sendEmailCode();
    if (sendErr) {
      setError(errMsg(sendErr));
      setLoading(false);
      return;
    }
    setLoading(false);
    go("verify", "forward");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (loading || otp.length !== 6) return;
    setLoading(true);
    setError(null);
    const { error: verifyErr } = await signUp.verifications.verifyEmailCode({
      code: otp,
    });
    if (verifyErr) {
      setError(errMsg(verifyErr));
      setLoading(false);
      return;
    }
    if (signUp.status === "complete") {
      const { error: finalErr } = await signUp.finalize({
        navigate: () => router.push("/projects"),
      });
      if (finalErr) {
        setError(errMsg(finalErr));
        setLoading(false);
      }
    } else {
      setError("Verification incomplete. Please try again.");
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown) return;
    setError(null);
    const { error: sendErr } = await signUp.verifications.sendEmailCode();
    if (sendErr) {
      setError(errMsg(sendErr));
      return;
    }
    setResendTimer(30);
    setResendCooldown(true);
  }

  async function handleOAuth(strategy: "oauth_google" | "oauth_github") {
    if (busy) return;
    const key = strategy === "oauth_google" ? "google" : "github";
    setOauthLoading(key);
    setError(null);
    const { error: ssoErr } = await signUp.sso({
      strategy,
      redirectUrl: "/projects",
      redirectCallbackUrl: `${window.location.origin}/sso-callback`,
    });
    if (ssoErr) {
      setError(errMsg(ssoErr));
      setOauthLoading(null);
    }
  }

  function handleBack() {
    setError(null);
    setOtp("");
    go("details", "back");
  }

  const enterCls = isFirstRender
    ? "auth-form-enter"
    : direction === "forward"
      ? "step-enter-forward"
      : "step-enter-back";
  const exitCls =
    direction === "forward" ? "step-exit-forward" : "step-exit-back";

  return (
    <div
      key={activeStep}
      className={cn("w-full", isLeaving ? exitCls : enterCls)}
    >
      {activeStep === "verify" ? (
        <VerifyStep
          email={email}
          otp={otp}
          setOtp={setOtp}
          loading={loading}
          error={error}
          resendCooldown={resendCooldown}
          resendTimer={resendTimer}
          onSubmit={handleVerify}
          onResend={handleResend}
          onBack={handleBack}
        />
      ) : (
        <DetailsStep
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          showPwd={showPwd}
          setShowPwd={setShowPwd}
          agreedToTerms={agreedToTerms}
          setAgreedToTerms={setAgreedToTerms}
          loading={loading}
          busy={busy}
          error={error}
          oauthLoading={oauthLoading}
          emailRef={emailRef}
          onSubmit={handleDetails}
          onOAuth={handleOAuth}
        />
      )}
    </div>
  );
}
