import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { PublicSurfacesController } from "./public-surfaces.controller.js";
import { PublicSurfacesService } from "./public-surfaces.service.js";

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [PublicSurfacesController],
  providers: [PublicSurfacesService],
})
export class PublicSurfacesModule {}
