import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AdminCategoryCorrectionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsIn(["PERSONAL", "SHARED"])
  scope?: "PERSONAL" | "SHARED";

  @IsOptional()
  @IsString()
  ownerUserId?: string | null;

  @IsOptional()
  @IsString()
  parentCategoryId?: string | null;
}
