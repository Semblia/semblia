"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Envelope as Mail, ShieldCheck } from "@phosphor-icons/react";
import { errMsg } from "@/components/auth/clerk-error";
import { homePath, signInPath } from "@/lib/routes";
import { useAnimatedStep } from "@/hooks/use-animated-step";
import { AuthField } from "@/components/auth/auth-field";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { AuthPrimaryBtn } from "@/components/auth/auth-primary-btn";
import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthBackBtn } from "@/components/auth/auth-back-btn";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Step = "email" | "code" | "newPassword" | "success";

export function ForgotPasswordForm() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const { activeStep, isLeaving, direction, go, isFirstRender } =
    useAnimatedStep<Step>("email");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const busy = loading || fetchStatus === "fetching";

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  function validateEmail(value: string): boolean {
    if (!value.trim()) {
      setEmailError("Email is required.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Enter a valid email address.");
      return false;
    }
    setEmailError(null);
    return true;
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!validateEmail(email)) return;

    setLoading(true);
    setError(null);

    // Step 1: Create sign-in attempt with identifier
    const { error: createErr } = await signIn.create({
      identifier: email,
    });
    if (createErr) {
      setError(errMsg(createErr));
      setLoading(false);
      return;
    }

    // Step 2: Send password reset email code
    const { error: sendErr } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendErr) {
      setError(errMsg(sendErr));
      setLoading(false);
      return;
    }

    setLoading(false);
    go("code", "forward");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy || code.length !== 6) return;
    setLoading(true);
    setError(null);

    const { error: verifyErr } = await signIn.resetPasswordEmailCode.verifyCode(
      {
        code,
      },
    );
    if (verifyErr) {
      setError(errMsg(verifyErr));
      setLoading(false);
      return;
    }

    setLoading(false);
    // Clerk automatically transitions signIn.status to "needs_new_password"
    if (signIn.status === "needs_new_password") {
      go("newPassword", "forward");
    } else {
      setError("Unexpected state. Please try again.");
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !password.trim()) return;
    setLoading(true);
    setError(null);

    const { error: resetErr } =
      await signIn.resetPasswordEmailCode.submitPassword({
        password,
      });
    if (resetErr) {
      setError(errMsg(resetErr));
      setLoading(false);
      return;
    }

    if (signIn.status === "complete") {
      const { error: finalErr } = await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            return;
          }
          go("success", "forward");
          // Redirect after a short delay to show success
          setTimeout(() => {
            const url = decorateUrl(homePath());
            if (url.startsWith("http")) window.location.href = url;
            else router.push(url);
          }, 2000);
        },
      });
      if (finalErr) {
        setError(errMsg(finalErr));
        setLoading(false);
      }
    } else {
      setError("Password reset incomplete. Please try again.");
      setLoading(false);
    }
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
      {activeStep === "email" && (
        <>
          <AuthBackBtn
            onClick={() => router.push(signInPath())}
            label="Back to sign in"
            className="mb-7"
          />

          <div className="mb-7">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Reset your password
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
              Enter the email associated with your account. We&apos;ll send a
              verification code to reset your password.
            </p>
          </div>

          <form onSubmit={handleSendCode} noValidate className="space-y-4">
            <AuthField
              id="forgot-email"
              label="Email"
              type="email"
              value={email}
              onChange={(v) => {
                setEmail(v);
                if (emailError) validateEmail(v);
              }}
              placeholder="you@company.com"
              autoComplete="email"
              required
              inputRef={emailRef}
              error={emailError ?? undefined}
            />
            <AuthNotice error={error} />
            <AuthPrimaryBtn
              type="submit"
              loading={loading}
              loadingLabel="Sending code…"
              disabled={busy}
            >
              Send reset code
            </AuthPrimaryBtn>
          </form>
        </>
      )}

      {activeStep === "code" && (
        <>
          <AuthBackBtn
            onClick={() => {
              setError(null);
              setCode("");
              go("email", "back");
            }}
            className="mb-7"
          />

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

          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div className="space-y-2.5">
              <label className="text-[13px] font-medium text-foreground">
                Verification code
              </label>
              <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="size-11 text-base"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <AuthNotice error={error} />
            <AuthPrimaryBtn
              type="submit"
              loading={loading}
              loadingLabel="Verifying…"
              disabled={busy || code.length !== 6}
            >
              Verify code
            </AuthPrimaryBtn>
          </form>
        </>
      )}

      {activeStep === "newPassword" && (
        <>
          <div className="mb-7">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand/10">
              <ShieldCheck className="size-5 text-brand" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Set a new password
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
              Choose a strong password for your account.
            </p>
          </div>

          <form onSubmit={handleResetPassword} noValidate className="space-y-4">
            <AuthPasswordField
              id="forgot-new-password"
              label="New password"
              value={password}
              onChange={setPassword}
              showPwd={showPwd}
              onToggleShow={() => setShowPwd((v) => !v)}
              autoComplete="new-password"
              required
              showStrength
              placeholder="Min. 8 characters"
            />
            <AuthNotice error={error} />
            <AuthPrimaryBtn
              type="submit"
              loading={loading}
              loadingLabel="Resetting…"
              disabled={busy || !password.trim()}
            >
              Reset password
            </AuthPrimaryBtn>
          </form>
        </>
      )}

      {activeStep === "success" && (
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="check-pop flex size-14 items-center justify-center rounded-full bg-success/10">
              <ShieldCheck className="size-7 text-success" weight="fill" />
            </div>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Password reset complete
          </h1>
          <p className="mt-2 mx-auto text-[14px] text-muted-foreground leading-relaxed max-w-[320px]">
            Your password has been updated. Redirecting you to your projects…
          </p>
          <Link
            href={homePath()}
            className="mt-6 inline-block text-[13px] text-brand font-medium hover:underline"
          >
            Go to projects
          </Link>
        </div>
      )}
    </div>
  );
}
