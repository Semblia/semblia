import { Module } from "@nestjs/common";
import { CapabilityGuard } from "./capability.guard.js";
import { ProjectAccessService } from "./project-access.service.js";

@Module({
  providers: [ProjectAccessService, CapabilityGuard],
  exports: [ProjectAccessService, CapabilityGuard],
})
export class AuthzModule {}
