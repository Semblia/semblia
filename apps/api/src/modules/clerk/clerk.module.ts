import { Global, Module } from "@nestjs/common";
import { ClerkService } from "./clerk.service.js";

@Global()
@Module({
  providers: [ClerkService],
  exports: [ClerkService],
})
export class ClerkModule {}
