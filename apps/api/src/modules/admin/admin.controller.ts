import { Controller, Get, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminService } from "./admin.service";

@UseGuards(JwtAuthGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("metrics")
  async metrics(@CurrentUser() user: { id: string }) {
    await this.adminService.assertAdmin(user.id);
    const [users, couples, transactions, categories] = await this.adminService.dashboardMetrics();

    return { users, couples, transactions, categories };
  }

  @Get("users")
  async users(@CurrentUser() user: { id: string }) {
    await this.adminService.assertAdmin(user.id);
    const users = await this.adminService.latestUsers();
    return users.map((item) => ({
      ...item,
      telegramId: item.telegramId.toString()
    }));
  }
}
