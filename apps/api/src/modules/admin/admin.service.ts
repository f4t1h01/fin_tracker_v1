import { ForbiddenException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAdmin(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    });

    if (!user?.isAdmin) {
      throw new ForbiddenException("Admin access required");
    }
  }

  dashboardMetrics() {
    return this.prisma.client.$transaction([
      this.prisma.client.user.count(),
      this.prisma.client.couple.count(),
      this.prisma.client.transaction.count(),
      this.prisma.client.category.count()
    ]);
  }

  latestUsers() {
    return this.prisma.client.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        isAdmin: true
      }
    });
  }
}
