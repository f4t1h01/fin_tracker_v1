import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

import { SUPPORTED_CURRENCIES } from "../../common/currency";

const transactionKinds = ["EXPENSE", "INCOME"] as const;

export class UpdateProfileTransactionDto {
  @IsOptional()
  @Type(() => Number)
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsIn(transactionKinds)
  kind?: "EXPENSE" | "INCOME";

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  categoryName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  note?: string;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: (typeof SUPPORTED_CURRENCIES)[number];
}
