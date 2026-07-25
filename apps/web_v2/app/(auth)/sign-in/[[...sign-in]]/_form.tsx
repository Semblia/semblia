"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { errMsg } from "@/components/auth/clerk-error";
import { useAnimatedStep } from "@/hooks/use-animated-step";
import { AuthField } from "@/components/auth/auth-field";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { AuthPrimaryBtn } from "@/components/auth/auth-primary-btn";
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthBackBtn } from "@/components/auth/auth-back-btn";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Step = "email" | "password" | "second-factor";

export function SignInForm() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { activeStep, isLeaving, direction, go, isFirstRender } =
    useAnimatedStep<Step>("email");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Second-factor (MFA) state
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const totpRef = useRef<HTMLInputElement>(null);

  const busy = loading || !!oauthLoading || fetchStatus === "fetching";

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // Focus password / second-factor field when transitioning to those steps
  useEffect(() => {
    if (activeStep === "password") {
      const t = setTimeout(() => passwordRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
    if (activeStep === "second-factor") {
      const t = setTimeout(() => totpRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [activeStep]);

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

  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!validateEmail(email)) return;

    setLoading(true);
    setError(null);

    // Create the sign-in attempt with the identifier to check if user exists
    const { error: createErr } = await signIn.create({
      identifier: email,
    });

    if (createErr) {
      setError(errMsg(createErr));
      setLoading(false);
      return;
    }

    setLoading(false);
    go("password", "forward");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setLoading(true);
    setError(null);

    const { error: pwdErr } = await signIn.password({ password });

    if (pwdErr) {
      setError(errMsg(pwdErr));
      setLoading(false);
      return;
    }

    await resolveStatusAfterFactor();
  }

  // Finalizes a completed sign-in and routes to the app.
  async function finalizeAndNavigate() {
    const { error: finalErr } = await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          return;
        }
        const url = decorateUrl("/");
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
    if (finalErr) {
      setError(errMsg(finalErr));
      setLoading(false);
    }
  }

  // Branches on signIn.status after a factor is submitted (password or MFA).
  async function resolveStatusAfterFactor() {
    if (signIn.status === "complete") {
      await finalizeAndNavigate();
    } else if (
      signIn.status === "needs_second_factor" ||
      signIn.status === "needs_client_trust"
    ) {
      setLoading(false);
      setError(null);
      setCode("");
      setUseBackupCode(false);
      go("second-factor", "forward");
    } else {
      setError("Sign-in step incomplete. Please check your credentials.");
      setLoading(false);
    }
  }

  async function submitSecondFactor() {
    if (busy) return;
    const trimmed = code.trim();
    if (useBackupCode ? trimmed.length < 4 : trimmed.length < 6) return;
    setLoading(true);
    setError(null);

    const { error: mfaErr } = useBackupCode
      ? await signIn.mfa.verifyBackupCode({ code: trimmed })
      : await signIn.mfa.verifyTOTP({ code: trimmed });

    if (mfaErr) {
      setError(
        useBackupCode
          ? "That backup code didn’t match. Try another one."
          : "That code didn’t match. Check your authenticator app and try again.",
      );
      setCode("");
      setLoading(false);
      return;
    }

    await resolveStatusAfterFactor();
  }

  function handleSecondFactorSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitSecondFactor();
  }

  async function handleOAuth(strategy: "oauth_google" | "oauth_github") {
    if (busy) return;
    const key = strategy === "oauth_google" ? "google" : "github";
    setOauthLoading(key);
    setError(null);
    const { error: ssoErr } = await signIn.sso({
      strategy,
      redirectUrl: "/",
      redirectCallbackUrl: `${window.location.origin}/sso-callback`,
    });
    if (ssoErr) {
      setError(errMsg(ssoErr));
      setOauthLoading(null);
    }
  }

  function handleBack() {
    setError(null);
    setPassword("");
    go("email", "back");
  }

  // From the second-factor step, "back" restarts the whole attempt.
  function handleSecondFactorBack() {
    setError(null);
    setPassword("");
    setCode("");
    setUseBackupCode(false);
    go("email", "back");
  }

  function toggleBackupCode() {
    setUseBackupCode((v) => !v);
    setCode("");
    setError(null);
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
      {activeStep === "email" ? (
        <>
          {/* ── Header ── */}
          <div className="mb-8">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
              Sign in to continue to your projects.
            </p>
          </div>

          <AuthSocialButtons
            onGoogle={() => handleOAuth("oauth_google")}
            onGithub={() => handleOAuth("oauth_github")}
            loadingProvider={oauthLoading}
            disabled={busy}
          />

          <AuthDivider />

          <form onSubmit={handleEmailContinue} noValidate className="space-y-4">
            <AuthField
              id="signin-email"
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
              loadingLabel="Continuing…"
              disabled={busy}
            >
              Continue
            </AuthPrimaryBtn>
          </form>

          <p className="mt-7 text-center text-[13px] text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="text-foreground font-medium hover:text-brand transition-colors duration-150"
            >
              Sign up
            </Link>
          </p>
        </>
      ) : activeStep === "password" ? (
        <>
          <AuthBackBtn onClick={handleBack} className="mb-7" />

          <div className="mb-7">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Enter your password
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
              Signing in as{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <form
            onSubmit={handlePasswordSubmit}
            noValidate
            className="space-y-4"
          >
            <AuthPasswordField
              id="signin-password"
              value={password}
              onChange={setPassword}
              showPwd={showPwd}
              onToggleShow={() => setShowPwd((v) => !v)}
              required
              inputRef={passwordRef}
              labelRight={
                <Link
                  href="/forgot-password"
                  tabIndex={-1}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-150"
                >
                  Forgot password?
                </Link>
              }
            />
            <AuthNotice error={error} />
            <AuthPrimaryBtn
              type="submit"
              loading={loading}
              loadingLabel="Signing in…"
              disabled={busy}
            >
              Sign in
            </AuthPrimaryBtn>
          </form>
        </>
      ) : (
        <>
          <AuthBackBtn onClick={handleSecondFactorBack} className="mb-7" />

          <div className="mb-7">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Two-step verification
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
              {useBackupCode
                ? "Enter one of your saved backup codes to finish signing in."
                : "Enter the 6-digit code from your authenticator app."}
            </p>
          </div>

          <form
            onSubmit={handleSecondFactorSubmit}
            noValidate
            className="space-y-4"
          >
            {useBackupCode ? (
              <AuthField
                id="signin-backup-code"
                label="Backup code"
                type="text"
                value={code}
                onChange={setCode}
                placeholder="xxxxxxxx"
                autoComplete="one-time-code"
                required
                inputRef={totpRef}
              />
            ) : (
              <div className="flex justify-center py-1">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  onComplete={() => void submitSecondFactor()}
                  containerClassName="gap-2"
                  autoFocus
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            )}

            <AuthNotice error={error} />

            <AuthPrimaryBtn
              type="submit"
              loading={loading}
              loadingLabel="Verifying…"
              disabled={
                busy ||
                (useBackupCode ? code.trim().length < 4 : code.length < 6)
              }
            >
              Verify
            </AuthPrimaryBtn>
          </form>

          <button
            type="button"
            onClick={toggleBackupCode}
            className="mt-6 block w-full text-center text-[13px] text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            {useBackupCode
              ? "Use your authenticator app instead"
              : "Can’t access your authenticator? Use a backup code"}
          </button>
        </>
      )}
    </div>
  );
}
