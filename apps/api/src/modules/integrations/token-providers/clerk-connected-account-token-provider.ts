import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { ClerkService } from "../../clerk/clerk.service.js";
import type {
  ConnectedAccountOrganizationMembershipRequest,
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

  async hasOrganizationMembership({
    userId,
    organizationId,
  }: ConnectedAccountOrganizationMembershipRequest): Promise<boolean> {
    const client = this.clerkService.getClient();
    if (!client)
      throw new ConflictException("Clerk organization access is unavailable");

    const memberships =
      await client.organizations.getOrganizationMembershipList({
        organizationId,
        userId: [userId],
        limit: 1,
        offset: 0,
      });

    return memberships.data.length > 0;
  }

  async getToken({
    userId,
    provider,
    requiredScopes,
    requireScopeEvidence = true,
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
    const missingScopes = this.getMissingScopes(
      grantedScopes,
      requiredScopes,
      requireScopeEvidence,
    );
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

  private getMissingScopes(
    grantedScopes: string[],
    requiredScopes: string[],
    requireScopeEvidence: boolean,
  ) {
    if (grantedScopes.length > 0) {
      return requiredScopes.filter((scope) => !grantedScopes.includes(scope));
    }
    return requireScopeEvidence ? requiredScopes : [];
  }
}
