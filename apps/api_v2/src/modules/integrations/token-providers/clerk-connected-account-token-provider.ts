import { Inject, Injectable, ForbiddenException } from "@nestjs/common";
import { ClerkService } from "../../clerk/clerk.service.js";
import type {
  ConnectedAccountToken,
  ConnectedAccountTokenProvider,
  ConnectedAccountTokenRequest,
} from "./connected-account-token-provider.js";

@Injectable()
export class ClerkConnectedAccountTokenProvider
  implements ConnectedAccountTokenProvider
{
  constructor(
    @Inject(ClerkService) private readonly clerkService: ClerkService,
  ) {}

  async getToken({
    userId,
    provider,
    requiredScopes,
  }: ConnectedAccountTokenRequest): Promise<ConnectedAccountToken> {
    const token = await this.clerkService.getUserOauthAccessToken(
      userId,
      provider,
    );

    if (!token?.accessToken) {
      throw new ForbiddenException(
        `Connect ${provider} before exporting to this integration`,
      );
    }

    return {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      scopes: token.scopes.length > 0 ? token.scopes : requiredScopes,
    };
  }
}
