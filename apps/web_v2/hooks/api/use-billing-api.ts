"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type {
  V2BillingProfileDTO,
  V2SubscriptionDTO,
  V2UserPlan,
} from "@workspace/types";
import {
  cancelSubscription,
  createSubscriptionCheckout,
  fetchBillingProfile,
  fetchBillingUsage,
  fetchInvoicesApi,
  fetchPaymentMethods,
  fetchSubscription,
  switchSubscriptionPlan,
  updateBillingProfile,
} from "@/lib/semblia-api";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export const billingQueryKeys = {
  subscription: ["account", "subscription"] as const,
  invoices: ["account", "invoices"] as const,
  paymentMethods: ["account", "payment-methods"] as const,
  profile: ["account", "billing-profile"] as const,
  usage: ["account", "usage"] as const,
};

export function useSubscription(options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: billingQueryKeys.subscription,
    queryFn: async () => {
      const token = await getToken();
      return fetchSubscription(token);
    },
    enabled: isSignedIn === true,
    ...liveQueryOptions(options),
  });
}

export function useInvoices(options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: billingQueryKeys.invoices,
    queryFn: async () => {
      const token = await getToken();
      return fetchInvoicesApi(token);
    },
    enabled: isSignedIn === true,
    ...liveQueryOptions(options),
  });
}

export function usePaymentMethods(options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: billingQueryKeys.paymentMethods,
    queryFn: async () => {
      const token = await getToken();
      return fetchPaymentMethods(token);
    },
    enabled: isSignedIn === true,
    ...liveQueryOptions(options),
  });
}

export function useBillingProfile(options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: billingQueryKeys.profile,
    queryFn: async () => {
      const token = await getToken();
      return fetchBillingProfile(token);
    },
    enabled: isSignedIn === true,
    ...liveQueryOptions(options),
  });
}

export function useBillingUsage(options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: billingQueryKeys.usage,
    queryFn: async () => {
      const token = await getToken();
      return fetchBillingUsage(token);
    },
    enabled: isSignedIn === true,
    ...liveQueryOptions(options),
  });
}

export function useCancelSubscription() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return cancelSubscription(token);
    },
    onSuccess: (updated: V2SubscriptionDTO) => {
      qc.setQueryData(billingQueryKeys.subscription, updated);
    },
  });
}

export function useSwitchPlan() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (planId: V2UserPlan) => {
      const token = await getToken();
      return switchSubscriptionPlan(token, planId);
    },
    onSuccess: (updated: V2SubscriptionDTO) => {
      qc.setQueryData(billingQueryKeys.subscription, updated);
      qc.invalidateQueries({ queryKey: billingQueryKeys.usage });
    },
  });
}

export function useCreateCheckoutSession() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (planId: V2UserPlan) => {
      const token = await getToken();
      return createSubscriptionCheckout(token, planId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingQueryKeys.subscription });
    },
  });
}

export function useUpdateBillingProfile() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: Partial<V2BillingProfileDTO>) => {
      const token = await getToken();
      return updateBillingProfile(token, body);
    },
    onSuccess: (profile: V2BillingProfileDTO) => {
      qc.setQueryData(billingQueryKeys.profile, profile);
    },
  });
}
