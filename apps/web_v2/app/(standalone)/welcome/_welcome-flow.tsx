"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import type {
  V2OnboardingDataDTO,
  V2OnboardingStep,
  V2UserDTO,
} from "@workspace/types";
import { cn } from "@/lib/utils";
import {
  getProjectCollectionUrl,
  slugifyProjectName,
} from "@/lib/project-utils";
import { useAnimatedStep } from "@/hooks/use-animated-step";
import { useCreateProject } from "@/hooks/api";
import {
  useCompleteOnboarding,
  useCurrentUser,
  useUpdateCurrentUser,
  useUpdateOnboardingProgress,
} from "@/hooks/use-current-user";

import { WelcomeShell } from "./_welcome-shell";
import type { OnboardStep } from "./steps/constants";
import { ProfileStep } from "./steps/profile-step";
import { ReferralStep } from "./steps/referral-step";
import { IntentStep } from "./steps/intent-step";
import { ProjectStep } from "./steps/project-step";
import { CollectionStep } from "./steps/collection-step";

/**
 * Orchestrates the five-step welcome flow.
 *
 * Responsibilities:
 *   - Loads the current user; redirects elsewhere when onboarding is already
 *     complete (this page lives in `(standalone)`, outside the OnboardingGate
 *     in `(app)/layout.tsx`, so we own the redirect for the completed case).
 *   - Resumes from the user's stored `onboardingStep`.
 *   - Persists each step's progress through `PATCH /v2/me/onboarding`, then
 *     creates the first project on step four and finalizes via
 *     `POST /v2/me/onboarding/complete` on the final step.
 */
export function WelcomeFlow() {
  const router = useRouter();
  const currentUser = useCurrentUser();

  // Already-completed users shouldn't see this page.
  React.useEffect(() => {
    if (currentUser.data?.onboardingCompletedAt) {
      router.replace("/projects");
    }
  }, [currentUser.data?.onboardingCompletedAt, router]);

  if (currentUser.isLoading && !currentUser.data) {
    return <WelcomeLoading />;
  }

  if (currentUser.data?.onboardingCompletedAt) {
    return <WelcomeLoading />;
  }

  return <WelcomeFlowInner currentUser={currentUser.data} />;
}

