import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClerkClient, type ClerkClient } from "@clerk/backend";
import type { ClerkUserPayloadDto } from "../users/users.dto.js";

@Injectable()
export class ClerkService {
  private readonly client: ClerkClient | null;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>("CLERK_SECRET_KEY");
    this.client = secretKey
      ? createClerkClient({
          secretKey,
          publishableKey: this.configService.get<string>(
            "CLERK_PUBLISHABLE_KEY",
          ),
        })
      : null;
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  getClient(): ClerkClient | null {
    return this.client;
  }

  async getUserPayload(userId: string): Promise<ClerkUserPayloadDto | null> {
    const client = this.getClient();
    if (!client) return null;

    const user = await client.users.getUser(userId);
    return {
      id: user.id,
      emailAddresses: user.emailAddresses.map((emailAddress) => ({
        id: emailAddress.id,
        emailAddress: emailAddress.emailAddress,
      })),
      primaryEmailAddressId: user.primaryEmailAddressId ?? undefined,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl || null,
    };
  }

  async getUserOauthAccessToken(userId: string, provider: string) {
    const client = this.getClient();
    if (!client) return null;

    const response = (await client.users.getUserOauthAccessToken(
      userId,
      provider as never,
    )) as {
      data?: Array<{
        token?: string | null;
        scopes?: string[] | null;
        expiresAt?: string | number | null;
      }>;
    };
    const token = response.data?.[0];
    if (!token?.token) return null;

    return {
      accessToken: token.token,
      scopes: token.scopes ?? [],
      expiresAt: parseExpiresAt(token.expiresAt),
    };
  }
}

function parseExpiresAt(value: string | number | null | undefined) {
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  return undefined;
}
