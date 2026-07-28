"use client";

/**
 * Security — password, two-factor, and active sessions.
 *
 * Composition only. Each section is a settings fieldset that owns its own data
 * state, so one failing (Clerk not resolving a user, a sessions call failing)
 * replaces that section alone instead of the page. Previously every section
 * drew a second bordered box inside its fieldset and wrote its own loading
 * ladder; both now come from the shared system.
 */

import { PageHeader, PageBody } from "@/components/shared";
import { PasswordSection } from "@/components/account/password-section";
import { MfaSection } from "@/components/account/mfa-section";
import { SessionsList } from "@/components/account/sessions-list";

export default function SecurityPage() {
  return (
    <>
      <PageHeader title="Security" />
      <PageBody padding="default" className="space-y-8">
        <PasswordSection />
        <MfaSection />
        <SessionsList />
      </PageBody>
    </>
  );
}