function WelcomeFlowInner({ currentUser }: { currentUser?: V2UserDTO }) {
  const router = useRouter();
  const updateUser = useUpdateCurrentUser();
  const updateOnboarding = useUpdateOnboardingProgress();
  const createProject = useCreateProject();
  const completeOnboarding = useCompleteOnboarding();
  const onboardingData = currentUser?.onboardingData ?? null;
  const initialStep = apiStepToUi(currentUser?.onboardingStep ?? "PROFILE");
  const { activeStep, isLeaving, direction, go, isFirstRender } =
    useAnimatedStep<OnboardStep>(initialStep, 200);

  // Profile — pre-filled from Clerk-backed user record where possible.
  const [firstName, setFirstName] = React.useState(
    currentUser?.firstName ?? onboardingData?.profile?.firstName ?? "",
  );
  const [lastName, setLastName] = React.useState(
    currentUser?.lastName ?? onboardingData?.profile?.lastName ?? "",
  );
  const [jobTitle, setJobTitle] = React.useState(
    onboardingData?.profile?.jobTitle ?? "",
  );
  const [profileLoading, setProfileLoading] = React.useState(false);

  // Referral
  const [referralSource, setReferralSource] = React.useState(
    onboardingData?.referral?.source ?? "",
  );
  const [referralOther, setReferralOther] = React.useState(
    onboardingData?.referral?.other ?? "",
  );

  // Intent
  const [intents, setIntents] = React.useState<string[]>(
    onboardingData?.intent?.intents ?? [],
  );
  const [intentOther, setIntentOther] = React.useState(
    onboardingData?.intent?.other ?? "",
  );

  // Project
  const [projectName, setProjectName] = React.useState(
    onboardingData?.project?.name ?? "",
  );
  const [projectSlug, setProjectSlug] = React.useState(
    onboardingData?.project?.slug ?? "",
  );
  const [collectionUrl, setCollectionUrl] = React.useState(
    onboardingData?.project?.collectionUrl ?? "",
  );

  // ── Step handlers ──

  async function handleSaveProfile() {
    if (!firstName.trim()) return;
    setProfileLoading(true);
    try {
      await updateUser.mutateAsync({
        firstName: cleanText(firstName),
        lastName: cleanText(lastName) ?? null,
      });
      await saveProgress("REFERRAL", {
        profile: {
          firstName: cleanText(firstName),
          lastName: cleanText(lastName),
          jobTitle: cleanText(jobTitle),
        },
      });
      go("referral", "forward");
    } catch {
      toast.error("Couldn't save your setup progress.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleReferralContinue() {
    try {
      await saveProgress("INTENT", {
        referral: {
          source: cleanText(referralSource),
          other:
            referralSource === "other" ? cleanText(referralOther) : undefined,
        },
      });
      go("intent", "forward");
    } catch {
      toast.error("Couldn't save your setup progress.");
    }
  }

  async function handleIntentContinue() {
    try {
      await saveProgress("PROJECT", {
        intent: {
          intents,
          other: intents.includes("other") ? cleanText(intentOther) : undefined,
        },
      });
      go("project", "forward");
    } catch {
      toast.error("Couldn't save your setup progress.");
    }
  }

  async function handleCreateProject() {
    const name = cleanText(projectName);
    if (!name || createProject.isPending) return;

    try {
      const project = await createProject.mutateAsync({
        name,
        slug: slugifyProjectName(name),
      });
      const url = getProjectCollectionUrl(project);
      setProjectName(project.name);
      setProjectSlug(project.slug);
      setCollectionUrl(url);
      await saveProgress("COLLECTION", {
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
          collectionUrl: url,
        },
      });
      go("collection", "forward");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't create that project."));
    }
  }

  async function handleSkipProject() {
    try {
      await completeOnboarding.mutateAsync();
    } catch {
      toast.error("Couldn't save your setup progress.");
      return;
    }
    router.push("/projects");
  }

  async function handleGoToProject() {
    try {
      await completeOnboarding.mutateAsync();
    } catch {
      toast.error("Couldn't finish setup.");
      return;
    }

    router.push(projectSlug ? `/projects/${projectSlug}` : "/projects");
  }

  function handleSkipTo(nextStep: OnboardStep) {
    const apiStep = uiStepToApi(nextStep);
    saveProgress(apiStep)
      .catch(() => toast.error("Couldn't save your setup progress."))
      .finally(() => go(nextStep, "forward"));
  }

  // Map each step to the one before it (used by back button + rail clicks).
  const PREV_STEP: Partial<Record<OnboardStep, OnboardStep>> = {
    referral: "profile",
    intent: "referral",
    project: "intent",
    collection: "project",
  };

  function handleGoBack() {
    const prev = PREV_STEP[activeStep];
    if (prev) go(prev, "back");
  }

  function handleGoTo(step: OnboardStep) {
    go(step, "back");
  }

  function saveProgress(
    step: Exclude<V2OnboardingStep, "COMPLETED">,
    data?: V2OnboardingDataDTO,
  ) {
    return updateOnboarding.mutateAsync({
      step,
      data,
    });
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
    <WelcomeShell
      current={activeStep}
      onBack={PREV_STEP[activeStep] ? handleGoBack : undefined}
      onStepClick={handleGoTo}
    >
      <div
        key={activeStep}
        className={cn("w-full", isLeaving ? exitCls : enterCls)}
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
            onSkip={() => handleSkipTo("referral")}
          />
        )}
        {activeStep === "referral" && (
          <ReferralStep
            referralSource={referralSource}
            referralOther={referralOther}
            setReferralSource={setReferralSource}
            setReferralOther={setReferralOther}
            onContinue={handleReferralContinue}
            onSkip={() => handleSkipTo("intent")}
          />
        )}
        {activeStep === "intent" && (
          <IntentStep
            intents={intents}
            intentOther={intentOther}
            setIntents={setIntents}
            setIntentOther={setIntentOther}
            onContinue={handleIntentContinue}
            onSkip={() => handleSkipTo("project")}
          />
        )}
        {activeStep === "project" && (
          <ProjectStep
            projectName={projectName}
            setProjectName={setProjectName}
            loading={createProject.isPending}
            onContinue={handleCreateProject}
            onSkip={handleSkipProject}
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
    </WelcomeShell>
  );
}

function WelcomeLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
      <CircleNotch className="size-5 animate-spin" aria-label="Loading setup" />
    </div>
  );
}

function apiStepToUi(step: V2OnboardingStep): OnboardStep {
  switch (step) {
    case "PROFILE":
      return "profile";
    case "REFERRAL":
      return "referral";
    case "INTENT":
      return "intent";
    case "PROJECT":
      return "project";
    case "COLLECTION":
    case "COMPLETED":
      return "collection";
  }
}

function uiStepToApi(
  step: OnboardStep,
): Exclude<V2OnboardingStep, "COMPLETED"> {
  switch (step) {
    case "profile":
      return "PROFILE";
    case "referral":
      return "REFERRAL";
    case "intent":
      return "INTENT";
    case "project":
      return "PROJECT";
    case "collection":
      return "COLLECTION";
  }
}

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
