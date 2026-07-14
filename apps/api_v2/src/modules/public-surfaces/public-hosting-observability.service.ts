import { Injectable } from "@nestjs/common";
import type { PublicSurfaceFeature } from "@workspace/database/prisma";

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
  | "no_primary_wall";

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
    this.write({ ...event, metricValue: 1 });
  }
}
