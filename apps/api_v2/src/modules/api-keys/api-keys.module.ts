import { Module } from "@nestjs/common";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { ApiKeysController } from "./api-keys.controller.js";
import { ApiKeyAuthenticator, ApiKeyAuthGuard } from "./api-key-auth.guard.js";
import { ApiKeysService } from "./api-keys.service.js";

@Module({
  imports: [AuthzModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyAuthenticator, ApiKeyAuthGuard],
  exports: [ApiKeysService, ApiKeyAuthenticator, ApiKeyAuthGuard],
})
export class ApiKeysModule {}
