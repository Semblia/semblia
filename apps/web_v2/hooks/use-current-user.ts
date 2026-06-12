"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type {
  V2OnboardingDataDTO,
  V2OnboardingStep,
  V2UserDTO,
} from "@workspace/types";
import {
  completeOnboarding,
  fetchCurrentUser,
  updateCurrentUser,
  updateOnboardingProgress,
} from "@/lib/semblia-api";
import { queryKeys } from "@/hooks/api";

interface CurrentUserQueryOptions {
  freshOnMount?: boolean;
}

const ACCOUNT_RECONCILING_CODE = "ACCOUNT_RECONCILING";
const ACCOUNT_RECONCILIATION_MAX_RETRIES = 3;
const ACCOUNT_RECONCILIATION_DEFAULT_RETRY_MS = 2_000;
const ACCOUNT_RECONCILIATION_MAX_RETRY_MS = 10_000;

export function useCurrentUser(options?: CurrentUserQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery<V2UserDTO>({
    queryKey: queryKeys.currentUser,
    queryFn: async () => {
      const token = await getToken();
      return fetchCurrentUser(token);
    },
    enabled: isSignedIn === true,
    retry: shouldRetryCurrentUserQuery,
    retryDelay: getCurrentUserRetryDelay,
    staleTime: options?.freshOnMount ? 0 : 5 * 60 * 1000,
    refetchOnMount: options?.freshOnMount ? "always" : undefined,
  });
}

export function shouldRetryCurrentUserQuery(
  failureCount: number,
  error: unknown,
) {
  return (
    failureCount < ACCOUNT_RECONCILIATION_MAX_RETRIES &&
    isAccountReconciliationPendingError(error)
  );
}

export function getCurrentUserRetryDelay(
  _retryAttempt: number,
  error: unknown,
) {
  const details = getAccountReconciliationDetails(error);
  const retryAfterMs =
    typeof details?.retryAfterMs === "number"
      ? details.retryAfterMs
      : ACCOUNT_RECONCILIATION_DEFAULT_RETRY_MS;

  return Math.min(
    Math.max(retryAfterMs, ACCOUNT_RECONCILIATION_DEFAULT_RETRY_MS),
    ACCOUNT_RECONCILIATION_MAX_RETRY_MS,
  );
}

export function isAccountReconciliationPendingError(error: unknown) {
  const errorRecord = asRecord(error);
  const status = errorRecord ? errorRecord.status : undefined;
  const details = getAccountReconciliationDetails(error);

  return status === 503 && details?.code === ACCOUNT_RECONCILING_CODE;
}

function getAccountReconciliationDetails(error: unknown) {
  const errorRecord = asRecord(error);
  const body = asRecord(errorRecord?.body);
  const nestedError = asRecord(body?.error);
  const details = asRecord(nestedError?.details ?? body?.details);
  return details;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function useUpdateCurrentUser() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      firstName?: string | null;
      lastName?: string | null;
      avatar?: string | null;
    }) => {
      const token = await getToken();
      return updateCurrentUser(token, body);
    },
    onSuccess: (user) => {
      qc.setQueryData(queryKeys.currentUser, user);
    },
  });
}

export function useUpdateOnboardingProgress() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      step: Exclude<V2OnboardingStep, "COMPLETED">;
      data?: V2OnboardingDataDTO;
    }) => {
      const token = await getToken();
      return updateOnboardingProgress(token, body);
    },
    onSuccess: (user) => {
      qc.setQueryData(queryKeys.currentUser, user);
    },
  });
}

export function useCompleteOnboarding() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return completeOnboarding(token);
    },
    onSuccess: (user) => {
      qc.setQueryData(queryKeys.currentUser, user);
    },
  });
}
