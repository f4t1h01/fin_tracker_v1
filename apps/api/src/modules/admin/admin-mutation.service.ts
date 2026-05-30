import { BadRequestException, Injectable } from "@nestjs/common";

import { convertToUzs, getLatestCurrencyRates, normalizeCurrency } from "../common/currency";
import { EmailDeliveryService } from "../common/email-delivery.service";
import { SecretBoxService } from "../common/secret-box.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdminAuditService, type AdminRequestMeta } from "./admin-audit.service";
import { AdminAuthService } from "./admin-auth.service";
import { AdminAdminPasswordResetDto } from "./dto/admin-admin-password-reset.dto";
import { AdminAuthEmailConfigDto } from "./dto/admin-auth-email-config.dto";
import { AdminAuthGoogleConfigDto } from "./dto/admin-auth-google-config.dto";
import { AdminAuthTestEmailDto } from "./dto/admin-auth-test-email.dto";
import { AdminAiPricingRetireDto } from "./dto/admin-ai-pricing-retire.dto";
import { AdminAiPricingUpsertDto } from "./dto/admin-ai-pricing-upsert.dto";
import { AdminAdminStatusDto } from "./dto/admin-admin-status.dto";
import { AdminCategoryCorrectionDto } from "./dto/admin-category-correction.dto";
import { AdminGoodsUomStatusDto } from "./dto/admin-goods-uom-status.dto";
import { AdminGoodsUomUpsertDto } from "./dto/admin-goods-uom-upsert.dto";
import { AdminInvalidateInviteDto } from "./dto/admin-invalidate-invite.dto";
import { AdminTransactionCorrectionDto } from "./dto/admin-transaction-correction.dto";
import { AdminUserPasswordResetDto } from "./dto/admin-user-password-reset.dto";

