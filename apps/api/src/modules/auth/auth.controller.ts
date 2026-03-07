import { Body, Controller, Get, Headers, Patch, Post, UseGuards } from "@nestjs/common";

import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { BotWebAppLoginDto } from "./dto/bot-webapp-login.dto";
import { PasswordLoginDto } from "./dto/password-login.dto";
import { PasswordRegisterDto } from "./dto/password-register.dto";
import { PasswordSetupDto } from "./dto/password-setup.dto";
import { TelegramLoginDto } from "./dto/telegram-login.dto";
import { TelegramWebAppLoginDto } from "./dto/telegram-webapp-login.dto";
import { UpdateThemePreferenceDto } from "./dto/update-theme-preference.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("telegram")
  loginWithTelegram(@Body() payload: TelegramLoginDto, @Headers("authorization") authorizationHeader?: string) {
    return this.authService.loginWithTelegram(payload, authorizationHeader);
  }

  @Post("telegram-webapp")
  loginFromTelegramWebApp(@Body() payload: TelegramWebAppLoginDto, @Headers("authorization") authorizationHeader?: string) {
    return this.authService.loginFromTelegramWebApp(payload.initData, authorizationHeader, payload.linkToken);
  }

  @Post("bot-webapp")
  loginFromBotWebApp(@Body() payload: BotWebAppLoginDto, @Headers("authorization") authorizationHeader?: string) {
    return this.authService.loginFromBotWebApp(payload, authorizationHeader);
  }

  @Post("password/login")
  loginWithPassword(@Body() payload: PasswordLoginDto) {
    return this.authService.loginWithPassword(payload);
  }

  @Post("password/register")
  registerWithPassword(@Body() payload: PasswordRegisterDto) {
    return this.authService.registerWithPassword(payload);
  }

  @UseGuards(JwtAuthGuard)
  @Post("password/setup")
  setupPassword(@CurrentUser() user: { id: string }, @Body() payload: PasswordSetupDto) {
    return this.authService.setupPassword(user.id, payload);
  }

  @UseGuards(JwtAuthGuard)
  @Post("telegram/link-token")
  createTelegramLinkToken(@CurrentUser() user: { id: string }) {
    return this.authService.createTelegramLinkToken(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: { id: string }) {
    const data = await this.authService.me(user.id);
    return {
      ...data,
      telegramId: data.telegramId.toString(),
      lastTelegramChatId: data.lastTelegramChatId ? data.lastTelegramChatId.toString() : null
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch("preferences/theme")
  setThemePreference(@CurrentUser() user: { id: string }, @Body() payload: UpdateThemePreferenceDto) {
    return this.authService.setThemePreference(user.id, payload.isDark);
  }
}
