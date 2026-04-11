import { BadRequestException, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import type { FastifyRequest } from "fastify";

import { CurrentUser } from "../../auth/current-user.decorator";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
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
  constructor(private readonly profileImageService: ProfileImageService) {}

  @Post("me/image/draft")
  async draftImageTransaction(@CurrentUser() user: { id: string }, @Req() request: MultipartImageRequest) {
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