function decimalToNumber(value: { toNumber: () => number } | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

@Injectable()
export class AdminMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly authService: AdminAuthService,
    private readonly emailDelivery: EmailDeliveryService,
    private readonly secretBox: SecretBoxService
  ) {}

  private get db(): any {
    return this.prisma.client as any;
  }

  private toBigInt(value: number | null | undefined) {
    if (!Number.isFinite(value)) {
      return null;
    }

    return BigInt(Math.trunc(value as number));
  }

  async updateAuthEmailConfig(dto: AdminAuthEmailConfigDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    const existing = await this.db.authEmailProviderConfig.findUnique({
      where: { id: "default" }
    });

    const smtpPasswordEncrypted =
      dto.smtpPassword?.trim()
        ? this.secretBox.encrypt(dto.smtpPassword.trim())
        : existing?.smtpPasswordEncrypted ?? null;

    if (dto.isEnabled && (!dto.fromEmail.trim() || !dto.smtpHost.trim() || !dto.smtpPort)) {
      throw new BadRequestException("SMTP host, port, and sender email are required when email codes are enabled");
    }

    const updated = await this.db.authEmailProviderConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        provider: "SMTP",
        isEnabled: dto.isEnabled,
        fromEmail: dto.fromEmail.trim().toLowerCase(),
        fromName: dto.fromName?.trim() || null,
        smtpHost: dto.smtpHost.trim(),
        smtpPort: dto.smtpPort,
        smtpSecure: dto.smtpSecure,
        smtpUser: dto.smtpUser?.trim() || null,
        smtpPasswordEncrypted
      },
      update: {
        isEnabled: dto.isEnabled,
        fromEmail: dto.fromEmail.trim().toLowerCase(),
        fromName: dto.fromName?.trim() || null,
        smtpHost: dto.smtpHost.trim(),
        smtpPort: dto.smtpPort,
        smtpSecure: dto.smtpSecure,
        smtpUser: dto.smtpUser?.trim() || null,
        smtpPasswordEncrypted
      }
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "AUTH_EMAIL_CONFIG_UPDATE",
      targetType: "AUTH_EMAIL_PROVIDER",
      targetId: "default",
      reason: dto.reason,
      requestMeta,
      beforeState: existing
        ? {
            isEnabled: existing.isEnabled,
            fromEmail: existing.fromEmail,
            smtpHost: existing.smtpHost,
            smtpPort: existing.smtpPort,
            smtpSecure: existing.smtpSecure,
            smtpUser: existing.smtpUser,
            hasSmtpPassword: Boolean(existing.smtpPasswordEncrypted)
          }
        : null,
      afterState: {
        isEnabled: updated.isEnabled,
        fromEmail: updated.fromEmail,
        smtpHost: updated.smtpHost,
        smtpPort: updated.smtpPort,
        smtpSecure: updated.smtpSecure,
        smtpUser: updated.smtpUser,
        hasSmtpPassword: Boolean(updated.smtpPasswordEncrypted)
      },
      outcome: "SUCCESS"
    });

    return { ok: true };
  }

  async sendAuthTestEmail(dto: AdminAuthTestEmailDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    await this.emailDelivery.send({
      to: dto.toEmail.trim().toLowerCase(),
      subject: "CupFin test email",
      text: "CupFin email provider settings are working.",
      html: "<p>CupFin email provider settings are working.</p>"
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "AUTH_EMAIL_TEST",
      targetType: "AUTH_EMAIL_PROVIDER",
      targetId: "default",
      reason: `Sent test email to ${dto.toEmail.trim().toLowerCase()}`,
      requestMeta,
      outcome: "SUCCESS"
    });

    return { ok: true };
  }

  async updateAuthGoogleConfig(dto: AdminAuthGoogleConfigDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    if (dto.isEnabled && !dto.clientId?.trim()) {
      throw new BadRequestException("Google client ID is required when Google login is enabled");
    }

    const existing = await this.db.authGoogleConfig.findUnique({
      where: { id: "default" }
    });

    const updated = await this.db.authGoogleConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        isEnabled: dto.isEnabled,
        clientId: dto.clientId?.trim() || null,
        hostedDomain: dto.hostedDomain?.trim().toLowerCase() || null,
        autoCreateUsers: dto.autoCreateUsers,
        linkByVerifiedEmail: dto.linkByVerifiedEmail
      },
      update: {
        isEnabled: dto.isEnabled,
        clientId: dto.clientId?.trim() || null,
        hostedDomain: dto.hostedDomain?.trim().toLowerCase() || null,
        autoCreateUsers: dto.autoCreateUsers,
        linkByVerifiedEmail: dto.linkByVerifiedEmail
      }
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "AUTH_GOOGLE_CONFIG_UPDATE",
      targetType: "AUTH_GOOGLE",
      targetId: "default",
      reason: dto.reason,
      requestMeta,
      beforeState: existing
        ? {
            isEnabled: existing.isEnabled,
            hasClientId: Boolean(existing.clientId),
            hostedDomain: existing.hostedDomain,
            autoCreateUsers: existing.autoCreateUsers,
            linkByVerifiedEmail: existing.linkByVerifiedEmail
          }
        : null,
      afterState: {
        isEnabled: updated.isEnabled,
        hasClientId: Boolean(updated.clientId),
        hostedDomain: updated.hostedDomain,
        autoCreateUsers: updated.autoCreateUsers,
        linkByVerifiedEmail: updated.linkByVerifiedEmail
      },
      outcome: "SUCCESS"
    });

    return { ok: true };
  }

  async setAiModelPricing(dto: AdminAiPricingUpsertDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    const model = dto.model.trim();
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();

    if (Number.isNaN(effectiveFrom.valueOf())) {
      throw new BadRequestException("Effective from timestamp is invalid");
    }

    if (
      dto.textInputMicrosPer1m === undefined &&
      dto.audioInputMicrosPer1m === undefined &&
      dto.textOutputMicrosPer1m === undefined &&
      dto.audioOutputMicrosPer1m === undefined
    ) {
      throw new BadRequestException("Provide at least one pricing field");
    }

    const activeExisting = await this.db.aiModelPricing.findFirst({
      where: {
        provider: "OPENAI",
        model,
        retiredAt: null
      },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }]
    });

    const created = await this.db.$transaction(async (tx: any) => {
      if (activeExisting) {
        await tx.aiModelPricing.update({
          where: { id: activeExisting.id },
          data: {
            retiredAt: effectiveFrom
          }
        });
      }

      return tx.aiModelPricing.create({
        data: {
          provider: "OPENAI",
          model,
          textInputMicrosPer1m: this.toBigInt(dto.textInputMicrosPer1m),
          audioInputMicrosPer1m: this.toBigInt(dto.audioInputMicrosPer1m),
          textOutputMicrosPer1m: this.toBigInt(dto.textOutputMicrosPer1m),
          audioOutputMicrosPer1m: this.toBigInt(dto.audioOutputMicrosPer1m),
          notes: dto.notes?.trim() || null,
          effectiveFrom,
          createdByAdminEmail: currentAdminEmail
        }
      });
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "AI_MODEL_PRICING_SET",
      targetType: "AI_MODEL_PRICING",
      targetId: created.id,
      reason: dto.notes,
      requestMeta,
      beforeState: activeExisting
        ? {
            previousPricingId: activeExisting.id,
            retiredAt: effectiveFrom.toISOString()
          }
        : null,
      afterState: {
        model: created.model,
        effectiveFrom: created.effectiveFrom.toISOString(),
        textInputMicrosPer1m: created.textInputMicrosPer1m?.toString() ?? null,
        audioInputMicrosPer1m: created.audioInputMicrosPer1m?.toString() ?? null,
        textOutputMicrosPer1m: created.textOutputMicrosPer1m?.toString() ?? null,
        audioOutputMicrosPer1m: created.audioOutputMicrosPer1m?.toString() ?? null
      },
      outcome: "SUCCESS"
    });

    return {
      id: created.id,
      model: created.model,
      effectiveFrom: created.effectiveFrom.toISOString()
    };
  }

  async retireAiModelPricing(id: string, dto: AdminAiPricingRetireDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    const pricing = await this.db.aiModelPricing.findUnique({
      where: { id }
    });

    if (!pricing) {
      throw new BadRequestException("Pricing record not found");
    }

    if (pricing.retiredAt) {
      throw new BadRequestException("Pricing record is already retired");
    }

    const retiredAt = new Date();
    const updated = await this.db.aiModelPricing.update({
      where: { id },
      data: {
        retiredAt
      }
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "AI_MODEL_PRICING_RETIRE",
      targetType: "AI_MODEL_PRICING",
      targetId: id,
      reason: dto.reason,
      requestMeta,
      beforeState: {
        model: pricing.model,
        retiredAt: null
      },
      afterState: {
        model: updated.model,
        retiredAt: updated.retiredAt?.toISOString() ?? null
      },
      outcome: "SUCCESS"
    });

    return {
      id: updated.id,
      retiredAt: updated.retiredAt?.toISOString() ?? null
    };
  }

  async updateAdminStatus(email: string, dto: AdminAdminStatusDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === currentAdminEmail && !dto.isActive) {
      throw new BadRequestException("You cannot deactivate your own admin account");
    }

    const admin = await this.db.zeroAdmin.findUnique({
      where: { email: normalizedEmail }
    });

    if (!admin) {
      throw new BadRequestException("Admin account not found");
    }

    const updated = await this.db.zeroAdmin.update({
      where: { email: normalizedEmail },
      data: {
        isActive: dto.isActive
      }
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: dto.isActive ? "ADMIN_REACTIVATE" : "ADMIN_DEACTIVATE",
      targetType: "ADMIN",
      targetId: normalizedEmail,
      reason: dto.reason,
      requestMeta,
      beforeState: {
        isActive: admin.isActive
      },
      afterState: {
        isActive: updated.isActive
      },
      outcome: "SUCCESS"
    });

    return {
      email: updated.email,
      isActive: updated.isActive
    };
  }

  async resetAdminPassword(email: string, dto: AdminAdminPasswordResetDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    const normalizedEmail = email.trim().toLowerCase();
    const admin = await this.db.zeroAdmin.findUnique({
      where: { email: normalizedEmail }
    });

    if (!admin) {
      throw new BadRequestException("Admin account not found");
    }

    const passwordHash = await this.authService.hashPassword(dto.newPassword);
    await this.db.zeroAdmin.update({
      where: { email: normalizedEmail },
      data: {
        passwordHash
      }
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "ADMIN_PASSWORD_RESET",
      targetType: "ADMIN",
      targetId: normalizedEmail,
      reason: dto.reason,
      requestMeta,
      afterState: {
        passwordReset: true
      },
      outcome: "SUCCESS"
    });

    return { ok: true };
  }

  async resetUserPassword(id: string, dto: AdminUserPasswordResetDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        passwordSetAt: true
      }
    });

    if (!user) {
      throw new BadRequestException("User account not found");
    }

    if (!user.email) {
      throw new BadRequestException("User must have an email before a website password can be reset");
    }

    const passwordHash = await this.authService.hashPassword(dto.newPassword);
    const passwordSetAt = new Date();
    const updated = await this.db.user.update({
      where: { id },
      data: {
        passwordHash,
        passwordSetAt
      },
      select: {
        id: true,
        email: true,
        passwordSetAt: true
      }
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "USER_PASSWORD_RESET",
      targetType: "USER",
      targetId: id,
      reason: dto.reason,
      requestMeta,
      beforeState: {
        email: user.email,
        hadPassword: Boolean(user.passwordHash),
        passwordSetAt: user.passwordSetAt?.toISOString() ?? null
      },
      afterState: {
        email: updated.email,
        passwordReset: true,
        passwordSetAt: updated.passwordSetAt?.toISOString() ?? null
      },
      outcome: "SUCCESS"
    });

    return {
      ok: true,
      passwordSetAt: updated.passwordSetAt?.toISOString() ?? passwordSetAt.toISOString()
    };
  }

  async invalidateInvite(coupleId: string, inviteId: string, dto: AdminInvalidateInviteDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    const invite = await this.db.invite.findFirst({
      where: {
        id: inviteId,
        coupleId
      }
    });

    if (!invite) {
      throw new BadRequestException("Invite not found");
    }

    const updated = await this.db.invite.update({
      where: { id: inviteId },
      data: {
        expiresAt: new Date()
      }
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "COUPLE_INVITE_INVALIDATE",
      targetType: "INVITE",
      targetId: inviteId,
      reason: dto.reason,
      requestMeta,
      beforeState: {
        expiresAt: invite.expiresAt.toISOString(),
        consumedAt: invite.consumedAt?.toISOString() ?? null
      },
      afterState: {
        expiresAt: updated.expiresAt.toISOString(),
        consumedAt: updated.consumedAt?.toISOString() ?? null
      },
      outcome: "SUCCESS"
    });

    return { ok: true };
  }

  async correctTransaction(id: string, dto: AdminTransactionCorrectionDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    const transaction = await this.db.transaction.findUnique({
      where: { id },
      include: {
        category: true
      }
    });

    if (!transaction) {
      throw new BadRequestException("Transaction not found");
    }

    const nextKind = dto.kind ?? transaction.kind;
    const categoryId = dto.categoryId ?? transaction.categoryId;

    if (dto.kind && !dto.categoryId && transaction.category.kind !== nextKind) {
      throw new BadRequestException("Changing transaction kind requires a matching category selection");
    }

    const category = await this.db.category.findUnique({
      where: { id: categoryId }
    });

    if (!category || category.coupleId !== transaction.coupleId || category.kind !== nextKind) {
      throw new BadRequestException("Selected category is invalid for this transaction");
    }

    const nextCurrency = dto.currency ? normalizeCurrency(dto.currency) : transaction.currency;
    const rates = await getLatestCurrencyRates();
    const exchangeRate = rates[nextCurrency as keyof typeof rates];
    const amountInUzs = convertToUzs(decimalToNumber(transaction.amount), exchangeRate);

    const updated = await this.db.transaction.update({
      where: { id },
      data: {
        kind: nextKind,
        categoryId,
        currency: nextCurrency,
        exchangeRate: exchangeRate.toFixed(6),
        amountInUzs: amountInUzs.toFixed(2),
        note: dto.note ?? undefined,
        happenedAt: dto.happenedAt ? new Date(dto.happenedAt) : undefined
      },
      include: {
        category: { select: { id: true, name: true, kind: true } }
      }
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "TRANSACTION_CORRECT",
      targetType: "TRANSACTION",
      targetId: id,
      reason: dto.reason,
      requestMeta,
      beforeState: {
        kind: transaction.kind,
        currency: transaction.currency,
        note: transaction.note,
        happenedAt: transaction.happenedAt.toISOString(),
        categoryId: transaction.categoryId
      },
      afterState: {
        kind: updated.kind,
        currency: updated.currency,
        note: updated.note,
        happenedAt: updated.happenedAt.toISOString(),
        categoryId: updated.categoryId
      },
      outcome: "SUCCESS"
    });

    return {
      ok: true,
      transaction: {
        id: updated.id,
        kind: updated.kind,
        currency: updated.currency,
        note: updated.note,
        happenedAt: updated.happenedAt.toISOString(),
        category: updated.category
      }
    };
  }

  async correctCategory(id: string, dto: AdminCategoryCorrectionDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    const category = await this.db.category.findUnique({
      where: { id },
      include: {
        childCategories: {
          select: { id: true }
        }
      }
    });

    if (!category) {
      throw new BadRequestException("Category not found");
    }

    const nextScope = dto.scope ?? category.scope;
    const parentCategoryId = dto.parentCategoryId === "" ? null : dto.parentCategoryId ?? category.parentCategoryId;
    const nextOwnerUserId =
      nextScope === "SHARED" ? null : dto.ownerUserId === "" ? null : dto.ownerUserId ?? category.ownerUserId;

    if (nextScope === "PERSONAL" && !nextOwnerUserId) {
      throw new BadRequestException("Personal categories require an owner user");
    }

    if (parentCategoryId && category.childCategories.length > 0) {
      throw new BadRequestException("A category with children cannot be moved under a parent");
    }

    if (parentCategoryId) {
      const parent = await this.db.category.findUnique({
        where: { id: parentCategoryId }
      });

      if (!parent) {
        throw new BadRequestException("Parent category not found");
      }

      if (parent.id === category.id || parent.parentCategoryId) {
        throw new BadRequestException("Parent category must be a different top-level category");
      }

      if (parent.coupleId !== category.coupleId || parent.kind !== category.kind) {
        throw new BadRequestException("Parent category must belong to the same workspace and kind");
      }

      if (parent.scope !== nextScope) {
        throw new BadRequestException("Parent category scope must match");
      }

      if (nextScope === "PERSONAL" && parent.ownerUserId !== nextOwnerUserId) {
        throw new BadRequestException("Personal parent category must share the same owner");
      }
    }

    const updated = await this.db.category.update({
      where: { id },
      data: {
        isVisible: dto.isVisible ?? category.isVisible,
        scope: nextScope,
        ownerUserId: nextOwnerUserId,
        parentCategoryId
      }
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "CATEGORY_CORRECT",
      targetType: "CATEGORY",
      targetId: id,
      reason: dto.reason,
      requestMeta,
      beforeState: {
        scope: category.scope,
        ownerUserId: category.ownerUserId,
        parentCategoryId: category.parentCategoryId,
        isVisible: category.isVisible
      },
      afterState: {
        scope: updated.scope,
        ownerUserId: updated.ownerUserId,
        parentCategoryId: updated.parentCategoryId,
        isVisible: updated.isVisible
      },
      outcome: "SUCCESS"
    });

    return {
      ok: true,
      category: {
        id: updated.id,
        scope: updated.scope,
        ownerUserId: updated.ownerUserId,
        parentCategoryId: updated.parentCategoryId,
        isVisible: updated.isVisible
      }
    };
  }

  async createGoodsUom(dto: AdminGoodsUomUpsertDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    const code = dto.code.trim();
    const label = dto.label.trim();

    if (!code || !label) {
      throw new BadRequestException("Code and label are required");
    }

    const created = await this.db.goodsUom.create({
      data: {
        code,
        label,
        groupKey: dto.groupKey,
        decimals: dto.decimals,
        sortOrder: dto.sortOrder ?? 0
      }
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "GOODS_UOM_CREATE",
      targetType: "GOODS_UOM",
      targetId: created.id,
      reason: dto.reason,
      requestMeta,
      afterState: {
        code: created.code,
        label: created.label,
        groupKey: created.groupKey,
        decimals: created.decimals,
        isActive: created.isActive
      },
      outcome: "SUCCESS"
    });

    return { ok: true, id: created.id };
  }

  async updateGoodsUom(id: string, dto: AdminGoodsUomUpsertDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    const existing = await this.db.goodsUom.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new BadRequestException("Goods UOM not found");
    }

    const updated = await this.db.goodsUom.update({
      where: { id },
      data: {
        code: dto.code.trim(),
        label: dto.label.trim(),
        groupKey: dto.groupKey,
        decimals: dto.decimals,
        sortOrder: dto.sortOrder ?? existing.sortOrder
      }
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "GOODS_UOM_UPDATE",
      targetType: "GOODS_UOM",
      targetId: id,
      reason: dto.reason,
      requestMeta,
      beforeState: {
        code: existing.code,
        label: existing.label,
        groupKey: existing.groupKey,
        decimals: existing.decimals,
        sortOrder: existing.sortOrder
      },
      afterState: {
        code: updated.code,
        label: updated.label,
        groupKey: updated.groupKey,
        decimals: updated.decimals,
        sortOrder: updated.sortOrder
      },
      outcome: "SUCCESS"
    });

    return { ok: true };
  }

  async updateGoodsUomStatus(id: string, dto: AdminGoodsUomStatusDto, currentAdminEmail: string, requestMeta: AdminRequestMeta) {
    const existing = await this.db.goodsUom.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new BadRequestException("Goods UOM not found");
    }

    const updated = await this.db.goodsUom.update({
      where: { id },
      data: {
        isActive: dto.isActive
      }
    });

    await this.audit.log({
      adminEmail: currentAdminEmail,
      actionType: "GOODS_UOM_STATUS",
      targetType: "GOODS_UOM",
      targetId: id,
      reason: dto.reason,
      requestMeta,
      beforeState: {
        isActive: existing.isActive
      },
      afterState: {
        isActive: updated.isActive
      },
      outcome: "SUCCESS"
    });

    return { ok: true, isActive: updated.isActive };
  }
}
