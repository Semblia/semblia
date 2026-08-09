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

export type NativeIntegrationResource = {
  id: string;
  label: string;
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type NativeIntegrationResourceList = {
  provider: IntegrationProvider;
  items: NativeIntegrationResource[];
  nextCursor: string | null;
};

export type NativeIntegrationResourceListInput = {
  token: ConnectedAccountToken;
  query?: string;
  cursor?: string;
};

export interface NativeIntegrationProvider {
  readonly provider: IntegrationProvider;
  listResources(
    input: NativeIntegrationResourceListInput,
  ): Promise<NativeIntegrationResourceList>;
  deliver(
    input: NativeIntegrationProviderInput,
  ): Promise<NativeIntegrationProviderResult>;
}
