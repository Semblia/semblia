import { Module } from "@nestjs/common";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { BillingModule } from "../billing/billing.module.js";
import { PublicSurfacesModule } from "../public-surfaces/public-surfaces.module.js";
import { FormsController } from "./forms.controller.js";
import { RuntimeFormsController } from "./runtime-forms.controller.js";
import { FormsService } from "./forms.service.js";

@Module({
  imports: [AuthzModule, BillingModule, PublicSurfacesModule],
  controllers: [FormsController, RuntimeFormsController],
  providers: [FormsService],
})
export class FormsModule {}
