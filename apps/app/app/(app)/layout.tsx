import * as React from "react";
import { AppShell } from "@/components/nav/app-shell";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <OnboardingGate>{children}</OnboardingGate>
    </AppShell>
  );
}
