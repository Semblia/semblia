"use client";

import type { ReactNode, RefObject } from "react";
import {
  Eye,
  EyeSlash as EyeOff,
  CheckCircle as CheckCircle2,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { authInputCls } from "./auth-field";

// ── Password strength ─────────────────────────────────────────────────────────

function passwordStrength(pwd: string): 0 | 1 | 2 | 3 {
  if (pwd.length === 0) return 0;
  if (pwd.length < 8) return 1;
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return 3;
  return 2;
}

const STRENGTH_LABEL = { 1: "Weak", 2: "Fair", 3: "Strong" } as const;
const STRENGTH_COLOR = {
  1: "bg-destructive",
  2: "bg-warning",
  3: "bg-success",
} as const;
const STRENGTH_TEXT_COLOR = {
  1: "text-destructive",
  2: "text-warning",
  3: "text-success",
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

interface AuthPasswordFieldProps {
  id: string;
  label?: string;
  labelRight?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  showPwd: boolean;
  onToggleShow: () => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  showStrength?: boolean;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  error?: string;
}

export function AuthPasswordField({
  id,
  label = "Password",
  labelRight,
  value,
  onChange,
  showPwd,
  onToggleShow,
  placeholder = "••••••••",
  autoComplete = "current-password",
  required,
  showStrength = false,
  disabled,
  inputRef,
  error,
}: AuthPasswordFieldProps) {
  const strength = passwordStrength(value);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-foreground">
          {label}
        </label>
        {labelRight}
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={showPwd ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          suppressHydrationWarning
          className={cn(
            authInputCls,
            "pr-10",
            error &&
              "border-destructive/60 focus:ring-destructive/15 focus:border-destructive/50",
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggleShow}
          aria-label={showPwd ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors p-0.5"
        >
          {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      {error && (
        <p
          id={`${id}-error`}
          className="text-[11px] text-destructive leading-relaxed auth-notice-in"
        >
          {error}
        </p>
      )}

      {showStrength && value.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex gap-1">
            {([1, 2, 3] as const).map((level) => (
              <div
                key={level}
                className={cn(
                  "h-[3px] flex-1 rounded-full transition-all duration-300",
                  strength >= level ? STRENGTH_COLOR[level] : "bg-border",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {strength === 3 && <CheckCircle2 className="size-3 text-success" />}
            <p
              className={cn(
                "text-[11px]",
                strength > 0
                  ? STRENGTH_TEXT_COLOR[strength as 1 | 2 | 3]
                  : "text-muted-foreground",
              )}
            >
              {STRENGTH_LABEL[strength as 1 | 2 | 3]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
