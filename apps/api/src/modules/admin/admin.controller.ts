import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import type { FastifyReply, FastifyRequest } from "fastify";

import { serializeAdminSessionClearCookie, serializeAdminSessionCookie } from "./admin-cookie.util";
import { AdminRateLimit } from "./admin-rate-limit.decorator";
import { AdminRateLimitGuard } from "./admin-rate-limit.guard";
import { type AdminRequestMeta } from "./admin-audit.service";
import { AdminAuthService } from "./admin-auth.service";
import { CurrentAdmin } from "./current-admin.decorator";
import { AdminReadService } from "./admin-read.service";
import { AdminSessionGuard } from "./admin-session.guard";
import { AdminSqlService } from "./admin-sql.service";
import { AdminMutationService } from "./admin-mutation.service";
import { AdminAiDemoService } from "./admin-ai-demo.service";
import { AdminAdminPasswordResetDto } from "./dto/admin-admin-password-reset.dto";
import { AdminAdminStatusDto } from "./dto/admin-admin-status.dto";
import { AdminAiPricingQueryDto } from "./dto/admin-ai-pricing-query.dto";
import { AdminAiPricingRetireDto } from "./dto/admin-ai-pricing-retire.dto";
import { AdminAiPricingUpsertDto } from "./dto/admin-ai-pricing-upsert.dto";
import { AdminAiUsageQueryDto } from "./dto/admin-ai-usage-query.dto";
import { AdminAuditQueryDto } from "./dto/admin-audit-query.dto";
import { AdminCategoriesQueryDto } from "./dto/admin-categories-query.dto";
import { AdminCategoryCorrectionDto } from "./dto/admin-category-correction.dto";
import { AdminInvalidateInviteDto } from "./dto/admin-invalidate-invite.dto";
import { AdminListQueryDto } from "./dto/admin-list-query.dto";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { AdminUserPasswordResetDto } from "./dto/admin-user-password-reset.dto";
import { AdminGoodsUomStatusDto } from "./dto/admin-goods-uom-status.dto";
import { AdminGoodsUomUpsertDto } from "./dto/admin-goods-uom-upsert.dto";
import { AdminSqlExecuteDto } from "./dto/admin-sql-execute.dto";
import { AdminTransactionCorrectionDto } from "./dto/admin-transaction-correction.dto";
import { AdminTransactionsQueryDto } from "./dto/admin-transactions-query.dto";
import { PROFILE_UPLOAD_FILE_SIZE_LIMIT_BYTES } from "../profile/upload.constants";

type MultipartImageRequest = FastifyRequest & {
  file: (options?: {
    limits?: {
      fileSize?: number;
    };
  }) => Promise<MultipartFile | undefined>;
};

function getRequestMeta(request: FastifyRequest): AdminRequestMeta {
  return {
    ip: request.ip ?? null,
    userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null,
    path: request.url ?? null
  };
}

function isSecureCookieRequest(request: FastifyRequest) {
  const protocolHeader = request.headers["x-forwarded-proto"];
  if (typeof protocolHeader === "string") {
    return protocolHeader.split(",")[0]?.trim() === "https";
  }

  return process.env.NODE_ENV === "production";
}

@UseGuards(AdminRateLimitGuard)
@Controller("0admin")
export class AdminController {
  constructor(
    private readonly authService: AdminAuthService,
    private readonly readService: AdminReadService,
    private readonly sqlService: AdminSqlService,
    private readonly mutationService: AdminMutationService,
    private readonly aiDemoService: AdminAiDemoService
  ) {}

  @AdminRateLimit({ max: 10, windowMs: 15 * 60_000, scope: "admin-login" })
  @Post("login")
  async login(
    @Body() payload: AdminLoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const result = await this.authService.login(payload.email, payload.password, getRequestMeta(request));
    reply.header("Set-Cookie", serializeAdminSessionCookie(result.accessToken, isSecureCookieRequest(request)));
    return {
      admin: result.admin
    };
  }

