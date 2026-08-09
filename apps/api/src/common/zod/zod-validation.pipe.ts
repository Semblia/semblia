import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";
import { ZodError, type ZodType } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodType) {}

  transform(value: unknown) {
    if (!this.schema) {
      return value;
    }

    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Validation failed",
          details: error.issues,
        });
      }

      throw error;
    }
  }
}
