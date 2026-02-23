import { Controller, Get, ParseIntPipe, Query, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SummaryService } from "./summary.service";

@UseGuards(JwtAuthGuard)
@Controller("summary")
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get("monthly")
  monthly(
    @CurrentUser() user: { id: string },
    @Query("coupleId") coupleId: string,
    @Query("month", ParseIntPipe) month: number,
    @Query("year", ParseIntPipe) year: number
  ) {
    return this.summaryService.monthly(user.id, coupleId, month, year);
  }
}
