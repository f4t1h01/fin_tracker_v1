import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BindCoupleDto } from "./dto/bind-couple.dto";
import { UpdateDashboardRatesDto } from "./dto/dashboard-rates.dto";
import { CreateCategoryDto, UpdateCategoryPreferencesDto, UpdateCategoryVisibilityDto } from "./dto/category-management.dto";
import { CreateProfileTransactionDto } from "./dto/create-profile-transaction.dto";
import { DashboardQueryDto } from "./dto/dashboard-query.dto";
import { UpdateAnalyticsPreferencesDto } from "./dto/update-analytics-preferences.dto";
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

  @Patch("me/preferences")
  updateMyPreferences(@CurrentUser() user: { id: string }, @Body() dto: UpdateAnalyticsPreferencesDto) {
    return this.profileService.updateAnalyticsPreferences(user.id, dto);
  }

  @Get("me/snapshot")
  mySnapshot(@CurrentUser() user: { id: string }, @Query("month") month?: string, @Query("year") year?: string) {
    const monthNumber = month ? Number(month) : undefined;
    const yearNumber = year ? Number(year) : undefined;
    return this.profileService.snapshot(user.id, monthNumber, yearNumber);
  }

  @Get("me/dashboard")
  myDashboard(@CurrentUser() user: { id: string }, @Query() query: DashboardQueryDto) {
    return this.profileService.dashboard(user.id, query);
  }

  @Get("me/dashboard/rates")
  myDashboardRates(@CurrentUser() user: { id: string }) {
    return this.profileService.dashboardRates(user.id);
  }

  @Patch("me/dashboard/rates")
  updateMyDashboardRates(@CurrentUser() user: { id: string }, @Body() dto: UpdateDashboardRatesDto) {
    return this.profileService.updateDashboardRates(user.id, dto);
  }

  @Post("me/bind")
  bindMe(@CurrentUser() user: { id: string }, @Body() dto: BindCoupleDto) {
    return this.profileService.bindByCode(user.id, dto);
  }

  @Delete("me/bind")
  unbindMe(@CurrentUser() user: { id: string }) {
    return this.profileService.unbindPartner(user.id);
  }

  @Get("me/categories")
  myCategories(@CurrentUser() user: { id: string }) {
    return this.profileService.getManagedCategories(user.id);
  }

  @Post("me/categories")
  createMyCategory(@CurrentUser() user: { id: string }, @Body() dto: CreateCategoryDto) {
    return this.profileService.createCategory(user.id, dto);
  }

  @Delete("me/categories/:categoryId")
  deleteMyCategory(@CurrentUser() user: { id: string }, @Param("categoryId") categoryId: string) {
    return this.profileService.deleteCategory(user.id, categoryId);
  }

  @Patch("me/categories/:categoryId/visibility")
  updateMyCategoryVisibility(@CurrentUser() user: { id: string }, @Param("categoryId") categoryId: string, @Body() dto: UpdateCategoryVisibilityDto) {
    return this.profileService.updateCategoryVisibility(user.id, categoryId, dto);
  }

  @Patch("me/category-preferences")
  updateMyCategoryPreferences(@CurrentUser() user: { id: string }, @Body() dto: UpdateCategoryPreferencesDto) {
    return this.profileService.updateCategoryPreferences(user.id, dto);
  }

  @Post("me/transactions")
  createMyTransaction(@CurrentUser() user: { id: string }, @Body() dto: CreateProfileTransactionDto) {
    console.info("[transaction:create] request", {
      userId: user.id,
      amount: dto.amount,
      kind: dto.kind,
      currency: dto.currency,
      hasCategoryId: Boolean(dto.categoryId),
      hasCategoryName: Boolean(dto.categoryName),
      hasNote: Boolean(dto.note),
      hasClientMutationId: Boolean(dto.clientMutationId)
    });
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
