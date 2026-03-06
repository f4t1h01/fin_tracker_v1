import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength, Min } from "class-validator";

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
  @IsString()
  @MaxLength(60)
  categoryName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  note?: string;
}
