import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClerkClient, type ClerkClient } from "@clerk/backend";

@Injectable()
export class ClerkService {
  private readonly client: ClerkClient | null;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>("CLERK_SECRET_KEY");
    this.client = secretKey
      ? createClerkClient({
          secretKey,
          publishableKey:
            this.configService.get<string>("CLERK_PUBLISHABLE_KEY"),
        })
      : null;
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  getClient(): ClerkClient | null {
    return this.client;
  }
}
