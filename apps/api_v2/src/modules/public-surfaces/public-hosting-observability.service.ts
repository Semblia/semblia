import { Injectable } from "@nestjs/common";
import type { PublicSurfaceFeature } from "@workspace/database/prisma";
import { normalizePublicHostname } from "@workspace/types";

export type PublicHostingEventName =
  | "public_host_resolution"
  | "public_host_cross_project_rejection"
  | "forms_runtime_signature_rejection"
  | "forms_runtime_legacy_use"
  | "public_wall_missing_primary";

export type PublicHostingEventOutcome = "hit" | "miss" | "rejected" | "used";

export type PublicHostingEventReason =
  | "canonical"
  | "alias"
  | "invalid_hostname"
  | "host_not_found"
  | "ineligible_host"
  | "missing_project"
  | "project_resource_mismatch"
  | "resource_owner_mismatch"
  | "default_conflict"
  | "no_primary_wall"
  | "invalid_runtime_signature"
  | "invalid_runtime_operation"
  | "invalid_legacy_runtime_request"
  | "legacy_project_on_wildcard_host"
  | "host_resolution_failed"
  | "legacy_exact_host";

export interface PublicHostingEvent {
  event: PublicHostingEventName;
  outcome: PublicHostingEventOutcome;
  reason: PublicHostingEventReason;
  hostname?: string;
  projectId?: string;
  feature?: PublicSurfaceFeature;
  requestId?: string;
}

type PublicHostingEventWriter = (
  event: PublicHostingEvent & { metricValue: 1 },
) => void;

@Injectable()
export class PublicHostingObservabilityService {
  constructor(
    private readonly write: PublicHostingEventWriter = (event) => {
      console.info(JSON.stringify(event));
    },
  ) {}

  record(event: PublicHostingEvent): void {
    const output: PublicHostingEvent & { metricValue: 1 } = {
      event: event.event,
      outcome: event.outcome,
      reason: event.reason,
      metricValue: 1,
    };
    const hostname = event.hostname
      ? normalizePublicHostname(event.hostname.trim())
      : null;
    if (hostname) output.hostname = hostname;

    const projectId = sanitizeIdentifier(event.projectId);
    if (projectId) output.projectId = projectId;
    if (event.feature) output.feature = event.feature;

    const requestId = sanitizeIdentifier(event.requestId);
    if (requestId) output.requestId = requestId;

    this.write(output);
  }
}

function sanitizeIdentifier(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 128) return undefined;
  return /^[A-Za-z0-9._:-]+$/.test(normalized) ? normalized : undefined;
}
