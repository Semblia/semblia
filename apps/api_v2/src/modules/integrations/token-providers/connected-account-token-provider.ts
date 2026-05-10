export type ConnectedProvider = "slack" | "notion" | "linear" | "github";

export type ConnectedAccountTokenRequest = {
  userId: string;
  provider: ConnectedProvider;
  requiredScopes: string[];
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
