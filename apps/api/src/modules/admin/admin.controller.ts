import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";

import { AdminJwtGuard } from "./admin-jwt.guard";
import { AdminService } from "./admin.service";
import { CurrentAdmin } from "./current-admin.decorator";
import { AdminLoginDto } from "./dto/admin-login.dto";

@Controller("0admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("login")
  login(@Body() payload: AdminLoginDto) {
    return this.adminService.login(payload.email, payload.password);
  }

  @UseGuards(AdminJwtGuard)
  @Get("me")
  me(@CurrentAdmin() admin: { email: string }) {
    return this.adminService.me(admin.email);
  }

  @UseGuards(AdminJwtGuard)
  @Get("metrics")
  async metrics() {
    const [users, couples, transactions, categories] = await this.adminService.dashboardMetrics();

    return { users, couples, transactions, categories };
  }

  @UseGuards(AdminJwtGuard)
  @Get("users")
  async users() {
    const users = await this.adminService.latestUsers();
    return users.map((item) => ({
      ...item,
      telegramId: item.telegramId.toString()
    }));
  }
}
