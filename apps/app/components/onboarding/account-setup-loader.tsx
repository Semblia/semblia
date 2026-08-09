"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AccountSetupLoaderProps {
  fullScreen?: boolean;
  title?: string;
  description?: string;
  showSpinner?: boolean;
  role?: "status" | "alert";
  action?: ReactNode;
}

export function AccountSetupLoader({
  fullScreen = false,
  title = "Setting up your account",
  description = "We're syncing your new sign-up. This usually takes a few seconds.",
  showSpinner = true,
  role = "status",
  action,
}: AccountSetupLoaderProps) {
  return (
    <div
      role={role}
      aria-label={title}
      className={cn(
        "flex flex-1 items-center justify-center bg-background px-6 text-center",
        fullScreen && "min-h-svh",
      )}
    >
      <div className="flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
        {showSpinner && <Spinner className="size-5" />}
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm leading-6">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

export function AccountSetupFallback({
  fullScreen = false,
  title = "Account setup is taking longer than expected",
  description = "Your sign-up is complete, but our account setup has not finished yet. Try again in a moment.",
  onRetry,
}: {
  fullScreen?: boolean;
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <AccountSetupLoader
      fullScreen={fullScreen}
      role="alert"
      showSpinner={false}
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            <RefreshCw />
            Try again
          </Button>
        ) : undefined
      }
    />
  );
}
