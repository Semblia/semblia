import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { PublicSurfacesController } from "./public-surfaces.controller.js";
import { PublicHostingObservabilityService } from "./public-hosting-observability.service.js";
import { PublicSurfacesService } from "./public-surfaces.service.js";

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [PublicSurfacesController],
  providers: [PublicSurfacesService, PublicHostingObservabilityService],
  exports: [PublicSurfacesService, PublicHostingObservabilityService],
})
export class PublicSurfacesModule {}
