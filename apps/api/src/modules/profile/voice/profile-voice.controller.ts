import { BadRequestException, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import type { FastifyRequest } from "fastify";

import { AiQuotaService } from "../../ai/ai-quota.service";
import { CurrentUser } from "../../auth/current-user.decorator";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RateLimit } from "../../common/rate-limit.decorator";
import { RateLimitGuard } from "../../common/rate-limit.guard";
import { ProfileVoiceService } from "./profile-voice.service";
import { PROFILE_UPLOAD_FILE_SIZE_LIMIT_BYTES } from "../upload.constants";

type MultipartVoiceRequest = FastifyRequest & {
  file: (options?: {
    limits?: {
      fileSize?: number;
    };
  }) => Promise<MultipartFile | undefined>;
};

@UseGuards(JwtAuthGuard)
@Controller("profile")
export class ProfileVoiceController {
  constructor(
    private readonly profileVoiceService: ProfileVoiceService,
    private readonly aiQuota: AiQuotaService
  ) {}

  // Two layers: a short burst limit to stop hammering, and a durable daily quota
  // so a single account cannot run up an unbounded provider bill.
  @UseGuards(RateLimitGuard)
  @RateLimit({
    max: 10,
    windowMs: 60_000,
    scope: "ai-voice-draft",
    keys: ["user", "ip"],
    message: "Too many voice drafts in a row. Wait a moment and try again."
  })
  @Post("me/voice/draft")
  async draftVoiceTransaction(@CurrentUser() user: { id: string }, @Req() request: MultipartVoiceRequest) {
    await this.aiQuota.assertWithinDailyQuota(user.id, "VOICE_DRAFT");

    const file = await request.file({
      limits: {
        fileSize: PROFILE_UPLOAD_FILE_SIZE_LIMIT_BYTES
      }
    });

    if (!file) {
      throw new BadRequestException("Upload a voice recording first");
    }

    return this.profileVoiceService.createDraft(user.id, file);
  }
}
