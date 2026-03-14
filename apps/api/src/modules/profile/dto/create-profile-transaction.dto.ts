import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength, Min } from "class-validator";

import { IsPrismaEntityId } from "../../common/prisma-id.validator";
import { SUPPORTED_CURRENCIES } from "../../common/currency";

const transactionKinds = ["EXPENSE", "INCOME"] as const;

export class CreateProfileTransactionDto {
  @Type(() => Number)
  @Min(0.01)
  amount!: number;

  @IsIn(transactionKinds)
  kind!: "EXPENSE" | "INCOME";

  @IsOptional()
  @IsPrismaEntityId()
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
