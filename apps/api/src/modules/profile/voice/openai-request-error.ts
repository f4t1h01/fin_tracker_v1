import { BadGatewayException } from "@nestjs/common";

import type { AiUsageTokenBreakdown } from "../../ai/ai-usage.types";

export class OpenAiRequestError extends BadGatewayException {
  constructor(
    message: string,
    readonly details?: {
      usage?: AiUsageTokenBreakdown | null;
      providerRequestId?: string | null;
    }
  ) {
    super(message);
  }
}
