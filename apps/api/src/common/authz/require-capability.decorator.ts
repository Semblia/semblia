import { SetMetadata } from "@nestjs/common";
import { Capability } from "./capabilities.js";

export const REQUIRED_CAPABILITIES_KEY = "requiredCapabilities";
export const RequireCapability = (...caps: Capability[]) =>
  SetMetadata(REQUIRED_CAPABILITIES_KEY, caps);
