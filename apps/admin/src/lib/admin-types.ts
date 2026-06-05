// Local copies of the admin API contract.
// TODO: replace with imports from @workspace/types once A3 publishes shared schemas.

export interface AdminMe {
  id: string;
  email: string;
  isActive: boolean;
  grantedAt: string;
  lastLoginAt: string | null;
}

export interface AdminUser {
  id: string;
  clerkUserId: string;
  email: string;
  isActive: boolean;
  grantedByEmail: string | null;
  grantedAt: string;
  revokedAt: string | null;
  lastLoginAt: string | null;
  notes: string | null;
}

export interface CreateAdminUserBody {
  email: string;
  clerkUserId: string;
  notes?: string;
}

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  adminEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export type PlanType = "FREE" | "PRO" | "BUSINESS";
export type PlanInterval = "monthly" | "yearly";

export interface AdminPlan {
  id: string;
  type: PlanType;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: PlanInterval | string;
  isActive: boolean;
  razorpayPlanId: string | null;
  limits: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanBody {
  type: PlanType;
  name: string;
  description?: string;
  price: number;
  currency: "INR";
  interval: PlanInterval;
  limits: Record<string, number>;
}
