import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BindCoupleDto } from "./dto/bind-couple.dto";
import { CreateProfileTransactionDto } from "./dto/create-profile-transaction.dto";
import { UpdateProfileDetailsDto } from "./dto/update-profile-details.dto";
import { UpdateProfileTransactionDto } from "./dto/update-profile-transaction.dto";
import { ProfileService } from "./profile.service";

@UseGuards(JwtAuthGuard)
@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get("me")
  getMyProfile(@CurrentUser() user: { id: string }) {
    return this.profileService.getProfile(user.id);
  }

  @Patch("me/details")
  async updateMyDetails(@CurrentUser() user: { id: string }, @Body() dto: UpdateProfileDetailsDto) {
    const updated = await this.profileService.updateDetails(user.id, dto);
    return {
      ...updated,
      telegramId: updated.telegramId.toString(),
      lastTelegramChatId: updated.lastTelegramChatId ? updated.lastTelegramChatId.toString() : null,
      birthday: updated.birthday ? updated.birthday.toISOString() : null
    };
  }

  @Get("me/snapshot")
  mySnapshot(@CurrentUser() user: { id: string }, @Query("month") month?: string, @Query("year") year?: string) {
    const monthNumber = month ? Number(month) : undefined;
    const yearNumber = year ? Number(year) : undefined;
    return this.profileService.snapshot(user.id, monthNumber, yearNumber);
  }

  @Get("me/dashboard")
  myDashboard(@CurrentUser() user: { id: string }, @Query("month") month?: string, @Query("year") year?: string) {
    const monthNumber = month ? Number(month) : undefined;
    const yearNumber = year ? Number(year) : undefined;
    return this.profileService.dashboard(user.id, monthNumber, yearNumber);
  }

  @Post("me/bind")
  bindMe(@CurrentUser() user: { id: string }, @Body() dto: BindCoupleDto) {
    return this.profileService.bindByCode(user.id, dto);
  }

  @Post("me/transactions")
  createMyTransaction(@CurrentUser() user: { id: string }, @Body() dto: CreateProfileTransactionDto) {
    return this.profileService.createTransaction(user.id, dto);
  }

  @Patch("me/transactions/:transactionId")
  updateMyTransaction(@CurrentUser() user: { id: string }, @Param("transactionId") transactionId: string, @Body() dto: UpdateProfileTransactionDto) {
    return this.profileService.updateTransaction(user.id, transactionId, dto);
  }

  @Delete("me/transactions/:transactionId")
  deleteMyTransaction(@CurrentUser() user: { id: string }, @Param("transactionId") transactionId: string) {
    return this.profileService.deleteTransaction(user.id, transactionId);
  }

  @Get("me/transactions/recent")
  recentMine(@CurrentUser() user: { id: string }) {
    return this.profileService.recentTransactions(user.id);
  }

  @Get("me/summary")
  mySummary(@CurrentUser() user: { id: string }, @Query("month") month?: string, @Query("year") year?: string, @Query("displayCurrency") displayCurrency?: string) {
    const monthNumber = month ? Number(month) : undefined;
    const yearNumber = year ? Number(year) : undefined;
    return this.profileService.summary(user.id, monthNumber, yearNumber, displayCurrency);
  }
}
