import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

interface AuthPrimaryBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export function AuthPrimaryBtn({
  loading,
  loadingLabel = "Loading…",
  children,
  disabled,
  className,
  variant = "primary",
  ...props
}: AuthPrimaryBtnProps) {
  const isPrimary = variant === "primary";

  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={cn(
        "w-full h-10 rounded-lg text-sm font-medium",
        "flex items-center justify-center gap-2",
        "transition-[transform,opacity,box-shadow] duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "auth-btn",
        isPrimary
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "bg-card text-foreground border border-border hover:bg-muted/70",
        className,
      )}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
