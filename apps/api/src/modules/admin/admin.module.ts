import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AdminAuditService } from "./admin-audit.service";
import { AdminAuthService } from "./admin-auth.service";
import { AdminController } from "./admin.controller";
import { AdminMutationService } from "./admin-mutation.service";
import { AdminRateLimitGuard } from "./admin-rate-limit.guard";
import { AdminRateLimitService } from "./admin-rate-limit.service";
import { AdminReadService } from "./admin-read.service";
import { AdminSessionGuard } from "./admin-session.guard";
import { AdminSqlService } from "./admin-sql.service";

@Module({
  controllers: [AdminController],
  providers: [
    AdminAuditService,
    AdminAuthService,
    AdminReadService,
    AdminMutationService,
    AdminSqlService,
    AdminSessionGuard,
    AdminRateLimitService,
    AdminRateLimitGuard,
    Reflector
  ]
})
export class AdminModule {}
