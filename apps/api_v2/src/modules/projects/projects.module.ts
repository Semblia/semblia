import { Module } from "@nestjs/common";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";
import { SigningSecretService } from "./signing-secret.service.js";

@Module({
  imports: [AuthzModule, OrganizationsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, SigningSecretService],
  exports: [SigningSecretService],
})
export class ProjectsModule {}
