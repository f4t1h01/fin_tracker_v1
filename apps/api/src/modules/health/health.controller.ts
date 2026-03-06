import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    try {
      await this.prisma.ping();
    } catch {
      throw new ServiceUnavailableException("Database is not reachable");
    }

    return {
      ok: true,
      service: "api",
      timestamp: new Date().toISOString()
    };
  }
}
