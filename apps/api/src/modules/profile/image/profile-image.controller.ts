import { BadRequestException, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import type { FastifyRequest } from "fastify";

import { AiQuotaService } from "../../ai/ai-quota.service";
import { CurrentUser } from "../../auth/current-user.decorator";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RateLimit } from "../../common/rate-limit.decorator";
import { RateLimitGuard } from "../../common/rate-limit.guard";
import { ProfileImageService } from "./profile-image.service";
import { PROFILE_UPLOAD_FILE_SIZE_LIMIT_BYTES } from "../upload.constants";

type MultipartImageRequest = FastifyRequest & {
  file: (options?: {
    limits?: {
      fileSize?: number;
    };
  }) => Promise<MultipartFile | undefined>;
};

@UseGuards(JwtAuthGuard)
@Controller("profile")
export class ProfileImageController {
  constructor(
    private readonly profileImageService: ProfileImageService,
    private readonly aiQuota: AiQuotaService
  ) {}

  // Receipt drafting also spawns image preprocessing, so the burst limit protects
  // CPU as well as the provider bill.
  @UseGuards(RateLimitGuard)
  @RateLimit({
    max: 8,
    windowMs: 60_000,
    scope: "ai-image-draft",
    keys: ["user", "ip"],
    message: "Too many receipt scans in a row. Wait a moment and try again."
  })
  @Post("me/image/draft")
  async draftImageTransaction(@CurrentUser() user: { id: string }, @Req() request: MultipartImageRequest) {
    await this.aiQuota.assertWithinDailyQuota(user.id, "RECEIPT_DRAFT");

    const file = await request.file({
      limits: {
        fileSize: PROFILE_UPLOAD_FILE_SIZE_LIMIT_BYTES
      }
    });

    if (!file) {
      throw new BadRequestException("Upload a receipt image first");
    }

    return this.profileImageService.createDraft(user.id, file);
  }
}
