import { IsIn, IsOptional, IsString } from "class-validator";

import { AdminListQueryDto } from "./admin-list-query.dto";

export class AdminTransactionsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsIn(["EXPENSE", "INCOME"])
  kind?: "EXPENSE" | "INCOME";

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  coupleId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
