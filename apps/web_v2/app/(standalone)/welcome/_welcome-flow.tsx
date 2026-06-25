"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import {
  isAccountReconciliationPendingError,
  useCompleteOnboarding,
  useCurrentUser,
  useUpdateCurrentUser,
  useUpdateOnboardingProgress,
} from "@/hooks/use-current-user";
import {
  AccountSetupFallback,
  AccountSetupLoader,
} from "@/components/onboarding/account-setup-loader";

import { WelcomeShell } from "./_welcome-shell";
import type { OnboardStep } from "./steps/constants";
import { ProfileStep } from "./steps/profile-step";
import { GoalsStep } from "./steps/goals-step";
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

  // Already-completed users shouldn't see this page.
  React.useEffect(() => {
    if (currentUser.data?.onboardingCompletedAt) {
      router.replace("/projects");
    }
  }, [currentUser.data?.onboardingCompletedAt, router]);

  if (liveState.isWaitingForLiveData || setupRetrying) {
    return <WelcomeLoading />;
  }

  if (setupRetryExhausted) {
    return (
      <WelcomeFallback fullScreen onRetry={() => void currentUser.refetch()} />
    );
  }

  if (currentUser.isError) {
    return (
      <WelcomeFallback
        fullScreen
        title="Unable to load your account"
        description="Refresh the page in a moment, or try again now."
        onRetry={() => void currentUser.refetch()}
      />
    );
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
  // Role — captured as profile.jobTitle (optional), drives tailored defaults later.
  const [role, setRole] = React.useState(
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
      // Cursor → REFERRAL so a resume lands on the combined "goals" screen.
      await saveProgress("REFERRAL", {
        profile: {
          firstName: cleanText(firstName),
          lastName: cleanText(lastName),
          jobTitle: cleanText(role),
        },
      });
      go("goals", "forward");
    } catch {
      toast.error("Couldn't save your setup progress.");
    } finally {
      setProfileLoading(false);
    }
  }

  // Combined "goals" screen — persists referral (attribution) + intent
  // (functional) together, then advances to the project step.
  function goalsData(): V2OnboardingDataDTO {
    return {
      referral: referralSource
        ? {
            source: cleanText(referralSource),
            other:
              referralSource === "other" ? cleanText(referralOther) : undefined,
          }
        : undefined,
      intent: intents.length
        ? {
            intents,
            other: intents.includes("other")
              ? cleanText(intentOther)
              : undefined,
          }
        : undefined,
    };
  }

  async function handleGoalsContinue() {
    try {
      await saveProgress("PROJECT", goalsData());
      go("project", "forward");
    } catch {
      toast.error("Couldn't save your setup progress.");
    }
  }

  function handleSkipGoals() {
    saveProgress("PROJECT", goalsData())
      .catch(() => toast.error("Couldn't save your setup progress."))
      .finally(() => go("project", "forward"));
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

  // Map each step to the one before it (used by the back button).
  const PREV_STEP: Partial<Record<OnboardStep, OnboardStep>> = {
    goals: "profile",
    project: "goals",
  };

  function handleGoBack() {
    const prev = PREV_STEP[activeStep];
    if (prev) go(prev, "back");
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
    >
      <div
        key={activeStep}
        className={cn("w-full", isLeaving ? exitCls : enterCls)}
      >
        {activeStep === "profile" && (
          <ProfileStep
            firstName={firstName}
            lastName={lastName}
            role={role}
            setFirstName={setFirstName}
            setLastName={setLastName}
            setRole={setRole}
            loading={profileLoading}
            onContinue={handleSaveProfile}
          />
        )}
        {activeStep === "goals" && (
          <GoalsStep
            intents={intents}
            intentOther={intentOther}
            referralSource={referralSource}
            referralOther={referralOther}
            setIntents={setIntents}
            setIntentOther={setIntentOther}
            setReferralSource={setReferralSource}
            setReferralOther={setReferralOther}
            onContinue={handleGoalsContinue}
            onSkip={handleSkipGoals}
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

function WelcomeLoading(props: { title?: string; description?: string }) {
  return (
    <AccountSetupLoader
      fullScreen
      title={props.title}
      description={props.description}
    />
  );
}

function WelcomeFallback(props: {
  fullScreen?: boolean;
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return <AccountSetupFallback {...props} />;
}

// Resume mapping: the server still tracks 5 steps, but REFERRAL + INTENT both
// surface as the single combined "goals" screen.
function apiStepToUi(step: V2OnboardingStep): OnboardStep {
  switch (step) {
    case "PROFILE":
      return "profile";
    case "REFERRAL":
    case "INTENT":
      return "goals";
    case "PROJECT":
      return "project";
    case "COLLECTION":
    case "COMPLETED":
      return "collection";
  }
}

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
