import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRequire } from "node:module";

export type RazorpayCustomerInput = {
  name: string;
  email: string;
  contact?: string;
  notes?: Record<string, string | number | boolean | null>;
};

export type RazorpayCustomer = {
  id: string;
};

export type RazorpaySubscriptionCreateInput = {
  plan_id: string;
  customer_id: string;
  total_count: number;
  customer_notify?: 0 | 1 | boolean;
  notes?: Record<string, string | number | boolean | null>;
};

export type RazorpaySubscription = {
  id: string;
  status: string;
  short_url?: string | null;
  customer_id?: string | null;
  plan_id: string;
  notes?: Record<string, string | number | boolean | null>;
};

export type RazorpayClient = {
  customers: {
    create(input: RazorpayCustomerInput): Promise<RazorpayCustomer>;
  };
  subscriptions: {
    create(
      input: RazorpaySubscriptionCreateInput,
    ): Promise<RazorpaySubscription>;
  };
  paymentLink?: unknown;
  invoices?: unknown;
};

type RazorpayConstructor = new (config: {
  key_id: string;
  key_secret: string;
}) => RazorpayClient;

const require = createRequire(import.meta.url);

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly client: RazorpayClient | null;
  private readonly publishableKeyId: string | null;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const keyId = configService.get<string>("RAZORPAY_KEY_ID");
    const keySecret = configService.get<string>("RAZORPAY_KEY_SECRET");
    this.publishableKeyId = keyId ?? null;

    if (!keyId || !keySecret) {
      this.logger.warn(
        "RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing; billing Razorpay client is disabled for this process.",
      );
      this.client = null;
      return;
    }

    const Razorpay = this.resolveRazorpayConstructor();
    this.client = Razorpay
      ? new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        })
      : null;
  }

  getPublishableKeyId() {
    return this.publishableKeyId;
  }

  getClient() {
    return this.getRazorpayClient();
  }

  async ensureCustomer(input: RazorpayCustomerInput): Promise<RazorpayCustomer> {
    const client = this.getRazorpayClient();
    if (!client) {
      throw new ServiceUnavailableException("Billing provider is not configured");
    }

    try {
      const customer = await client.customers.create(input);
      return { id: customer.id };
    } catch (error: unknown) {
      this.logger.error(
        "Razorpay customer creation failed",
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException("Billing provider request failed");
    }
  }

  async createSubscription(
    input: RazorpaySubscriptionCreateInput,
  ): Promise<RazorpaySubscription> {
    const client = this.getRazorpayClient();
    if (!client) {
      throw new ServiceUnavailableException("Billing provider is not configured");
    }

    try {
      return await client.subscriptions.create(input);
    } catch (error: unknown) {
      this.logger.error(
        "Razorpay subscription creation failed",
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException("Billing provider request failed");
    }
  }

  protected getRazorpayClient() {
    return this.client;
  }

  private resolveRazorpayConstructor(): RazorpayConstructor | null {
    try {
      return require("razorpay") as RazorpayConstructor;
    } catch (error) {
      this.logger.warn(
        `Razorpay SDK is not installed or cannot be loaded; billing provider calls are disabled. ${String(error)}`,
      );
      return null;
    }
  }
}
