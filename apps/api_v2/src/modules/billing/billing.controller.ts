import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  createCheckoutBodySchema,
  paymentMethodParamsSchema,
  switchSubscriptionBodySchema,
  updateBillingProfileBodySchema,
  type CreateCheckoutBodyDto,
  type PaymentMethodParamsDto,
  type SwitchSubscriptionBodyDto,
  type UpdateBillingProfileBodyDto,
} from "./billing.dto.js";
import { BillingService } from "./billing.service.js";

@Controller("account")
export class BillingController {
  constructor(
    @Inject(BillingService) private readonly billingService: BillingService,
  ) {}

  @Get("subscription")
  getSubscription(@CurrentUserId() userId: string) {
    return this.billingService.getSubscription(userId);
  }

  @Post("subscription/checkout")
  createCheckoutSession(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createCheckoutBodySchema))
    body: CreateCheckoutBodyDto,
  ) {
    return this.billingService.createCheckoutSession(userId, body);
  }

  @Post("subscription/cancel")
  cancelSubscription(@CurrentUserId() userId: string) {
    return this.billingService.cancelSubscription(userId);
  }

  @Post("subscription/switch")
  switchSubscription(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(switchSubscriptionBodySchema))
    body: SwitchSubscriptionBodyDto,
  ) {
    return this.billingService.switchSubscriptionPlan(userId, body);
  }

  @Get("payment-methods")
  listPaymentMethods(@CurrentUserId() userId: string) {
    return this.billingService.listPaymentMethods(userId);
  }

  @Delete("payment-methods/:id")
  deletePaymentMethod(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(paymentMethodParamsSchema))
    params: PaymentMethodParamsDto,
  ) {
    return this.billingService.deletePaymentMethod(userId, params.id);
  }

  @Post("payment-methods/:id/default")
  setDefaultPaymentMethod(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(paymentMethodParamsSchema))
    params: PaymentMethodParamsDto,
  ) {
    return this.billingService.setDefaultPaymentMethod(userId, params.id);
  }

  @Get("invoices")
  listInvoices(@CurrentUserId() userId: string) {
    return this.billingService.listInvoices(userId);
  }

  @Get("billing-profile")
  getBillingProfile(@CurrentUserId() userId: string) {
    return this.billingService.getBillingProfile(userId);
  }

  @Patch("billing-profile")
  updateBillingProfile(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(updateBillingProfileBodySchema))
    body: UpdateBillingProfileBodyDto,
  ) {
    return this.billingService.updateBillingProfile(userId, body);
  }

  @Get("usage")
  getUsage(@CurrentUserId() userId: string) {
    return this.billingService.getUsage(userId);
  }
}
