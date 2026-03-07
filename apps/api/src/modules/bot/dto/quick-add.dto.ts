import { Type } from "class-transformer";
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

import { SUPPORTED_CURRENCIES } from "../../common/currency";

const transactionKinds = ["EXPENSE", "INCOME"] as const;

export class QuickAddDto {
  @Type(() => Number)
  @IsNumber()
  telegramId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsIn(transactionKinds)
  kind!: "EXPENSE" | "INCOME";

  @IsString()
  @MaxLength(60)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  note?: string;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: (typeof SUPPORTED_CURRENCIES)[number];
}
