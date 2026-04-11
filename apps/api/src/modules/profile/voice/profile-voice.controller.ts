import { BadRequestException, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import type { FastifyRequest } from "fastify";

import { CurrentUser } from "../../auth/current-user.decorator";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
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
  constructor(private readonly profileVoiceService: ProfileVoiceService) {}

  @Post("me/voice/draft")
  async draftVoiceTransaction(@CurrentUser() user: { id: string }, @Req() request: MultipartVoiceRequest) {
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
