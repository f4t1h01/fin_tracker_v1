import { Module } from "@nestjs/common";

import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { ProfileVoiceController } from "./voice/profile-voice.controller";
import { ProfileVoiceService } from "./voice/profile-voice.service";

@Module({
  controllers: [ProfileController, ProfileVoiceController],
  providers: [ProfileService, ProfileVoiceService]
})
export class ProfileModule {}
