import { Global, Module } from "@nestjs/common";

import { AiThreadService } from "./ai-thread.service";
import { AiUsageService } from "./ai-usage.service";

@Global()
@Module({
  providers: [AiUsageService, AiThreadService],
  exports: [AiUsageService, AiThreadService]
})
export class AiModule {}
