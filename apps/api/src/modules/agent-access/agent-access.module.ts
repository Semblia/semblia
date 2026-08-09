import { Module } from "@nestjs/common";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { ApiKeysModule } from "../api-keys/api-keys.module.js";
import { AgentAccessController } from "./agent-access.controller.js";
import { AgentAccessService } from "./agent-access.service.js";

@Module({
  imports: [AuthzModule, ApiKeysModule],
  controllers: [AgentAccessController],
  providers: [AgentAccessService],
})
export class AgentAccessModule {}
