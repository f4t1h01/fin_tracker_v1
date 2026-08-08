import { Global, Module } from "@nestjs/common";

import { AiQuotaService } from "./ai-quota.service";
import { AiThreadService } from "./ai-thread.service";
import { AiUsageService } from "./ai-usage.service";

@Global()
@Module({
  providers: [AiUsageService, AiThreadService, AiQuotaService],
  exports: [AiUsageService, AiThreadService, AiQuotaService]
})
export class AiModule {}
