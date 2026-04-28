import { Module } from "@nestjs/common";
import { TestimonialsController } from "./testimonials.controller.js";
import { TestimonialsService } from "./testimonials.service.js";

@Module({
  controllers: [TestimonialsController],
  providers: [TestimonialsService],
})
export class TestimonialsModule {}
