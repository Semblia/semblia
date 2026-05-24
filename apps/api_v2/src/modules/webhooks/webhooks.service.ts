import { createHash } from "node:crypto";
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  SubscriptionStatus,
  UserPlan,
  type Prisma,
} from "@workspace/database/prisma";
import { PrismaService } from "../prisma/prisma.service.js";
import type { ClerkWebhookEventDto } from "../users/users.dto.js";
import { UsersService } from "../users/users.service.js";
import type {
  RazorpaySubscriptionEntityDto,
  RazorpayWebhookBodyDto,
} from "./webhooks.dto.js";

const RAZORPAY_PROVIDER = "razorpay";
const RAZORPAY_HANDLED_EVENTS = new Set([
  "subscription.activated",
  "subscription.charged",
  "subscription.cancelled",
  "subscription.halted",
  "subscription.paused",
  "subscription.resumed",
  "subscription.completed",
  "payment.captured",
  "payment.failed",
  "invoice.paid",
]);

type RazorpayHandledEvent =
  | "subscription.activated"
  | "subscription.charged"
  | "subscription.cancelled"
  | "subscription.halted"
  | "subscription.paused"
  | "subscription.resumed"
  | "subscription.completed"
  | "payment.captured"
  | "payment.failed"
  | "invoice.paid";

type UserPlanValue = (typeof UserPlan)[keyof typeof UserPlan];

type RazorpaySubscriptionForProcessing = {
  id: string;
  userId: string;
  userPlan: UserPlanValue;
  planId: string | null;
  externalSubscriptionId: string | null;
};

type RazorpayPlanSnapshot = {
  planId?: string;
  userPlan?: UserPlanValue;
  amount?: number;
  currency?: string;
  interval?: string;
};