  @UseGuards(AdminSessionGuard)
  @Post("logout")
  async logout(
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    reply.header("Set-Cookie", serializeAdminSessionClearCookie(isSecureCookieRequest(request)));
    return this.authService.logout(admin.email, getRequestMeta(request));
  }

  @UseGuards(AdminSessionGuard)
  @Get("me")
  me(@CurrentAdmin() admin: { email: string }) {
    return this.authService.requireAdmin(admin.email);
  }

  @UseGuards(AdminSessionGuard)
  @Get("dashboard")
  dashboard() {
    return this.readService.dashboardSummary();
  }

  @UseGuards(AdminSessionGuard)
  @Get("users")
  users(@Query() query: AdminListQueryDto) {
    return this.readService.usersList(query);
  }

  @UseGuards(AdminSessionGuard)
  @Get("users/:id")
  userDetail(@Param("id") id: string) {
    return this.readService.userDetail(id);
  }

  @UseGuards(AdminSessionGuard)
  @Post("users/:id/password")
  resetUserPassword(
    @Param("id") id: string,
    @Body() dto: AdminUserPasswordResetDto,
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest
  ) {
    return this.mutationService.resetUserPassword(id, dto, admin.email, getRequestMeta(request));
  }

  @UseGuards(AdminSessionGuard)
  @Get("couples")
  couples(@Query() query: AdminListQueryDto) {
    return this.readService.couplesList(query);
  }

  @UseGuards(AdminSessionGuard)
  @Get("couples/:id")
  coupleDetail(@Param("id") id: string) {
    return this.readService.coupleDetail(id);
  }

  @UseGuards(AdminSessionGuard)
  @Post("couples/:coupleId/invites/:inviteId/invalidate")
  invalidateInvite(
    @Param("coupleId") coupleId: string,
    @Param("inviteId") inviteId: string,
    @Body() dto: AdminInvalidateInviteDto,
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest
  ) {
    return this.mutationService.invalidateInvite(coupleId, inviteId, dto, admin.email, getRequestMeta(request));
  }

  @UseGuards(AdminSessionGuard)
  @Get("transactions")
  transactions(@Query() query: AdminTransactionsQueryDto) {
    return this.readService.transactionsList(query);
  }

  @UseGuards(AdminSessionGuard)
  @Get("transactions/:id")
  transactionDetail(@Param("id") id: string) {
    return this.readService.transactionDetail(id);
  }

  @UseGuards(AdminSessionGuard)
  @Post("transactions/:id/correct")
  correctTransaction(
    @Param("id") id: string,
    @Body() dto: AdminTransactionCorrectionDto,
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest
  ) {
    return this.mutationService.correctTransaction(id, dto, admin.email, getRequestMeta(request));
  }

  @UseGuards(AdminSessionGuard)
  @Get("categories")
  categories(@Query() query: AdminCategoriesQueryDto) {
    return this.readService.categoriesList(query);
  }

  @UseGuards(AdminSessionGuard)
  @Get("categories/:id")
  categoryDetail(@Param("id") id: string) {
    return this.readService.categoryDetail(id);
  }

  @UseGuards(AdminSessionGuard)
  @Post("categories/:id/correct")
  correctCategory(
    @Param("id") id: string,
    @Body() dto: AdminCategoryCorrectionDto,
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest
  ) {
    return this.mutationService.correctCategory(id, dto, admin.email, getRequestMeta(request));
  }

  @UseGuards(AdminSessionGuard)
  @Get("security")
  security() {
    return this.readService.securitySummary();
  }

  @UseGuards(AdminSessionGuard)
  @Post("security/admins/:email/status")
  updateAdminStatus(
    @Param("email") email: string,
    @Body() dto: AdminAdminStatusDto,
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest
  ) {
    return this.mutationService.updateAdminStatus(email, dto, admin.email, getRequestMeta(request));
  }

