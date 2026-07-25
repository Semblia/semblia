"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  isAccountReconciliationPendingError,
  useCurrentUser,
} from "@/hooks/use-current-user";
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import {
  AccountSetupFallback,
  AccountSetupLoader,
} from "@/components/onboarding/account-setup-loader";

const WELCOME_PATH = "/welcome";
const FALLBACK_PATH = "/";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useCurrentUser({ freshOnMount: true });
  const liveState = useLiveQueryState(currentUser, {
    requireFreshOnMount: true,
  });
  const setupRetrying =
    !currentUser.isError &&
    isAccountReconciliationPendingError(currentUser.failureReason);
  const setupRetryExhausted = isAccountReconciliationPendingError(
    currentUser.error,
  );

  React.useEffect(() => {
    const user = currentUser.data;
    if (!user) return;

    const isWelcome = pathname === WELCOME_PATH;
    if (!user.onboardingCompletedAt && !isWelcome) {
      router.replace(WELCOME_PATH);
      return;
    }

    if (user.onboardingCompletedAt && isWelcome) {
      router.replace(FALLBACK_PATH);
    }
  }, [currentUser.data, pathname, router]);

  if (setupRetrying) {
    return <AccountSetupLoader />;
  }

  if (liveState.isWaitingForLiveData) {
    return (
      <AccountSetupLoader
        title="Loading your account"
        description="One moment while we get things ready."
      />
    );
  }

  if (setupRetryExhausted) {
    return <AccountSetupFallback onRetry={() => void currentUser.refetch()} />;
  }

  if (currentUser.isError) {
    return (
      <AccountSetupFallback
        title="Unable to load your account"
        description="Refresh the page in a moment, or try again now."
        onRetry={() => void currentUser.refetch()}
      />
    );
  }

  return <>{children}</>;
}
