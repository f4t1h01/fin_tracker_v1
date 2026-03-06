import { Module } from "@nestjs/common";

import { AdminJwtGuard } from "./admin-jwt.guard";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminJwtGuard]
})
export class AdminModule {}
