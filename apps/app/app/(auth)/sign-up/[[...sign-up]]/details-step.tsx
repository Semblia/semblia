"use client";

import Link from "next/link";
import { AuthField } from "@/components/auth/auth-field";
import { legalPrivacyPath, legalTermsPath, signInPath } from "@/lib/routes";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { AuthPrimaryBtn } from "@/components/auth/auth-primary-btn";
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthCheckbox } from "@/components/auth/auth-checkbox";

interface DetailsStepProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPwd: boolean;
  setShowPwd: (v: boolean) => void;
  agreedToTerms: boolean;
  setAgreedToTerms: (v: boolean) => void;
  loading: boolean;
  busy: boolean;
  error: string | null;
  oauthLoading: "google" | "github" | null;
  emailRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (e: React.FormEvent) => void;
  onOAuth: (strategy: "oauth_google" | "oauth_github") => void;
}

export function DetailsStep({
  email,
  setEmail,
  password,
  setPassword,
  showPwd,
  setShowPwd,
  agreedToTerms,
  setAgreedToTerms,
  loading,
  busy,
  error,
  oauthLoading,
  emailRef,
  onSubmit,
  onOAuth,
}: DetailsStepProps) {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
          Start collecting testimonials in minutes.
        </p>
      </div>

      <AuthSocialButtons
        onGoogle={() => onOAuth("oauth_google")}
        onGithub={() => onOAuth("oauth_github")}
        loadingProvider={oauthLoading}
        disabled={busy}
      />

      <AuthDivider />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <AuthField
          id="signup-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="ada@company.com"
          autoComplete="email"
          required
          inputRef={emailRef}
        />
        <AuthPasswordField
          id="signup-password"
          value={password}
          onChange={setPassword}
          showPwd={showPwd}
          onToggleShow={() => setShowPwd(!showPwd)}
          autoComplete="new-password"
          required
          showStrength
          placeholder="Min. 8 characters"
        />

        <AuthCheckbox
          id="signup-terms"
          checked={agreedToTerms}
          onChange={setAgreedToTerms}
        >
          I agree to the{" "}
          <Link
            href={legalTermsPath()}
            target="_blank"
            className="underline underline-offset-2 text-foreground hover:text-brand transition-colors"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href={legalPrivacyPath()}
            target="_blank"
            className="underline underline-offset-2 text-foreground hover:text-brand transition-colors"
          >
            Privacy Policy
          </Link>
        </AuthCheckbox>

        <AuthNotice error={error} />
        <AuthPrimaryBtn
          type="submit"
          loading={loading}
          loadingLabel="Creating account…"
          disabled={busy || !agreedToTerms}
        >
          Create account
        </AuthPrimaryBtn>
      </form>

      <div id="clerk-captcha" />

      <p className="mt-5 text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={signInPath()}
          className="text-foreground font-medium hover:text-brand transition-colors duration-150"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
