import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  Prisma,
  BillingProfile,
  Invoice,
  PaymentMethod,
  Subscription,
} from "@workspace/database/prisma";
import type {
  V2BillingProfileDTO,
  V2InvoiceDTO,
  V2PaymentMethodDTO,
  V2SubscriptionCheckoutDTO,
  V2SubscriptionDTO,
  V2SubscriptionStatus,
  V2UsageDTO,
  V2UsageLimitDTO,
} from "@workspace/types";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  SwitchSubscriptionBodyDto,
  UpdateBillingProfileBodyDto,
} from "./billing.dto.js";
import { RazorpayService } from "./razorpay.service.js";

type BillingPlan = "FREE" | "PRO" | "BUSINESS";
type PaidBillingPlan = Exclude<BillingPlan, "FREE">;

const ACTIVE_RAZORPAY_SUBSCRIPTION_STATUSES = new Set([
  "created",
  "authenticated",
  "active",
  "pending",
]);

const PLAN_DEFAULTS: Record<
  BillingPlan,
  {
    amount: number;
    currency: "INR";
    interval: "month";
    limits: V2UsageDTO;
  }
> = {
  FREE: {
    amount: 0,
    currency: "INR",
    interval: "month",
    limits: {
      forms: { used: 0, limit: 1 },
      responses: { used: 0, limit: 25 },
      widgets: { used: 0, limit: 1 },
      projects: { used: 0, limit: 1 },
    },
  },
  PRO: {
    amount: 79900,
    currency: "INR",
    interval: "month",
    limits: {
      forms: { used: 0, limit: 10 },
      responses: { used: 0, limit: 1000 },
      widgets: { used: 0, limit: 10 },
      projects: { used: 0, limit: 5 },
    },
  },
  BUSINESS: {
    amount: 249900,
    currency: "INR",
    interval: "month",
    limits: {
      forms: { used: 0, limit: 100 },
      responses: { used: 0, limit: 10000 },
      widgets: { used: 0, limit: 100 },
      projects: { used: 0, limit: 25 },
    },
  },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RazorpayService) private readonly razorpay: RazorpayService,
  ) {}

  async getSubscription(userId: string): Promise<V2SubscriptionDTO> {
    const subscription = await this.getOrCreateSubscription(userId);
    return this.toSubscriptionDto(subscription);
  }

  async createCheckoutSession(
    userId: string,
    body: { planId: BillingPlan },
  ): Promise<V2SubscriptionCheckoutDTO> {
    if (body.planId === "FREE") {
      throw new BadRequestException("FREE plan does not require checkout");
    }

    const razorpayKeyId = this.razorpay.getPublishableKeyId();
    if (!razorpayKeyId) {
      throw new ServiceUnavailableException(
        "Billing provider is not configured",
      );
    }

    const subscription = await this.getOrCreateSubscription(userId);
    if (this.hasActiveProviderSubscription(subscription)) {
      return {
        subscriptionId: subscription.externalSubscriptionId,
        shortUrl: null,
        razorpayKeyId,
        planId: this.toCheckoutPlanId(subscription.plan?.type, body.planId),
      };
    }

    const plan = await this.resolveCheckoutPlan(body.planId);
    const customerId = await this.ensureRazorpayCustomer(userId);
    const providerSubscription = await this.razorpay.createSubscription({
      plan_id: plan.razorpayPlanId,
      customer_id: customerId,
      total_count: 12,
      customer_notify: 1,
      notes: {
        semblia_user_id: userId,
        semblia_plan: body.planId,
      },
    });

    await this.prisma.client.subscription.update({
      where: { userId },
      data: {
        externalSubscriptionId: providerSubscription.id,
        razorpaySubscriptionId: providerSubscription.id,
        providerStatus: providerSubscription.status,
        planId: plan.id,
      },
      select: this.subscriptionSelect(),
    });

    return {
      subscriptionId: providerSubscription.id,
      shortUrl: providerSubscription.short_url ?? null,
      razorpayKeyId,
      planId: body.planId,
    };
  }

  async cancelSubscription(userId: string): Promise<V2SubscriptionDTO> {
    const subscription = await this.getOrCreateSubscription(userId);

    if (subscription.userPlan === "FREE") {
      throw new BadRequestException("FREE plan has no subscription to cancel");
    }

    if (!this.hasActiveProviderSubscription(subscription)) {
      throw new BadRequestException("No active subscription to cancel");
    }

    const providerSubscription = await this.razorpay.cancelSubscription(
      subscription.externalSubscriptionId,
      { cancelAtCycleEnd: true },
    );

    const updated = await this.prisma.client.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
        providerStatus: providerSubscription.status,
      },
      select: this.subscriptionSelect(),
    });

    return this.toSubscriptionDto(updated);
  }

  async switchSubscriptionPlan(
    userId: string,
    body: SwitchSubscriptionBodyDto,
  ): Promise<V2SubscriptionDTO> {
    const subscription = await this.getOrCreateSubscription(userId);

    if (body.planId === "FREE") {
      throw new BadRequestException("Use cancel to downgrade to FREE");
    }

    if (body.planId === subscription.userPlan) {
      throw new BadRequestException("Already on this plan");
    }

    if (
      !subscription.currentPeriodEnd ||
      subscription.currentPeriodEnd.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        "Cannot schedule plan switch without an active period",
      );
    }

    const nextPlan = await this.resolveCheckoutPlan(body.planId);

    if (!subscription.externalCustomerId) {
      throw new ServiceUnavailableException(
        "Missing Razorpay customer for subscription switch",
      );
    }

    if (!this.hasActiveProviderSubscription(subscription)) {
      throw new BadRequestException("No active subscription to switch");
    }

    if (subscription.scheduledRazorpaySubscriptionId) {
      try {
        await this.razorpay.cancelSubscription(
          subscription.scheduledRazorpaySubscriptionId,
          { cancelAtCycleEnd: false },
        );
      } catch (error: unknown) {
        this.logger.warn(
          `Failed to cancel previously scheduled Razorpay subscription ${subscription.scheduledRazorpaySubscriptionId}: ${this.getErrorMessage(error)}`,
        );
      }
    }

    await this.razorpay.cancelSubscription(
      subscription.externalSubscriptionId,
      {
        cancelAtCycleEnd: true,
      },
    );

    const providerSubscription =
      await this.razorpay.createScheduledSubscription({
        plan_id: nextPlan.razorpayPlanId,
        customer_id: subscription.externalCustomerId,
        total_count: 12,
        customer_notify: 1,
        start_at: Math.floor(subscription.currentPeriodEnd.getTime() / 1000),
        notes: {
          semblia_user_id: userId,
          semblia_plan: body.planId,
        },
      });

    const updated = await this.prisma.client.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
        scheduledRazorpaySubscriptionId: providerSubscription.id,
        scheduledPlanId: nextPlan.id,
        scheduledStartAt: subscription.currentPeriodEnd,
      },
      select: this.subscriptionSelect(),
    });

    return this.toSubscriptionDto(updated);
  }

  async listPaymentMethods(userId: string): Promise<V2PaymentMethodDTO[]> {
    const methods = await this.prisma.client.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return methods.map((method) => this.toPaymentMethodDto(method));
  }

  async listInvoices(userId: string): Promise<V2InvoiceDTO[]> {
    const invoices = await this.prisma.client.invoice.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
    });

    return invoices.map((invoice) => this.toInvoiceDto(invoice));
  }

  async getBillingProfile(userId: string): Promise<V2BillingProfileDTO> {
    const profile = await this.prisma.client.billingProfile.upsert({
      where: { userId },
      update: {},
      create: { userId, country: "IN" },
    });

    return this.toBillingProfileDto(profile);
  }

  async updateBillingProfile(
    userId: string,
    body: UpdateBillingProfileBodyDto,
  ): Promise<V2BillingProfileDTO> {
    const profile = await this.prisma.client.billingProfile.upsert({
      where: { userId },
      update: body,
      create: {
        userId,
        country: "IN",
        ...body,
      },
    });

    return this.toBillingProfileDto(profile);
  }

  async getUsage(userId: string): Promise<V2UsageDTO> {
    const subscription = await this.getOrCreateSubscription(userId);
    const plan = await this.resolvePlan(subscription.userPlan as BillingPlan);

    const [projects, widgets, forms, responses] = await Promise.all([
      this.prisma.client.project.count({ where: { userId } }),
      this.prisma.client.widget.count({
        where: { Project: { userId } },
      }),
      this.prisma.client.form.count({
        where: { project: { userId } },
      }),
      // Responses (form submissions) were removed in the forms rebuild;
      // restored onto FormResponse in Phase 6. Report zero usage for now.
      Promise.resolve(0),
    ]);

    return {
      forms: {
        used: forms,
        limit: plan.limits.forms.limit,
      },
      responses: {
        used: responses,
        limit: plan.limits.responses.limit,
      },
      widgets: {
        used: widgets,
        limit: plan.limits.widgets.limit,
      },
      projects: {
        used: projects,
        limit: plan.limits.projects.limit,
      },
    };
  }

  async getFormUsageForProject(projectId: string): Promise<V2UsageLimitDTO> {
    const project = await this.prisma.client.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const subscription = await this.getOrCreateSubscription(project.userId);
    const plan = await this.resolvePlan(subscription.userPlan as BillingPlan);
    const forms = await this.prisma.client.form.count({
      where: { project: { userId: project.userId } },
    });

    return {
      used: forms,
      limit: plan.limits.forms.limit,
    };
  }

  // used by B2 checkout
  private async ensureRazorpayCustomer(userId: string): Promise<string> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) throw new NotFoundException("User not found");

    const subscription = await this.getOrCreateSubscription(userId);
    if (subscription.externalCustomerId) {
      return subscription.externalCustomerId;
    }

    const customer = await this.razorpay.ensureCustomer({
      name: this.toRazorpayCustomerName(user),
      email: user.email,
    });

    await this.prisma.client.subscription.update({
      where: { userId },
      data: { externalCustomerId: customer.id },
      select: this.subscriptionSelect(),
    });

    return customer.id;
  }

  private async getOrCreateSubscription(userId: string) {
    const existing = await this.prisma.client.subscription.findUnique({
      where: { userId },
      select: this.subscriptionSelect(),
    });

    if (existing) return existing;

    const now = new Date();
    const freePlan = await this.resolvePlan("FREE");

    return this.prisma.client.subscription.create({
      data: {
        userId,
        status: "ACTIVE",
        userPlan: "FREE",
        planId: freePlan.planId,
        currentPeriodStart: now,
        currentPeriodEnd: this.addMonths(now, 1),
        cancelAtPeriodEnd: false,
        amount: 0,
        currency: "INR",
        interval: "month",
      },
      select: this.subscriptionSelect(),
    });
  }

  private async resolvePlan(planId: BillingPlan) {
    const defaults = PLAN_DEFAULTS[planId];
    const plan = await this.prisma.client.plan.findFirst({
      where: {
        type: planId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        price: true,
        currency: true,
        interval: true,
        limits: true,
      },
    });

    if (!plan) {
      return {
        planId: null,
        amount: defaults.amount,
        currency: defaults.currency,
        interval: defaults.interval,
        limits: defaults.limits,
      };
    }

    return {
      planId: plan.id,
      amount: plan.price,
      currency: this.toCurrency(plan.currency),
      interval: this.toInterval(plan.interval),
      limits: this.toUsageLimits(plan.limits, defaults.limits),
    };
  }

  private async resolveCheckoutPlan(planId: PaidBillingPlan) {
    const plan = await this.prisma.client.plan.findFirst({
      where: {
        type: planId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        razorpayPlanId: true,
      },
    });

    if (!plan?.razorpayPlanId) {
      throw new ServiceUnavailableException("Billing plan is not configured");
    }

    return {
      id: plan.id,
      type: plan.type as PaidBillingPlan,
      razorpayPlanId: plan.razorpayPlanId,
    };
  }

  private subscriptionSelect() {
    return {
      id: true,
      userId: true,
      status: true,
      userPlan: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      amount: true,
      currency: true,
      interval: true,
      externalCustomerId: true,
      externalSubscriptionId: true,
      razorpaySubscriptionId: true,
      providerStatus: true,
      scheduledRazorpaySubscriptionId: true,
      scheduledPlanId: true,
      scheduledStartAt: true,
      plan: {
        select: {
          type: true,
        },
      },
    } satisfies Prisma.SubscriptionSelect;
  }

  private hasActiveProviderSubscription(subscription: {
    externalSubscriptionId: string | null;
    providerStatus: string | null;
  }): subscription is {
    externalSubscriptionId: string;
    providerStatus: string;
  } {
    if (!subscription.externalSubscriptionId || !subscription.providerStatus) {
      return false;
    }

    return ACTIVE_RAZORPAY_SUBSCRIPTION_STATUSES.has(
      subscription.providerStatus.toLowerCase(),
    );
  }

  private toSubscriptionDto(
    subscription: Pick<
      Subscription,
      | "id"
      | "userId"
      | "status"
      | "userPlan"
      | "currentPeriodStart"
      | "currentPeriodEnd"
      | "cancelAtPeriodEnd"
      | "amount"
      | "currency"
      | "interval"
    >,
  ): V2SubscriptionDTO {
    return {
      id: subscription.id,
      userId: subscription.userId,
      status: this.toSubscriptionStatus(subscription.status),
      userPlan: subscription.userPlan,
      currentPeriodStart: this.requiredDateIso(subscription.currentPeriodStart),
      currentPeriodEnd: this.requiredDateIso(subscription.currentPeriodEnd),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      amount:
        subscription.amount ?? PLAN_DEFAULTS[subscription.userPlan].amount,
      currency: this.toCurrency(subscription.currency),
      interval: this.toInterval(subscription.interval),
    };
  }

  private toPaymentMethodDto(paymentMethod: PaymentMethod): V2PaymentMethodDTO {
    return {
      id: paymentMethod.id,
      brand: paymentMethod.brand.toLowerCase() as V2PaymentMethodDTO["brand"],
      last4: paymentMethod.last4,
      expMonth: paymentMethod.expMonth,
      expYear: paymentMethod.expYear,
      isDefault: paymentMethod.isDefault,
    };
  }

  private toInvoiceDto(invoice: Invoice): V2InvoiceDTO {
    return {
      id: invoice.id,
      number: invoice.number,
      date: invoice.issuedAt.toISOString(),
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status.toLowerCase() as V2InvoiceDTO["status"],
      planName: invoice.planName,
      downloadUrl: invoice.downloadUrl,
    };
  }

  private toBillingProfileDto(profile: BillingProfile): V2BillingProfileDTO {
    return {
      name: profile.name,
      line1: profile.line1,
      ...(profile.line2 ? { line2: profile.line2 } : {}),
      city: profile.city,
      state: profile.state,
      postalCode: profile.postalCode,
      country: profile.country,
      ...(profile.gstin ? { gstin: profile.gstin } : {}),
    };
  }

  private toRazorpayCustomerName(user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  }) {
    const name = [user.firstName, user.lastName]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .trim();

    return name || user.email;
  }

  private toCheckoutPlanId(
    value: BillingPlan | null | undefined,
    fallback: PaidBillingPlan,
  ): PaidBillingPlan {
    return value === "PRO" || value === "BUSINESS" ? value : fallback;
  }

  private toSubscriptionStatus(status: Subscription["status"]) {
    const statusMap: Record<string, V2SubscriptionStatus> = {
      ACTIVE: "active",
      TRIALING: "trialing",
      PAST_DUE: "past_due",
      CANCELED: "canceled",
      PAUSED: "past_due",
      INCOMPLETE: "past_due",
    };

    return statusMap[status] ?? "past_due";
  }

  private toUsageLimits(
    value: Prisma.JsonValue,
    defaults: V2UsageDTO,
  ): V2UsageDTO {
    const record = this.asRecord(value);

    return {
      forms: {
        used: 0,
        limit: this.asLimit(record.forms, defaults.forms.limit),
      },
      responses: {
        used: 0,
        limit: this.asLimit(record.responses, defaults.responses.limit),
      },
      widgets: {
        used: 0,
        limit: this.asLimit(record.widgets, defaults.widgets.limit),
      },
      projects: {
        used: 0,
        limit: this.asLimit(record.projects, defaults.projects.limit),
      },
    };
  }

  private asLimit(value: unknown, fallback: number) {
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : fallback;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private toCurrency(value: string | null): "INR" {
    return value === "INR" ? value : "INR";
  }

  private toInterval(value: string | null): "month" | "year" {
    return value === "year" ? value : "month";
  }

  private requiredDateIso(value: Date | null) {
    return (value ?? new Date()).toISOString();
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private addMonths(value: Date, months: number) {
    const next = new Date(value);
    next.setMonth(next.getMonth() + months);
    return next;
  }
}
