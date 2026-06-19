import { Module } from "@nestjs/common";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { BillingModule } from "../billing/billing.module.js";
import { FormsController } from "./forms.controller.js";
import {
  RuntimeFormsController,
  RuntimeSnapshotsController,
} from "./runtime-forms.controller.js";
import { FormsService } from "./forms.service.js";

@Module({
  imports: [AuthzModule, BillingModule],
  controllers: [
    FormsController,
    RuntimeFormsController,
    RuntimeSnapshotsController,
  ],
  providers: [FormsService],
})
export class FormsModule {}
