import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

import { IsPrismaEntityId } from "../../common/prisma-id.validator";

const transactionKinds = ["EXPENSE", "INCOME"] as const;
const categoryScopes = ["PERSONAL", "SHARED"] as const;

export class CreateCategoryDto {
  @IsIn(transactionKinds)
  kind!: "EXPENSE" | "INCOME";

  @IsIn(categoryScopes)
  scope!: "PERSONAL" | "SHARED";

  @IsString()
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsPrismaEntityId()
  parentCategoryId?: string;
}

export class UpdateCategoryPreferencesDto {
  @IsOptional()
  @IsBoolean()
  showSharedCategories?: boolean;

  @IsOptional()
  @IsPrismaEntityId()
  defaultIncomeCategoryId?: string | null;

  @IsOptional()
  @IsPrismaEntityId()
  defaultExpenseCategoryId?: string | null;
}

export class UpdateCategoryVisibilityDto {
  @IsBoolean()
  isVisible!: boolean;
}
