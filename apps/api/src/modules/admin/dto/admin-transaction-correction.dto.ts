import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AdminTransactionCorrectionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsIn(["EXPENSE", "INCOME"])
  kind?: "EXPENSE" | "INCOME";

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsDateString()
  happenedAt?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
