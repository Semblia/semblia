import { Module } from "@nestjs/common";
import { StorageModule } from "./storage.module.js";
import { MediaOptimizeProcessor } from "./media-optimize.processor.js";

@Module({
  imports: [StorageModule],
  providers: [MediaOptimizeProcessor],
})
export class MediaOptimizeWorkerModule {}
