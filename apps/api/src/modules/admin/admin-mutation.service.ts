import { BadRequestException, Injectable } from "@nestjs/common";

import { convertToUzs, getLatestCurrencyRates, normalizeCurrency } from "../common/currency";
import { PrismaService } from "../prisma/prisma.service";
import { AdminAuditService, type AdminRequestMeta } from "./admin-audit.service";
import { AdminAuthService } from "./admin-auth.service";
import { AdminAdminPasswordResetDto } from "./dto/admin-admin-password-reset.dto";
import { AdminAdminStatusDto } from "./dto/admin-admin-status.dto";
import { AdminCategoryCorrectionDto } from "./dto/admin-category-correction.dto";
import { AdminInvalidateInviteDto } from "./dto/admin-invalidate-invite.dto";
import { AdminTransactionCorrectionDto } from "./dto/admin-transaction-correction.dto";

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
    private readonly authService: AdminAuthService
  ) {}

  private get db(): any {
    return this.prisma.client as any;
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
}
