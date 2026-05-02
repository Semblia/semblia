import { Module } from "@nestjs/common";
import { StudioDraftsService } from "./studio-drafts.service.js";

@Module({
  providers: [StudioDraftsService],
  exports: [StudioDraftsService],
})
export class StudioDraftsModule {}
