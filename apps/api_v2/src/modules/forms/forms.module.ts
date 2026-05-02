import { Module } from "@nestjs/common";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { RedisModule } from "../redis/redis.module.js";
import { StudioDraftsModule } from "../studio-drafts/studio-drafts.module.js";
import { TestimonialsModule } from "../testimonials/testimonials.module.js";
import { FormsController, PublicFormsController } from "./forms.controller.js";
import { FormsService } from "./forms.service.js";

@Module({
  imports: [
    AuthzModule,
    ProjectsModule,
    TestimonialsModule,
    RedisModule,
    StudioDraftsModule,
  ],
  controllers: [FormsController, PublicFormsController],
  providers: [FormsService],
})
export class FormsModule {}
