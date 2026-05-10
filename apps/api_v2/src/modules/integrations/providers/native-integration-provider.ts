import type { IntegrationProvider } from "@workspace/database/prisma";
import type { ConnectedAccountToken } from "../token-providers/connected-account-token-provider.js";

export type NativeIntegrationDelivery = {
  id: string;
  projectId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

export type NativeIntegrationConnection = {
  id: string;
  provider: IntegrationProvider;
  config: Record<string, unknown>;
};

export type NativeIntegrationProviderInput = {
  token: ConnectedAccountToken;
  connection: NativeIntegrationConnection;
  delivery: NativeIntegrationDelivery;
};

export type NativeIntegrationProviderResult = {
  externalId?: string;
  externalUrl?: string;
  response: Record<string, unknown>;
};

export interface NativeIntegrationProvider {
  readonly provider: IntegrationProvider;
  deliver(
    input: NativeIntegrationProviderInput,
  ): Promise<NativeIntegrationProviderResult>;
}
