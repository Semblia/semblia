import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";

const SIGNATURE_HEX_LENGTH = 64;

@Injectable()
export class EmailUnsubscribeService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  tokenForDelivery(deliveryId: string): string {
    return createEmailUnsubscribeToken(deliveryId, this.requireSecret());
  }

  urlForDelivery(deliveryId: string): string {
    const apiPublicUrl = this.configService
      .get<string>("API_PUBLIC_URL")
      ?.trim();
    if (!apiPublicUrl) {
      throw new ServiceUnavailableException(
        "Email unsubscribe is not configured",
      );
    }
    return createEmailUnsubscribeUrl({
      deliveryId,
      secret: this.requireSecret(),
      apiPublicUrl,
    });
  }

  async inspect(token: string) {
    const deliveryId = verifyEmailUnsubscribeToken(token, this.requireSecret());
    const delivery = await this.prisma.client.emailDelivery.findUnique({
      where: { id: deliveryId },
      select: { id: true, recipientEmail: true },
    });
    if (!delivery) throw invalidToken();
    return delivery;
  }

  async unsubscribe(token: string) {
    const delivery = await this.inspect(token);
    const emailHash = hashEmailAddress(delivery.recipientEmail);
    await this.prisma.client.emailSuppression.upsert({
      where: { emailHash },
      create: {
        emailHash,
        reason: "RECIPIENT_SUPPRESSED",
        sourceDeliveryId: delivery.id,
      },
      update: {
        reason: "RECIPIENT_SUPPRESSED",
        sourceDeliveryId: delivery.id,
      },
    });
    return { suppressed: true as const };
  }

  private requireSecret(): string {
    const secret = this.configService
      .get<string>("EMAIL_UNSUBSCRIBE_SECRET")
      ?.trim();
    if (!secret) {
      throw new ServiceUnavailableException(
        "Email unsubscribe is not configured",
      );
    }
    return secret;
  }
}

export function hashEmailAddress(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export function createEmailUnsubscribeToken(
  deliveryId: string,
  secret: string,
): string {
  const signature = createHmac("sha256", secret).update(deliveryId).digest("hex");
  return `${deliveryId}.${signature}`;
}

export function createEmailUnsubscribeUrl(input: {
  deliveryId: string;
  secret: string;
  apiPublicUrl: string;
}): string {
  const token = createEmailUnsubscribeToken(input.deliveryId, input.secret);
  return `${input.apiPublicUrl.replace(/\/$/, "")}/v2/public/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

function verifyEmailUnsubscribeToken(token: string, secret: string): string {
  const separator = token.lastIndexOf(".");
  const deliveryId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (
    separator <= 0 ||
    signature.length !== SIGNATURE_HEX_LENGTH ||
    !/^[a-f0-9]+$/.test(signature)
  ) {
    throw invalidToken();
  }

  const expected = createHmac("sha256", secret).update(deliveryId).digest();
  const actual = Buffer.from(signature, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw invalidToken();
  }
  return deliveryId;
}

function invalidToken() {
  return new BadRequestException("Invalid unsubscribe link");
}
