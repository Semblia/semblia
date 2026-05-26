import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Plan, Prisma } from "@workspace/database/prisma";
import { RazorpayService } from "../../billing/razorpay.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AdminAuditService } from "../admin-audit.service.js";
import type { CreateAdminPlanBodyDto } from "./admin-plans.dto.js";

type RazorpayPlanCreateInput = {
  period: "monthly" | "yearly";
  interval: 1;
  item: {
    name: string;
    amount: number;
    currency: "INR";
    description?: string;
  };
};

type RazorpayPlansClient = {
  plans: {
    create(input: RazorpayPlanCreateInput): Promise<{ id: string }>;
  };
};

type AdminMutationContext = {
  id: string;
  ipAddress?: string;
  userAgent?: string;
};

type AdminPlanDto = {
  id: string;
  type: "FREE" | "PRO" | "BUSINESS";
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  isActive: boolean;
  razorpayPlanId: string | null;
  limits: Prisma.JsonValue;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class AdminPlansService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RazorpayService) private readonly razorpay: RazorpayService,
    @Inject(AdminAuditService)
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async listPlans(): Promise<AdminPlanDto[]> {
    const plans = await this.prisma.client.plan.findMany({
      orderBy: { createdAt: "desc" },
    });

    return plans.map((plan) => this.toDto(plan));
  }

  async createPlan(
    admin: AdminMutationContext,
    body: CreateAdminPlanBodyDto,
  ): Promise<AdminPlanDto> {
    const razorpayPlanId =
      body.price === 0 ? null : await this.createRazorpayPlan(body);

    const plan = await this.prisma.client.plan.create({
      data: {
        type: body.type,
        name: body.name,
        description: body.description ?? null,
        price: body.price,
        currency: body.currency,
        interval: this.toStoredInterval(body.interval),
        limits: body.limits,
        razorpayPlanId,
        isActive: true,
      },
    });

    await this.adminAuditService.record({
      adminUserId: admin.id,
      action: "create_plan",
      targetType: "plan",
      targetId: plan.id,
      metadata: {
        razorpayPlanId,
        price: body.price,
        type: body.type,
      },
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
    });

    return this.toDto(plan);
  }

  async deactivatePlan(
    admin: AdminMutationContext,
    planId: string,
  ): Promise<AdminPlanDto> {
    const existing = await this.prisma.client.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Plan not found");
    }

    const plan = await this.prisma.client.plan.update({
      where: { id: planId },
      data: { isActive: false },
    });

    await this.adminAuditService.record({
      adminUserId: admin.id,
      action: "deactivate_plan",
      targetType: "plan",
      targetId: plan.id,
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
    });

    return this.toDto(plan);
  }

  private async createRazorpayPlan(
    body: CreateAdminPlanBodyDto,
  ): Promise<string> {
    const client = this.razorpay.getClient() as RazorpayPlansClient | null;
    if (!client?.plans) {
      throw new ServiceUnavailableException("Billing provider is not configured");
    }

    const item: RazorpayPlanCreateInput["item"] = {
      name: body.name,
      amount: body.price,
      currency: body.currency,
      ...(body.description ? { description: body.description } : {}),
    };

    const providerPlan = await client.plans.create({
      period: body.interval,
      interval: 1,
      item,
    });

    return providerPlan.id;
  }

  private toStoredInterval(interval: CreateAdminPlanBodyDto["interval"]) {
    return interval === "yearly" ? "year" : "month";
  }

  private toDto(plan: Plan): AdminPlanDto {
    return {
      id: plan.id,
      type: plan.type,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      isActive: plan.isActive,
      razorpayPlanId: plan.razorpayPlanId,
      limits: plan.limits,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }
}
