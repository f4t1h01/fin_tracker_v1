import { Body, Controller, Get, Headers, ParseIntPipe, Post, Query } from "@nestjs/common";

import { QuickAddDto } from "./dto/quick-add.dto";
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
}
