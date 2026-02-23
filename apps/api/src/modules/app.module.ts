import { Module } from "@nestjs/common";

import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { BotModule } from "./bot/bot.module";
import { CouplesModule } from "./couples/couples.module";
import { HealthModule } from "./health/health.module";
import { ProfileModule } from "./profile/profile.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SummaryModule } from "./summary/summary.module";
import { TransactionsModule } from "./transactions/transactions.module";

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, CouplesModule, TransactionsModule, SummaryModule, ProfileModule, BotModule, AdminModule]
})
export class AppModule {}
