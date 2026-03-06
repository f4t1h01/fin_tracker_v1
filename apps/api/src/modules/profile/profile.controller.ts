import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BindCoupleDto } from "./dto/bind-couple.dto";
import { CreateProfileTransactionDto } from "./dto/create-profile-transaction.dto";
import { UpdateProfileTransactionDto } from "./dto/update-profile-transaction.dto";
import { ProfileService } from "./profile.service";

@UseGuards(JwtAuthGuard)
@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: { id: string }) {
    return this.profileService.getProfile(user.id);
  }

  @Post("bind")
  bind(@CurrentUser() user: { id: string }, @Body() dto: BindCoupleDto) {
    return this.profileService.bindByCode(user.id, dto);
  }

  @Post("transactions")
  createTransaction(@CurrentUser() user: { id: string }, @Body() dto: CreateProfileTransactionDto) {
    return this.profileService.createTransaction(user.id, dto);
  }

  @Patch("transactions/:transactionId")
  updateTransaction(@CurrentUser() user: { id: string }, @Param("transactionId") transactionId: string, @Body() dto: UpdateProfileTransactionDto) {
    return this.profileService.updateTransaction(user.id, transactionId, dto);
  }

  @Delete("transactions/:transactionId")
  deleteTransaction(@CurrentUser() user: { id: string }, @Param("transactionId") transactionId: string) {
    return this.profileService.deleteTransaction(user.id, transactionId);
  }

  @Get("transactions/recent")
  recent(@CurrentUser() user: { id: string }) {
    return this.profileService.recentTransactions(user.id);
  }

  @Get("summary")
  summary(@CurrentUser() user: { id: string }, @Query("month") month?: string, @Query("year") year?: string) {
    const monthNumber = month ? Number(month) : undefined;
    const yearNumber = year ? Number(year) : undefined;
    return this.profileService.summary(user.id, monthNumber, yearNumber);
  }
}