@Injectable()
export class WebhooksService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  async handleRazorpayWebhook(input: {
    body: RazorpayWebhookBodyDto;
    rawBody: Buffer | string;
  }): Promise<{ received: true; replayed: boolean }> {
    const rawBody = this.toRawBodyString(input.rawBody);
    const providerEventId = this.buildRazorpayProviderEventId(
      input.body.event,
      input.body.created_at,
      rawBody,
    );

    try {
      await this.prisma.client.paymentWebhookEvent.create({
        data: {
          provider: RAZORPAY_PROVIDER,
          providerEventId,
          eventType: input.body.event,
          payload: input.body as Prisma.InputJsonValue,
          status: "received",
          receivedAt: new Date(),
          processedAt: null,
        },
      });

      try {
        await this.processRazorpayEvent(input.body, providerEventId);
      } catch (error: unknown) {
        await this.markRazorpayLedgerRow(
          providerEventId,
          "failed",
          this.getErrorMessage(error),
        );
        throw error;
      }

      return { received: true, replayed: false };
    } catch (error: unknown) {
      if (!this.isPrismaUniqueViolation(error)) {
        throw error;
      }

      const existing = await this.prisma.client.paymentWebhookEvent.findUnique({
        where: { providerEventId },
      });

      if (!existing) {
        throw new InternalServerErrorException(
          "Payment webhook ledger is missing after collision",
        );
      }

      return { received: true, replayed: true };
    }
  }

  async handleClerkEvent(
    event: ClerkWebhookEventDto,
    svixId: string,
  ): Promise<{ received: true; replayed: boolean }> {
    const shouldProcessUser =
      event.type === "user.created" || event.type === "user.updated";

    const createResult = await this.createClerkLedgerRow(event, svixId);
    if (createResult === "replayed") {
      return { received: true, replayed: true };
    }

    try {
      if (shouldProcessUser) {
        await this.usersService.upsertFromClerk(event.data);
        await this.markClerkLedgerRow(svixId, "processed");
      } else {
        await this.markClerkLedgerRow(svixId, "ignored");
      }

      return { received: true, replayed: false };
    } catch (error: unknown) {
      await this.markClerkLedgerRow(
        svixId,
        "failed",
        this.getErrorMessage(error),
      );
      throw error;
    }
  }

  private async createClerkLedgerRow(
    event: ClerkWebhookEventDto,
    svixId: string,
  ): Promise<"created" | "retry" | "replayed"> {
    try {
      await this.prisma.client.clerkWebhookEvent.create({
        data: {
          providerEventId: svixId,
          eventType: event.type,
          payload: event as Prisma.InputJsonValue,
          status: "received",
          receivedAt: new Date(),
          processedAt: null,
        },
      });
      return "created";
    } catch (error: unknown) {
      if (!this.isPrismaUniqueViolation(error)) {
        throw error;
      }

      const existing = await this.prisma.client.clerkWebhookEvent.findUnique({
        where: { providerEventId: svixId },
      });

      if (!existing) {
        throw new InternalServerErrorException(
          "Clerk webhook ledger is missing after collision",
        );
      }

      if (existing.status === "failed") {
        await this.prisma.client.clerkWebhookEvent.update({
          where: { providerEventId: svixId },
          data: {
            status: "received",
            error: null,
            processedAt: null,
          },
        });
        return "retry";
      }

      return "replayed";
    }
  }

  private async markClerkLedgerRow(
    providerEventId: string,
    status: "processed" | "ignored" | "failed",
    error?: string,
  ) {
    await this.prisma.client.clerkWebhookEvent.update({
      where: { providerEventId },
      data: {
        status,
        error: error ?? null,
        processedAt: new Date(),
      },
    });
  }

  private async processRazorpayEvent(
    body: RazorpayWebhookBodyDto,
    providerEventId: string,
  ) {
    if (!this.isHandledRazorpayEvent(body.event)) {
      await this.markRazorpayLedgerRow(providerEventId, "ignored");
      return;
    }

    let subscriptionId: string | null = null;
    await this.prisma.client.$transaction(async (tx) => {
      switch (body.event) {
        case "subscription.activated":
          subscriptionId = await this.handleRazorpaySubscriptionActivated(
            tx,
            body,
            providerEventId,
          );
          break;
        case "subscription.charged":
          subscriptionId = await this.handleRazorpaySubscriptionCharged(
            tx,
            body,
            providerEventId,
          );
          break;
        case "subscription.cancelled":
          subscriptionId = await this.handleRazorpaySubscriptionLifecycle(
            tx,
            body,
            providerEventId,
            {
              providerStatus: "cancelled",
              status: SubscriptionStatus.CANCELED,
              cancelAtPeriodEnd: false,
            },
          );
          break;
        case "subscription.halted":
          subscriptionId = await this.handleRazorpaySubscriptionLifecycle(
            tx,
            body,
            providerEventId,
            { providerStatus: "halted" },
          );
          break;
        case "subscription.paused":
          subscriptionId = await this.handleRazorpaySubscriptionLifecycle(
            tx,
            body,
            providerEventId,
            { providerStatus: "paused" },
          );
          break;
        case "subscription.resumed":
          subscriptionId = await this.handleRazorpaySubscriptionLifecycle(
            tx,
            body,
            providerEventId,
            { providerStatus: "active" },
          );
          break;
        case "subscription.completed":
          subscriptionId = await this.handleRazorpaySubscriptionCompleted(
            tx,
            body,
            providerEventId,
          );
          break;
        case "payment.captured":
          subscriptionId = await this.handleRazorpayPaymentEvent(
            tx,
            body,
            providerEventId,
            "captured",
          );
          break;
        case "payment.failed":
          subscriptionId = await this.handleRazorpayPaymentEvent(
            tx,
            body,
            providerEventId,
            "failed",
          );
          break;
        case "invoice.paid":
          subscriptionId = await this.handleRazorpayInvoicePaid(
            tx,
            body,
            providerEventId,
          );
          break;
      }

      await this.markRazorpayLedgerRow(
        providerEventId,
        "processed",
        undefined,
        subscriptionId,
        tx,
      );
    });
  }

  private async handleRazorpaySubscriptionActivated(
    tx: Prisma.TransactionClient,
    body: RazorpayWebhookBodyDto,
    providerEventId: string,
  ) {
    const subscription = await this.findRazorpaySubscription(tx, body);
    if (!subscription) return null;

    const entity = body.payload?.subscription?.entity;
    const snapshot = await this.resolveRazorpayPlanSnapshot(tx, body, entity);
    const userPlan = this.resolveUserPlanFromWebhook(entity?.notes, snapshot);
    const currentPeriodStart = this.toUnixDate(entity?.current_start);
    const currentPeriodEnd = this.toUnixDate(entity?.current_end);
    const data: Prisma.SubscriptionUncheckedUpdateInput = {
      status: SubscriptionStatus.ACTIVE,
      providerStatus: "active",
      cancelAtPeriodEnd: false,
      ...this.razorpayWebhookStamp(providerEventId, body.event),
    };

    if (entity?.id) {
      data.externalSubscriptionId = entity.id;
      data.razorpaySubscriptionId = entity.id;
    }

    if (currentPeriodStart) data.currentPeriodStart = currentPeriodStart;
    if (currentPeriodEnd) data.currentPeriodEnd = currentPeriodEnd;
    if (snapshot.planId) data.planId = snapshot.planId;
    if (typeof snapshot.amount === "number") data.amount = snapshot.amount;
    if (snapshot.currency) data.currency = snapshot.currency;
    if (snapshot.interval) data.interval = snapshot.interval;
    if (userPlan) data.userPlan = userPlan;

    await tx.subscription.update({
      where: { id: subscription.id },
      data,
    });

    if (userPlan) {
      await tx.user.update({
        where: { id: subscription.userId },
        data: { plan: userPlan },
        select: { id: true },
      });
    }

    return subscription.id;
  }

  private async handleRazorpaySubscriptionCharged(
    tx: Prisma.TransactionClient,
    body: RazorpayWebhookBodyDto,
    providerEventId: string,
  ) {
    const subscription = await this.findRazorpaySubscription(tx, body);
    if (!subscription) return null;

    const entity = body.payload?.subscription?.entity;
    const data: Prisma.SubscriptionUncheckedUpdateInput = {
      status: SubscriptionStatus.ACTIVE,
      providerStatus: "active",
      ...this.razorpayWebhookStamp(providerEventId, body.event),
    };
    const currentPeriodStart = this.toUnixDate(entity?.current_start);
    const currentPeriodEnd = this.toUnixDate(entity?.current_end);
    if (currentPeriodStart) data.currentPeriodStart = currentPeriodStart;
    if (currentPeriodEnd) data.currentPeriodEnd = currentPeriodEnd;

    await tx.subscription.update({
      where: { id: subscription.id },
      data,
    });

    if (body.payload?.payment?.entity?.id) {
      await this.upsertRazorpayPayment(tx, body, subscription, "captured");
    }

    return subscription.id;
  }

  private async handleRazorpaySubscriptionLifecycle(
    tx: Prisma.TransactionClient,
    body: RazorpayWebhookBodyDto,
    providerEventId: string,
    changes: {
      providerStatus: string;
      status?: (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
      cancelAtPeriodEnd?: boolean;
    },
  ) {
    const subscription = await this.findRazorpaySubscription(tx, body);
    if (!subscription) return null;

    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        ...changes,
        ...this.razorpayWebhookStamp(providerEventId, body.event),
      },
    });

    return subscription.id;
  }

  private async handleRazorpaySubscriptionCompleted(
    tx: Prisma.TransactionClient,
    body: RazorpayWebhookBodyDto,
    providerEventId: string,
  ) {
    const subscription = await this.findRazorpaySubscription(tx, body);
    if (!subscription) return null;

    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        providerStatus: "completed",
        userPlan: UserPlan.FREE,
        cancelAtPeriodEnd: false,
        ...this.razorpayWebhookStamp(providerEventId, body.event),
      },
    });
    await tx.user.update({
      where: { id: subscription.userId },
      data: { plan: UserPlan.FREE },
      select: { id: true },
    });

    return subscription.id;
  }

  private async handleRazorpayPaymentEvent(
    tx: Prisma.TransactionClient,
    body: RazorpayWebhookBodyDto,
    providerEventId: string,
    paymentStatus: "captured" | "failed",
  ) {
    const payment = body.payload?.payment?.entity;
    if (!payment?.subscription_id || !payment.id) return null;

    const subscription = await this.findRazorpaySubscriptionByExternalId(
      tx,
      payment.subscription_id,
    );
    if (!subscription) return null;

    await this.upsertRazorpayPayment(tx, body, subscription, paymentStatus);
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        lastPaymentStatus: paymentStatus,
        ...this.razorpayWebhookStamp(providerEventId, body.event),
      },
    });

    return subscription.id;
  }

  private async handleRazorpayInvoicePaid(
    tx: Prisma.TransactionClient,
    body: RazorpayWebhookBodyDto,
    providerEventId: string,
  ) {
    const invoice = body.payload?.invoice?.entity;
    if (!invoice?.id || !invoice.subscription_id) return null;

    const subscription = await this.findRazorpaySubscriptionByExternalId(
      tx,
      invoice.subscription_id,
    );
    if (!subscription) return null;

    const paymentId = invoice.payment_id ?? body.payload?.payment?.entity?.id;
    const amount = invoice.amount_paid ?? invoice.amount;
    const eventCreatedAt =
      this.toUnixDate(body.created_at) ??
      this.toUnixDate(invoice.created_at) ??
      null;
    const paidAt =
      this.toUnixDate(invoice.paid_at) ??
      this.toUnixDate(invoice.created_at) ??
      null;

    await tx.subscriptionPayment.upsert({
      where: {
        provider_externalInvoiceId: {
          provider: RAZORPAY_PROVIDER,
          externalInvoiceId: invoice.id,
        },
      },
      create: {
        provider: RAZORPAY_PROVIDER,
        externalPaymentId: paymentId ?? null,
        externalInvoiceId: invoice.id,
        externalSubscriptionId: invoice.subscription_id,
        userId: subscription.userId,
        subscriptionId: subscription.id,
        planId: subscription.planId,
        invoiceStatus: "paid",
        amount: amount ?? null,
        currency: invoice.currency ?? null,
        eventType: body.event,
        eventCreatedAt,
        paidAt,
        rawSnapshot: body as Prisma.InputJsonValue,
      },
      update: this.withoutUndefined({
        externalPaymentId: paymentId,
        externalSubscriptionId: invoice.subscription_id,
        userId: subscription.userId,
        subscriptionId: subscription.id,
        planId: subscription.planId,
        invoiceStatus: "paid",
        amount,
        currency: invoice.currency,
        eventType: body.event,
        eventCreatedAt,
        paidAt,
        rawSnapshot: body as Prisma.InputJsonValue,
      }),
    });
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        lastInvoiceStatus: "paid",
        ...this.razorpayWebhookStamp(providerEventId, body.event),
      },
    });

    return subscription.id;
  }

  private async upsertRazorpayPayment(
    tx: Prisma.TransactionClient,
    body: RazorpayWebhookBodyDto,
    subscription: RazorpaySubscriptionForProcessing,
    paymentStatus: "captured" | "failed",
  ) {
    const payment = body.payload?.payment?.entity;
    if (!payment?.id || !payment.subscription_id) return;

    const eventCreatedAt =
      this.toUnixDate(body.created_at) ??
      this.toUnixDate(payment.created_at) ??
      null;
    const occurredAt = this.toUnixDate(payment.created_at) ?? null;
    const paidAt = paymentStatus === "captured" ? occurredAt : null;
    const failedAt = paymentStatus === "failed" ? occurredAt : null;

    await tx.subscriptionPayment.upsert({
      where: {
        provider_externalPaymentId: {
          provider: RAZORPAY_PROVIDER,
          externalPaymentId: payment.id,
        },
      },
      create: {
        provider: RAZORPAY_PROVIDER,
        externalPaymentId: payment.id,
        externalInvoiceId: payment.invoice_id ?? null,
        externalSubscriptionId: payment.subscription_id,
        userId: subscription.userId,
        subscriptionId: subscription.id,
        planId: subscription.planId,
        paymentStatus,
        amount: payment.amount ?? null,
        currency: payment.currency ?? null,
        eventType: body.event,
        eventCreatedAt,
        paidAt,
        failedAt,
        rawSnapshot: body as Prisma.InputJsonValue,
      },
      update: this.withoutUndefined({
        externalInvoiceId: payment.invoice_id,
        externalSubscriptionId: payment.subscription_id,
        userId: subscription.userId,
        subscriptionId: subscription.id,
        planId: subscription.planId,
        paymentStatus,
        amount: payment.amount,
        currency: payment.currency,
        eventType: body.event,
        eventCreatedAt,
        paidAt,
        failedAt,
        rawSnapshot: body as Prisma.InputJsonValue,
      }),
    });
  }

  private async findRazorpaySubscription(
    tx: Prisma.TransactionClient,
    body: RazorpayWebhookBodyDto,
  ) {
    const externalSubscriptionId = this.getExternalSubscriptionId(body);
    if (externalSubscriptionId) {
      const subscription = await this.findRazorpaySubscriptionByExternalId(
        tx,
        externalSubscriptionId,
      );
      if (subscription) return subscription;
    }

    if (body.event !== "subscription.activated") return null;

    const userId = this.getStringNote(
      body.payload?.subscription?.entity?.notes,
      "tresta_user_id",
    );
    if (!userId) return null;

    return tx.subscription.findUnique({
      where: { userId },
      select: this.razorpaySubscriptionSelect(),
    });
  }

  private async findRazorpaySubscriptionByExternalId(
    tx: Prisma.TransactionClient,
    externalSubscriptionId: string,
  ) {
    return tx.subscription.findUnique({
      where: { externalSubscriptionId },
      select: this.razorpaySubscriptionSelect(),
    });
  }

  private async resolveRazorpayPlanSnapshot(
    tx: Prisma.TransactionClient,
    body: RazorpayWebhookBodyDto,
    subscriptionEntity?: RazorpaySubscriptionEntityDto,
  ): Promise<RazorpayPlanSnapshot> {
    const planEntity = body.payload?.plan?.entity;
    const razorpayPlanId = subscriptionEntity?.plan_id ?? planEntity?.id;
    const localPlan = razorpayPlanId
      ? await tx.plan.findUnique({
          where: { razorpayPlanId },
          select: {
            id: true,
            type: true,
            price: true,
            currency: true,
            interval: true,
          },
        })
      : null;

    if (localPlan) {
      return {
        planId: localPlan.id,
        userPlan: localPlan.type,
        amount: localPlan.price,
        currency: localPlan.currency,
        interval: localPlan.interval,
      };
    }

    return {
      amount: this.firstNumber(
        planEntity?.item?.amount,
        planEntity?.amount,
        subscriptionEntity?.amount,
      ),
      currency: this.firstString(
        planEntity?.item?.currency,
        planEntity?.currency,
        subscriptionEntity?.currency,
      )?.toUpperCase(),
      interval: this.normalizeInterval(
        this.firstString(
          planEntity?.period,
          planEntity?.interval,
          subscriptionEntity?.period,
          subscriptionEntity?.interval,
        ),
      ),
    };
  }

  private resolveUserPlanFromWebhook(
    notes: Record<string, unknown> | undefined,
    snapshot: RazorpayPlanSnapshot,
  ): UserPlanValue | undefined {
    const planFromNotes = this.getStringNote(notes, "tresta_plan");
    if (this.isUserPlan(planFromNotes)) return planFromNotes;
    return snapshot.userPlan;
  }

  private razorpaySubscriptionSelect() {
    return {
      id: true,
      userId: true,
      userPlan: true,
      planId: true,
      externalSubscriptionId: true,
    } satisfies Prisma.SubscriptionSelect;
  }

  private async markRazorpayLedgerRow(
    providerEventId: string,
    status: "processed" | "ignored" | "failed",
    error?: string,
    subscriptionId?: string | null,
    client: Prisma.TransactionClient | PrismaService["client"] = this.prisma
      .client,
  ) {
    const data: Prisma.PaymentWebhookEventUpdateInput = {
      status,
      error: error ?? null,
      processedAt: new Date(),
    };

    if (subscriptionId !== undefined) {
      data.subscriptionId = subscriptionId;
    }

    await client.paymentWebhookEvent.update({
      where: { providerEventId },
      data,
    });
  }

  private getExternalSubscriptionId(body: RazorpayWebhookBodyDto) {
    return (
      body.payload?.subscription?.entity?.id ??
      body.payload?.payment?.entity?.subscription_id ??
      body.payload?.invoice?.entity?.subscription_id
    );
  }

  private razorpayWebhookStamp(providerEventId: string, eventType: string) {
    return {
      lastWebhookEventId: providerEventId,
      lastWebhookEventType: eventType,
      lastWebhookAt: new Date(),
    };
  }

  private toUnixDate(value: number | undefined) {
    return typeof value === "number" && Number.isFinite(value)
      ? new Date(value * 1000)
      : undefined;
  }

  private getStringNote(
    notes: Record<string, unknown> | undefined,
    key: string,
  ) {
    const value = notes?.[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private firstNumber(...values: Array<unknown>) {
    return values.find(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    );
  }

  private firstString(...values: Array<unknown>) {
    return values.find(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
  }

  private normalizeInterval(value: string | undefined) {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    if (normalized === "monthly") return "month";
    if (normalized === "yearly" || normalized === "annual") return "year";
    return normalized;
  }

  private withoutUndefined<T extends Record<string, unknown>>(input: T) {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as T;
  }

  private isUserPlan(value: unknown): value is UserPlanValue {
    return (
      typeof value === "string" &&
      (Object.values(UserPlan) as string[]).includes(value)
    );
  }

  private isHandledRazorpayEvent(event: string): event is RazorpayHandledEvent {
    return RAZORPAY_HANDLED_EVENTS.has(event);
  }

  private buildRazorpayProviderEventId(
    event: string,
    createdAt: number | undefined,
    rawBody: string,
  ) {
    return createHash("sha256")
      .update(`${event}.${createdAt ?? ""}.${rawBody}`)
      .digest("hex")
      .slice(0, 64);
  }

  private toRawBodyString(rawBody: Buffer | string) {
    return typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private isPrismaUniqueViolation(error: unknown): error is { code: string } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}
