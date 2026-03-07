import { Body, Controller, Get, Headers, ParseIntPipe, Post, Query } from "@nestjs/common";

import { LinkTelegramProfileDto } from "./dto/link-telegram-profile.dto";
import { QuickAddDto } from "./dto/quick-add.dto";
import { StoreTelegramPhoneDto } from "./dto/store-telegram-phone.dto";
import { BotService } from "./bot.service";

@Controller("bot")
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post("quick-add")
  async quickAdd(@Headers("x-bot-secret") secret: string | undefined, @Body() dto: QuickAddDto) {
    this.botService.verifySecret(secret);
    return this.botService.quickAdd(dto);
  }

  @Get("monthly-summary")
  async monthlySummary(
    @Headers("x-bot-secret") secret: string | undefined,
    @Query("telegramId") telegramId: string,
    @Query("month", ParseIntPipe) month: number,
    @Query("year", ParseIntPipe) year: number
  ) {
    this.botService.verifySecret(secret);
    return this.botService.monthlySummary(telegramId, month, year);
  }

  @Post("link-telegram-profile")
  async linkTelegramProfile(@Headers("x-bot-secret") secret: string | undefined, @Body() dto: LinkTelegramProfileDto) {
    this.botService.verifySecret(secret);
    return this.botService.linkTelegramProfile(dto);
  }

  @Post("store-telegram-phone")
  async storeTelegramPhone(@Headers("x-bot-secret") secret: string | undefined, @Body() dto: StoreTelegramPhoneDto) {
    this.botService.verifySecret(secret);
    return this.botService.storeTelegramPhone(dto);
  }
}
