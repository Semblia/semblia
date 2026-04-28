import {
  Inject,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  ClerkUserPayloadDto,
  UpdateUserProfileBodyDto,
} from "./users.dto.js";

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getMe(clerkUserId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: clerkUserId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateProfile(_clerkUserId: string, _body: UpdateUserProfileBodyDto) {
    throw new NotImplementedException("users.updateProfile not implemented");
  }

  async upsertFromClerk(payload: ClerkUserPayloadDto) {
    const email = payload.emailAddresses[0]?.emailAddress;
    if (!email) return;

    await this.prisma.client.user.upsert({
      where: { id: payload.id },
      create: {
        id: payload.id,
        email,
        firstName: payload.firstName ?? undefined,
        lastName: payload.lastName ?? undefined,
        avatar: payload.imageUrl ?? undefined,
      },
      update: {
        email,
        firstName: payload.firstName ?? undefined,
        lastName: payload.lastName ?? undefined,
        avatar: payload.imageUrl ?? undefined,
      },
    });
  }
}
