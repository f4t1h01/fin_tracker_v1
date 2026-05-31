import { Body, Controller, Get, Headers, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { BotWebAppLoginDto } from "./dto/bot-webapp-login.dto";
import { EmailCodeLoginDto } from "./dto/email-code-login.dto";
import { EmailCodeRequestDto } from "./dto/email-code-request.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { PasswordChangeDto } from "./dto/password-change.dto";
import { PasswordLoginDto } from "./dto/password-login.dto";
import { PasswordRegisterDto } from "./dto/password-register.dto";
import { PasswordResetConfirmDto } from "./dto/password-reset-confirm.dto";
import { PasswordSetupDto } from "./dto/password-setup.dto";
import { TelegramLoginDto } from "./dto/telegram-login.dto";
import { TelegramWebAppLoginDto } from "./dto/telegram-webapp-login.dto";
import { UpdateThemePreferenceDto } from "./dto/update-theme-preference.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

function getRequestMeta(request: FastifyRequest) {
  return {
    ip: request.ip ?? null,
    userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null
  };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("providers")
  authProviders() {
    return this.authService.authProviders();
  }

  @Post("google/login")
  loginWithGoogle(@Body() payload: GoogleLoginDto, @Headers("authorization") authorizationHeader?: string) {
    return this.authService.loginWithGoogle(payload, authorizationHeader);
  }

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

  @Post("email-code/request")
  requestEmailLoginCode(@Body() payload: EmailCodeRequestDto, @Req() request: FastifyRequest) {
    return this.authService.requestEmailLoginCode(payload, getRequestMeta(request));
  }

  @Post("email-code/login")
  loginWithEmailCode(@Body() payload: EmailCodeLoginDto) {
    return this.authService.loginWithEmailCode(payload);
  }

  @Post("password/reset/request")
  requestPasswordResetCode(@Body() payload: EmailCodeRequestDto, @Req() request: FastifyRequest) {
    return this.authService.requestPasswordResetCode(payload, getRequestMeta(request));
  }

  @Post("password/reset/confirm")
  resetPasswordWithEmailCode(@Body() payload: PasswordResetConfirmDto) {
    return this.authService.resetPasswordWithEmailCode(payload);
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
  @Post("password/change")
  changePassword(@CurrentUser() user: { id: string }, @Body() payload: PasswordChangeDto) {
    return this.authService.changePassword(user.id, payload);
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
