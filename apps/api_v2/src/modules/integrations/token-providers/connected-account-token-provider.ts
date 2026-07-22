export type ConnectedProvider =
  | "slack"
  | "notion"
  | "linear"
  | "github"
  | "x"
  | "linkedin"
  | "google";

export type ConnectedAccountTokenRequest = {
  userId: string;
  provider: ConnectedProvider;
  requiredScopes: string[];
  requireScopeEvidence?: boolean;
};

export type ConnectedAccountToken = {
  accessToken: string;
  expiresAt?: Date;
  scopes: string[];
};

export interface ConnectedAccountTokenProvider {
  getToken(
    request: ConnectedAccountTokenRequest,
  ): Promise<ConnectedAccountToken>;
}

export const CONNECTED_ACCOUNT_TOKEN_PROVIDER =
  "CONNECTED_ACCOUNT_TOKEN_PROVIDER";
