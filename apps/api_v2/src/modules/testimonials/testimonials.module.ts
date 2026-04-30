import { Module } from "@nestjs/common";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import {
  PublicTestimonialsController,
  TestimonialsController,
} from "./testimonials.controller.js";
import { PublicSubmitThrottlerGuard } from "./public-submit-throttler.guard.js";
import { PublicSubmitTrustService } from "./public-submit-trust.service.js";
import { TestimonialsService } from "./testimonials.service.js";

@Module({
  imports: [AuthzModule, ProjectsModule],
  controllers: [TestimonialsController, PublicTestimonialsController],
  providers: [
    TestimonialsService,
    PublicSubmitTrustService,
    PublicSubmitThrottlerGuard,
  ],
  exports: [PublicSubmitTrustService, PublicSubmitThrottlerGuard],
})
export class TestimonialsModule {}
