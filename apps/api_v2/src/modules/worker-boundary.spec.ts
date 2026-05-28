import { describe, expect, it } from "vitest";
import { ExportDeliveryProcessor } from "./exports/export-delivery.processor.js";
import { ExportsModule } from "./exports/exports.module.js";
import { IntegrationDeliveryProcessor } from "./integrations/integration-delivery.processor.js";
import { IntegrationsModule } from "./integrations/integrations.module.js";
import { OutboundWebhooksModule } from "./outbound-webhooks/outbound-webhooks.module.js";
import { OutboundWebhooksProcessor } from "./outbound-webhooks/outbound-webhooks.processor.js";

const PROVIDERS_METADATA = "providers";

function moduleProviders(module: object): unknown[] {
  return Reflect.getMetadata(PROVIDERS_METADATA, module) ?? [];
}

describe("worker boundary", () => {
  it("keeps queue processors out of HTTP feature modules", () => {
    expect(moduleProviders(OutboundWebhooksModule)).not.toContain(
      OutboundWebhooksProcessor,
    );
    expect(moduleProviders(ExportsModule)).not.toContain(
      ExportDeliveryProcessor,
    );
    expect(moduleProviders(IntegrationsModule)).not.toContain(
      IntegrationDeliveryProcessor,
    );
  });

  it("registers queue processors only in worker modules", async () => {
    const { OutboundWebhooksWorkerModule } = await import(
      "./outbound-webhooks/outbound-webhooks.worker.module.js"
    );
    const { ExportsWorkerModule } = await import(
      "./exports/exports.worker.module.js"
    );
    const { IntegrationsWorkerModule } = await import(
      "./integrations/integrations.worker.module.js"
    );

    expect(moduleProviders(OutboundWebhooksWorkerModule)).toContain(
      OutboundWebhooksProcessor,
    );
    expect(moduleProviders(ExportsWorkerModule)).toContain(
      ExportDeliveryProcessor,
    );
    expect(moduleProviders(IntegrationsWorkerModule)).toContain(
      IntegrationDeliveryProcessor,
    );
  });
});
