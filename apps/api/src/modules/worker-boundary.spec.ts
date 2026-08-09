import { describe, expect, it } from "vitest";
import { AuthzModule } from "../common/authz/authz.module.js";
import { ExportDeliveryProcessor } from "./exports/export-delivery.processor.js";
import { ExportsModule } from "./exports/exports.module.js";
import { IntegrationDeliveryProcessor } from "./integrations/integration-delivery.processor.js";
import { IntegrationsModule } from "./integrations/integrations.module.js";
import { OutboundWebhooksModule } from "./outbound-webhooks/outbound-webhooks.module.js";
import { OutboundWebhooksProcessor } from "./outbound-webhooks/outbound-webhooks.processor.js";
import { ImportsModule } from "./imports/imports.module.js";
import { ImportsCoreModule } from "./imports/imports.core.module.js";
import { ImportsProcessor } from "./imports/imports.processor.js";
import { ImportQueueDispatcher } from "./imports/import-queue-dispatcher.js";
import { ImportSourceCleanupService } from "./imports/import-source-cleanup.service.js";

const PROVIDERS_METADATA = "providers";
const IMPORTS_METADATA = "imports";

function moduleProviders(module: object): unknown[] {
  return Reflect.getMetadata(PROVIDERS_METADATA, module) ?? [];
}

function moduleImports(module: object): unknown[] {
  return Reflect.getMetadata(IMPORTS_METADATA, module) ?? [];
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
    expect(moduleProviders(ImportsModule)).not.toContain(ImportsProcessor);
    expect(moduleProviders(ImportsModule)).toContain(ImportQueueDispatcher);
    expect(moduleProviders(ImportsModule)).toContain(
      ImportSourceCleanupService,
    );
  });

  it("keeps project authorization available in shared import workers", () => {
    expect(moduleImports(ImportsCoreModule)).toContain(AuthzModule);
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
    const { ImportsWorkerModule } = await import(
      "./imports/imports.worker.module.js"
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
    expect(moduleProviders(ImportsWorkerModule)).toContain(ImportsProcessor);
    expect(moduleProviders(ImportsWorkerModule)).not.toContain(
      ImportQueueDispatcher,
    );
    expect(moduleProviders(ImportsWorkerModule)).not.toContain(
      ImportSourceCleanupService,
    );
  });
});
