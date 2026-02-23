import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { CreateCoupleDto } from "./dto/create-couple.dto";

@Injectable()
export class CouplesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCoupleDto) {
    return this.prisma.client.couple.create({
      data: {
        name: dto.name,
        createdById: userId,
        memberships: {
          create: {
            userId,
            role: "OWNER"
          }
        }
      },
      include: {
        memberships: true
      }
    });
  }

  async listForUser(userId: string) {
    return this.prisma.client.couple.findMany({
      where: {
        memberships: {
          some: {
            userId
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        memberships: {
          where: { userId },
          select: { role: true }
        }
      }
    });
  }
}
