import { Module } from "@nestjs/common";

import { EmailDeliveryService } from "../common/email-delivery.service";
import { SecretBoxService } from "../common/secret-box.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, EmailDeliveryService, SecretBoxService],
  exports: [JwtAuthGuard]
})
export class AuthModule {}
