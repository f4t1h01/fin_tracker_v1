import { Module } from "@nestjs/common";

import { ProfileController } from "./profile.controller";
import { ProfileImageController } from "./image/profile-image.controller";
import { ProfileImageService } from "./image/profile-image.service";
import { ProfileService } from "./profile.service";
import { ProfileVoiceController } from "./voice/profile-voice.controller";
import { ProfileVoiceService } from "./voice/profile-voice.service";

@Module({
  controllers: [ProfileController, ProfileVoiceController, ProfileImageController],
  providers: [ProfileService, ProfileVoiceService, ProfileImageService]
})
export class ProfileModule {}