  @UseGuards(AdminSessionGuard)
  @Post("security/admins/:email/password")
  resetAdminPassword(
    @Param("email") email: string,
    @Body() dto: AdminAdminPasswordResetDto,
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest
  ) {
    return this.mutationService.resetAdminPassword(email, dto, admin.email, getRequestMeta(request));
  }

  @UseGuards(AdminSessionGuard)
  @Get("ai-usage")
  aiUsage(@Query() query: AdminAiUsageQueryDto) {
    return this.readService.aiUsageList(query);
  }

  @UseGuards(AdminSessionGuard)
  @Get("ai-usage/summary")
  aiUsageSummary(@Query() query: AdminAiUsageQueryDto) {
    return this.readService.aiUsageSummary(query);
  }

  @UseGuards(AdminSessionGuard)
  @Get("ai-pricing")
  aiPricing(@Query() query: AdminAiPricingQueryDto) {
    return this.readService.aiPricingList(query);
  }

  @UseGuards(AdminSessionGuard)
  @Post("ai-pricing")
  setAiPricing(
    @Body() dto: AdminAiPricingUpsertDto,
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest
  ) {
    return this.mutationService.setAiModelPricing(dto, admin.email, getRequestMeta(request));
  }

  @UseGuards(AdminSessionGuard)
  @Post("ai-pricing/:id/retire")
  retireAiPricing(
    @Param("id") id: string,
    @Body() dto: AdminAiPricingRetireDto,
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest
  ) {
    return this.mutationService.retireAiModelPricing(id, dto, admin.email, getRequestMeta(request));
  }

  @UseGuards(AdminSessionGuard)
  @Post("ai-demo/image-draft")
  async createImageDraftDemo(
    @Query("targetUserId") targetUserId: string | undefined,
    @Req() request: MultipartImageRequest
  ) {
    if (!targetUserId?.trim()) {
      throw new BadRequestException("targetUserId is required");
    }

    const file = await request.file({
      limits: {
        fileSize: PROFILE_UPLOAD_FILE_SIZE_LIMIT_BYTES
      }
    });

    if (!file) {
      throw new BadRequestException("Upload a receipt image first");
    }

    return this.aiDemoService.createImageDraftDemo(targetUserId, file);
  }

  @UseGuards(AdminSessionGuard)
  @AdminRateLimit({ max: 20, windowMs: 5 * 60_000, scope: "admin-sql" })
  @Post("sql/execute")
  executeSql(
    @Body() dto: AdminSqlExecuteDto,
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest
  ) {
    return this.sqlService.execute(dto, admin.email, getRequestMeta(request));
  }

  @UseGuards(AdminSessionGuard)
  @Get("audit")
  audit(@Query() query: AdminAuditQueryDto) {
    return this.readService.auditList(query);
  }

  @UseGuards(AdminSessionGuard)
  @Get("goods/uoms")
  goodsUoms() {
    return this.readService.goodsUomList();
  }

  @UseGuards(AdminSessionGuard)
  @Post("goods/uoms")
  createGoodsUom(
    @Body() dto: AdminGoodsUomUpsertDto,
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest
  ) {
    return this.mutationService.createGoodsUom(dto, admin.email, getRequestMeta(request));
  }

  @UseGuards(AdminSessionGuard)
  @Post("goods/uoms/:id/update")
  updateGoodsUom(
    @Param("id") id: string,
    @Body() dto: AdminGoodsUomUpsertDto,
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest
  ) {
    return this.mutationService.updateGoodsUom(id, dto, admin.email, getRequestMeta(request));
  }

  @UseGuards(AdminSessionGuard)
  @Post("goods/uoms/:id/status")
  updateGoodsUomStatus(
    @Param("id") id: string,
    @Body() dto: AdminGoodsUomStatusDto,
    @CurrentAdmin() admin: { email: string },
    @Req() request: FastifyRequest
  ) {
    return this.mutationService.updateGoodsUomStatus(id, dto, admin.email, getRequestMeta(request));
  }
}
