import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

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
  @IsUUID()
  parentCategoryId?: string;
}

export class UpdateCategoryPreferencesDto {
  @IsOptional()
  @IsBoolean()
  showSharedCategories?: boolean;

  @IsOptional()
  @IsUUID()
  defaultIncomeCategoryId?: string | null;

  @IsOptional()
  @IsUUID()
  defaultExpenseCategoryId?: string | null;
}
