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
    requireScopeEvidence = false,
  }: ConnectedAccountTokenRequest): Promise<ConnectedAccountToken> {
    const token = await this.clerkService.getUserOauthAccessToken(
      userId,
      provider,
    );

    if (!token?.accessToken) {
      throw new ForbiddenException(
        `Connect ${provider} before using this integration`,
      );
    }

    const grantedScopes = token.scopes ?? [];
    const missingScopes =
      grantedScopes.length > 0
        ? requiredScopes.filter((scope) => !grantedScopes.includes(scope))
        : requireScopeEvidence
          ? requiredScopes
          : [];
    if (missingScopes.length > 0) {
      throw new ForbiddenException(
        `Reconnect ${provider} with required scopes: ${missingScopes.join(", ")}`,
      );
    }

    return {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      scopes: grantedScopes.length > 0 ? grantedScopes : requiredScopes,
    };
  }
}
