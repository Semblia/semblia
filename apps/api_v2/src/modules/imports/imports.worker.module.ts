import { Module } from "@nestjs/common";
import { ImportsCoreModule } from "./imports.core.module.js";
import { ImportsProcessor } from "./imports.processor.js";
@Module({ imports: [ImportsCoreModule], providers: [ImportsProcessor] })
export class ImportsWorkerModule {}
