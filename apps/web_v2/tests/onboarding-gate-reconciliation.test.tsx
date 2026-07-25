import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { useCurrentUser } from "@/hooks/use-current-user";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace }),
}));

vi.mock("@/hooks/use-current-user", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/hooks/use-current-user")>();
  return {
    ...actual,
    useCurrentUser: vi.fn(),
  };
});

function accountReconcilingError() {
  return {
    status: 503,
    body: {
      success: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Account setup is still in progress",
        details: {
          code: "ACCOUNT_RECONCILING",
          retryAfterMs: 2_000,
        },
      },
    },
  };
}

function mockCurrentUserQuery(overrides: Record<string, unknown>) {
  vi.mocked(useCurrentUser).mockReturnValue({
    data: undefined,
    dataUpdatedAt: 0,
    isFetching: false,
    isPending: false,
    isRefetching: false,
    isError: false,
    error: null,
    failureReason: null,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useCurrentUser>);
}

describe("OnboardingGate account reconciliation fallback", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it("keeps showing setup progress while reconciliation retries are active", () => {
    mockCurrentUserQuery({
      isPending: true,
      failureReason: accountReconcilingError(),
    });

    render(
      <OnboardingGate>
        <div>App content</div>
      </OnboardingGate>,
    );

    expect(
      screen.getByRole("status", { name: "Setting up your account" }),
    ).toBeTruthy();
    expect(screen.queryByText("App content")).toBeNull();
  });

  it("shows a neutral loader while the initial /v2/me fetch resolves for returning users", () => {
    mockCurrentUserQuery({
      isPending: true,
      failureReason: null,
    });

    render(
      <OnboardingGate>
        <div>App content</div>
      </OnboardingGate>,
    );

    expect(
      screen.getByRole("status", { name: "Loading your account" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("status", { name: "Setting up your account" }),
    ).toBeNull();
    expect(screen.queryByText("App content")).toBeNull();
  });

  it("shows a manual retry fallback after reconciliation retries are exhausted", () => {
    const refetch = vi.fn();
    mockCurrentUserQuery({
      isError: true,
      error: accountReconcilingError(),
      failureReason: accountReconcilingError(),
      refetch,
    });

    render(
      <OnboardingGate>
        <div>App content</div>
      </OnboardingGate>,
    );

    expect(
      screen.getByRole("alert", {
        name: "Account setup is taking longer than expected",
      }),
    ).toBeTruthy();
    expect(screen.queryByText("App content")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
