import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CouplesService } from "./couples.service";
import { CreateCoupleDto } from "./dto/create-couple.dto";

@UseGuards(JwtAuthGuard)
@Controller("couples")
export class CouplesController {
  constructor(private readonly couplesService: CouplesService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateCoupleDto) {
    return this.couplesService.create(user.id, dto);
  }

  @Get("mine")
  listMine(@CurrentUser() user: { id: string }) {
    return this.couplesService.listForUser(user.id);
  }
}
