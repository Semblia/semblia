// TODO: This route is currently dark (new signups go to /projects directly).
// Re-enable by wiring: User.onboardingCompletedAt (prisma migration),
// GET /v2/me exposes it, POST /v2/me/onboarding/complete sets it,
// and (app)/layout.tsx redirects here when onboardingCompletedAt is null.
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useAnimatedStep } from "@/hooks/use-animated-step";

import type { OnboardStep } from "./steps/constants";
import { ProfileStep } from "./steps/profile-step";
import { ReferralStep } from "./steps/referral-step";
import { IntentStep } from "./steps/intent-step";
import { ProjectStep } from "./steps/project-step";
import { CollectionStep } from "./steps/collection-step";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "my-project"
  );
}

export function WelcomeFlow() {
  const { user } = useUser();
  const router = useRouter();
  const { activeStep, isLeaving, direction, go, isFirstRender } =
    useAnimatedStep<OnboardStep>("profile", 200);

  // Profile
  const [firstName, setFirstName] = React.useState(user?.firstName ?? "");
  const [lastName, setLastName] = React.useState(user?.lastName ?? "");
  const [jobTitle, setJobTitle] = React.useState("");
  const [profileLoading, setProfileLoading] = React.useState(false);

  // Referral
  const [referralSource, setReferralSource] = React.useState("");
  const [referralOther, setReferralOther] = React.useState("");

  // Intent
  const [intents, setIntents] = React.useState<string[]>([]);
  const [intentOther, setIntentOther] = React.useState("");

  // Project
  const [projectName, setProjectName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [collectionUrl, setCollectionUrl] = React.useState("");

  React.useEffect(() => {
    if (user?.firstName && !firstName) setFirstName(user.firstName);
    if (user?.lastName && !lastName) setLastName(user.lastName);
  }, [user?.firstName, user?.lastName]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const done = localStorage.getItem("tresta:onboarding:done");
    if (done === "true") router.replace("/projects");
  }, [router]);

  function handleSkip() {
    localStorage.setItem("tresta:onboarding:done", "true");
    router.push("/projects");
  }

  // ── Step handlers ──

  async function handleSaveProfile() {
    if (!firstName.trim()) return;
    setProfileLoading(true);
    try {
      await user?.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        unsafeMetadata: {
          ...((user?.unsafeMetadata as Record<string, unknown>) ?? {}),
          jobTitle: jobTitle.trim(),
        },
      });
    } catch {
      // Continue — profile can be updated later
    }
    setProfileLoading(false);
    go("referral", "forward");
  }

  function handleReferralContinue() {
    // Save referral to metadata (fire-and-forget)
    try {
      user?.update({
        unsafeMetadata: {
          ...((user?.unsafeMetadata as Record<string, unknown>) ?? {}),
          referralSource,
          referralOther:
            referralSource === "other" ? referralOther.trim() : undefined,
        },
      });
    } catch {
      // Non-critical
    }
    go("intent", "forward");
  }

  function handleIntentContinue() {
    // Save intents to metadata (fire-and-forget)
    try {
      user?.update({
        unsafeMetadata: {
          ...((user?.unsafeMetadata as Record<string, unknown>) ?? {}),
          intents,
          intentOther: intents.includes("other")
            ? intentOther.trim()
            : undefined,
        },
      });
    } catch {
      // Non-critical
    }
    go("project", "forward");
  }

  async function handleCreateProject() {
    if (!projectName.trim() || creating) return;
    setCreating(true);

    // TODO: Replace with actual API call to create project
    await new Promise((r) => setTimeout(r, 800));

    const slug = slugify(projectName);
    setCollectionUrl(`https://collect.tresta.app/${slug}`);
    localStorage.setItem("tresta:onboarding:done", "true");
    setCreating(false);
    go("collection", "forward");
  }

  function handleGoToProject() {
    localStorage.setItem("tresta:onboarding:done", "true");
    router.push("/projects");
  }

  // ── Animation classes ──

  const enterCls = isFirstRender
    ? "onboard-fade-in"
    : direction === "forward"
      ? "onboard-enter-fwd"
      : "onboard-enter-rev";
  const exitCls =
    direction === "forward" ? "onboard-exit-fwd" : "onboard-exit-rev";

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4 py-12">
      <div
        key={activeStep}
        className={cn("w-full max-w-md", isLeaving ? exitCls : enterCls)}
      >
        {activeStep === "profile" && (
          <ProfileStep
            firstName={firstName}
            lastName={lastName}
            jobTitle={jobTitle}
            setFirstName={setFirstName}
            setLastName={setLastName}
            setJobTitle={setJobTitle}
            loading={profileLoading}
            onContinue={handleSaveProfile}
            onSkip={() => go("referral", "forward")}
          />
        )}
        {activeStep === "referral" && (
          <ReferralStep
            referralSource={referralSource}
            referralOther={referralOther}
            setReferralSource={setReferralSource}
            setReferralOther={setReferralOther}
            onContinue={handleReferralContinue}
            onSkip={() => go("intent", "forward")}
          />
        )}
        {activeStep === "intent" && (
          <IntentStep
            intents={intents}
            intentOther={intentOther}
            setIntents={setIntents}
            setIntentOther={setIntentOther}
            onContinue={handleIntentContinue}
            onSkip={() => go("project", "forward")}
          />
        )}
        {activeStep === "project" && (
          <ProjectStep
            projectName={projectName}
            setProjectName={setProjectName}
            loading={creating}
            onContinue={handleCreateProject}
            onSkip={handleSkip}
          />
        )}
        {activeStep === "collection" && (
          <CollectionStep
            projectName={projectName}
            collectionUrl={collectionUrl}
            onGoToProject={handleGoToProject}
          />
        )}
      </div>
    </div>
  );
}
