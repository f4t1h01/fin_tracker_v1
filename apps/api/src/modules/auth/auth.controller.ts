import { Body, Controller, Get, Headers, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { RateLimit } from "../common/rate-limit.decorator";
import { RateLimitGuard } from "../common/rate-limit.guard";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { BotWebAppLoginDto } from "./dto/bot-webapp-login.dto";
import { EmailCheckDto } from "./dto/email-check.dto";
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

/**
 * Every credential-accepting route is rate limited on both the caller address and
 * the targeted email, so neither a single noisy client nor a distributed attempt
 * against one account can grind through passwords or six-digit codes.
 */
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("providers")
  authProviders() {
    return this.authService.authProviders();
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 20, windowMs: 15 * 60_000, scope: "auth-google-login" })
  @Post("google/login")
  loginWithGoogle(@Body() payload: GoogleLoginDto, @Headers("authorization") authorizationHeader?: string) {
    return this.authService.loginWithGoogle(payload, authorizationHeader);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 30, windowMs: 15 * 60_000, scope: "auth-telegram-login" })
  @Post("telegram")
  loginWithTelegram(@Body() payload: TelegramLoginDto, @Headers("authorization") authorizationHeader?: string) {
    return this.authService.loginWithTelegram(payload, authorizationHeader);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 60, windowMs: 15 * 60_000, scope: "auth-telegram-webapp" })
  @Post("telegram-webapp")
  loginFromTelegramWebApp(@Body() payload: TelegramWebAppLoginDto, @Headers("authorization") authorizationHeader?: string) {
    return this.authService.loginFromTelegramWebApp(payload.initData, authorizationHeader, payload.linkToken);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 60, windowMs: 15 * 60_000, scope: "auth-bot-webapp" })
  @Post("bot-webapp")
  loginFromBotWebApp(@Body() payload: BotWebAppLoginDto, @Headers("authorization") authorizationHeader?: string) {
    return this.authService.loginFromBotWebApp(payload, authorizationHeader);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({
    max: 10,
    windowMs: 15 * 60_000,
    scope: "auth-password-login",
    keys: ["ip", "email"],
    message: "Too many sign-in attempts. Try again later."
  })
  @Post("password/login")
  loginWithPassword(@Body() payload: PasswordLoginDto) {
    return this.authService.loginWithPassword(payload);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 30, windowMs: 15 * 60_000, scope: "auth-email-check", keys: ["ip"] })
  @Post("email/check")
  checkEmail(@Body() payload: EmailCheckDto, @Req() request: FastifyRequest) {
    return this.authService.checkEmail(payload, getRequestMeta(request));
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 10, windowMs: 15 * 60_000, scope: "auth-email-code-request", keys: ["ip", "email"] })
  @Post("email-code/request")
  requestEmailLoginCode(@Body() payload: EmailCodeRequestDto, @Req() request: FastifyRequest) {
    return this.authService.requestEmailLoginCode(payload, getRequestMeta(request));
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({
    max: 10,
    windowMs: 15 * 60_000,
    scope: "auth-email-code-login",
    keys: ["ip", "email"],
    message: "Too many code attempts. Try again later."
  })
  @Post("email-code/login")
  loginWithEmailCode(@Body() payload: EmailCodeLoginDto) {
    return this.authService.loginWithEmailCode(payload);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 10, windowMs: 15 * 60_000, scope: "auth-reset-request", keys: ["ip", "email"] })
  @Post("password/reset/request")
  requestPasswordResetCode(@Body() payload: EmailCodeRequestDto, @Req() request: FastifyRequest) {
    return this.authService.requestPasswordResetCode(payload, getRequestMeta(request));
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({
    max: 10,
    windowMs: 15 * 60_000,
    scope: "auth-reset-confirm",
    keys: ["ip", "email"],
    message: "Too many reset attempts. Try again later."
  })
  @Post("password/reset/confirm")
  resetPasswordWithEmailCode(@Body() payload: PasswordResetConfirmDto) {
    return this.authService.resetPasswordWithEmailCode(payload);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 10, windowMs: 60 * 60_000, scope: "auth-register-request", keys: ["ip", "email"] })
  @Post("register/request-code")
  requestRegistrationCode(@Body() payload: EmailCodeRequestDto, @Req() request: FastifyRequest) {
    return this.authService.requestRegistrationCode(payload, getRequestMeta(request));
  }

  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 10, windowMs: 60 * 60_000, scope: "auth-register", keys: ["ip", "email"] })
  @Post("password/register")
  registerWithPassword(@Body() payload: PasswordRegisterDto) {
    return this.authService.registerWithPassword(payload);
  }

  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ max: 10, windowMs: 60 * 60_000, scope: "auth-email-claim-request", keys: ["user", "email"] })
  @Post("email/claim/request")
  requestEmailClaimCode(
    @CurrentUser() user: { id: string },
    @Body() payload: EmailCodeRequestDto,
    @Req() request: FastifyRequest
  ) {
    return this.authService.requestEmailClaimCode(user.id, payload, getRequestMeta(request));
  }

  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ max: 10, windowMs: 60 * 60_000, scope: "auth-password-setup", keys: ["user"] })
  @Post("password/setup")
  setupPassword(@CurrentUser() user: { id: string }, @Body() payload: PasswordSetupDto) {
    return this.authService.setupPassword(user.id, payload);
  }

  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ max: 10, windowMs: 15 * 60_000, scope: "auth-password-change", keys: ["user"] })
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
