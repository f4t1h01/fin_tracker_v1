import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength, Min } from "class-validator";

const transactionKinds = ["EXPENSE", "INCOME"] as const;

export class CreateProfileTransactionDto {
  @Type(() => Number)
  @Min(0.01)
  amount!: number;

  @IsIn(transactionKinds)
  kind!: "EXPENSE" | "INCOME";

  @IsString()
  @MaxLength(60)
  categoryName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  note?: string;
}
