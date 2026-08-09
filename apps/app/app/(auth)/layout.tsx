import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthRail } from "@/components/auth/auth-rail";

/**
 * Auth frame. A header-less two-pane shell shared with onboarding: a quiet
 * context rail beside a centered form. The same frame carries through to
 * `/welcome`, so signing in and setting up feel like one continuous flow.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell rail={<AuthRail />}>{children}</AuthShell>;
}
