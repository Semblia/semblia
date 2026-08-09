import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";

export const authInputCls = cn(
  "w-full h-10 px-3.5 rounded-lg border border-input bg-card",
  "text-sm text-foreground placeholder:text-muted-foreground/60",
  "focus:outline-none focus:ring-2 focus:ring-brand/15 focus:border-brand/40",
  "transition-all duration-150",
  "disabled:opacity-50 disabled:cursor-not-allowed",
  "auth-input-focus",
);

interface AuthFieldProps {
  id: string;
  label: string;
  labelRight?: ReactNode;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  maxLength?: number;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  inputClassName?: string;
  error?: string;
  helperText?: string;
}

export function AuthField({
  id,
  label,
  labelRight,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  maxLength,
  disabled,
  inputRef,
  inputClassName,
  error,
  helperText,
}: AuthFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-foreground">
          {label}
        </label>
        {labelRight}
      </div>
      <input
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        maxLength={maxLength}
        disabled={disabled}
        suppressHydrationWarning
        className={cn(
          authInputCls,
          error &&
            "border-destructive/60 focus:ring-destructive/15 focus:border-destructive/50",
          inputClassName,
        )}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
      />
      {error && (
        <p
          id={`${id}-error`}
          className="text-[11px] text-destructive leading-relaxed auth-notice-in"
        >
          {error}
        </p>
      )}
      {!error && helperText && (
        <p
          id={`${id}-helper`}
          className="text-[11px] text-muted-foreground leading-relaxed"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
