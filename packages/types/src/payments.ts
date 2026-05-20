export type PlanType = "FREE" | "PRO" | "BUSINESS";

export type SubscriptionStatus =
  | "INCOMPLETE"
  | "ACTIVE"
  | "CANCELED"
  | "CANCELLED"
  | "PAST_DUE"
  | "EXPIRED"
  | "PAUSED"
  | "COMPLETED"
  | "TRIALING"
  | (string & {});

export type ProviderSubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "paused"
  | "cancelled"
  | "completed"
  | "expired"
  | (string & {});

export interface ApiSuccessResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}

export interface CreateSubscriptionRequest {
  planId: string;
}

export interface CreateSubscriptionResponseData {
  subscriptionId: string;
  key?: string;
  planName: string;
}

export interface VerifyPaymentRequest {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
  planId: string;
}

export interface PlanLimits {
  projects: number;
  widgets: number;
  testimonials: number;
  [key: string]: number;
}

export interface SubscriptionPlanSummary {
  id: string;
  name: string;
  interval: string;
  price: number;
  limits: PlanLimits;
  type: PlanType;
}

export interface SubscriptionSummary {
  id: string;
  status: SubscriptionStatus;
  providerStatus?: ProviderSubscriptionStatus | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionUsageSummary {
  projects: number;
  widgets: number;
  testimonials: number;
}

export interface SubscriptionDetailsData {
  plan: SubscriptionPlanSummary | null;
  subscription: SubscriptionSummary | null;
  usage: SubscriptionUsageSummary | null;
}
